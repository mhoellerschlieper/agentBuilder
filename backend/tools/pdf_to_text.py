#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pdf_rag_text_orderer.py

Purpose:
- General purpose tool for mostly-digital PDFs to extract text in a stable layout-aware order
  suitable for later RAG processing.
- Uses pdfplumber for word-level boxes.
- Builds:
  1) words (bbox)
  2) visual lines (y clustering)
  3) line cells (x split by gaps)
  4) blocks (DBSCAN clustering in XY on cells) + post-merge by adjacency/overlap
  5) ordered output (blocks in reading order)

Output modes:
- debug = False: outputs JSON as: [ { "page_no": int, "text": "..." }, ... ]
- debug = True : outputs JSON with per-page params, blocks, and cells for troubleshooting.

History:
- 2026-02-17 author_unknown: Initial version using pdfplumber words, y-lines, x-cells,
  DBSCAN clustering per page, and post-merge.
- 2026-02-17 author_unknown: Added debug switch controlling JSON output shape:
  debug False => [{page_no, text}].

Dependencies:
- pdfplumber
- scikit-learn

Install:
- pip install pdfplumber scikit-learn
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import json
import re
import sys

try:
    import pdfplumber
except Exception as e:
    raise SystemExit("Missing dependency pdfplumber. Install with: pip install pdfplumber") from e

try:
    from sklearn.cluster import DBSCAN
except Exception as e:
    raise SystemExit("Missing dependency scikit-learn. Install with: pip install scikit-learn") from e


# -----------------------------
# Configuration
# -----------------------------

# Debug output
b_debug = False

# Word -> line clustering (y)
d_line_y_tol = 3.0  # pdf points; increase if lines split too much

# Line -> cells splitting (x)
d_cell_gap_min = 18.0  # split a visual line into cells when gap between words exceeds this

# DBSCAN for cells (normalized coords with anisotropic scaling)
# eps is adaptive based on typical neighbor distances; these are clamps and multipliers
d_eps_mult = 1.35
d_eps_min = 0.020
d_eps_max = 0.120
i_dbscan_min_samples = 2

# Anisotropic scaling:
# Smaller x_scale => x distances become larger in feature space (less cross-column merges)
# Larger y_scale => y distances become smaller in feature space (more vertical merges)
d_x_scale = 0.60
d_y_scale = 1.80

# Post merge (graph merge) to merge nearby clusters (fix for banding)
d_merge_x_overlap_min_rel = 0.15
d_merge_y_gap_max_rel = 0.080
d_merge_center_dist_max_rel = 0.10

# Header/footer repeat removal
b_remove_repeated_header_footer = True
i_repeat_min_pages = 3
d_header_footer_zone_rel = 0.10  # top/bottom 10 percent

# Text normalization
r_ws = re.compile(r"\s+")


# -----------------------------
# Data types
# -----------------------------

@dataclass(frozen=True)
class word_item:
    d_x0: float
    d_top: float
    d_x1: float
    d_bottom: float
    s_text: str

    @property
    def d_cx(self) -> float:
        return (self.d_x0 + self.d_x1) / 2.0

    @property
    def d_cy(self) -> float:
        return (self.d_top + self.d_bottom) / 2.0

    @property
    def d_h(self) -> float:
        return max(0.0, self.d_bottom - self.d_top)


@dataclass
class line_item:
    d_y: float
    words: List[word_item]

    @property
    def d_x0(self) -> float:
        return min(w.d_x0 for w in self.words) if self.words else 0.0

    @property
    def d_x1(self) -> float:
        return max(w.d_x1 for w in self.words) if self.words else 0.0

    @property
    def d_top(self) -> float:
        return min(w.d_top for w in self.words) if self.words else self.d_y

    @property
    def d_bottom(self) -> float:
        return max(w.d_bottom for w in self.words) if self.words else self.d_y

    @property
    def d_h(self) -> float:
        return max(0.0, self.d_bottom - self.d_top)

    @property
    def d_cx(self) -> float:
        return (self.d_x0 + self.d_x1) / 2.0

    @property
    def d_cy(self) -> float:
        return self.d_y

    @property
    def s_text(self) -> str:
        parts = [w.s_text for w in sorted(self.words, key=lambda x: x.d_x0) if w.s_text]
        return normalize_ws(" ".join(parts))


@dataclass
class cell_item:
    i_line_id: int
    d_x0: float
    d_top: float
    d_x1: float
    d_bottom: float
    s_text: str

    @property
    def d_cx(self) -> float:
        return (self.d_x0 + self.d_x1) / 2.0

    @property
    def d_cy(self) -> float:
        return (self.d_top + self.d_bottom) / 2.0


@dataclass
class block_item:
    i_block_id: int
    d_x0: float
    d_y0: float
    d_x1: float
    d_y1: float
    cells: List[cell_item]

    @property
    def s_text(self) -> str:
        # Reading order inside a block:
        # - sort by y then x
        cells_sorted = sorted(self.cells, key=lambda c: (c.d_top, c.d_x0))
        lines_out: List[str] = []

        last_y: Optional[float] = None
        cur_line: List[str] = []
        d_tol = 4.0

        for c in cells_sorted:
            if not c.s_text:
                continue

            if last_y is None:
                last_y = c.d_top
                cur_line = [c.s_text]
                continue

            if abs(c.d_top - last_y) <= d_tol:
                cur_line.append(c.s_text)
            else:
                lines_out.append(normalize_ws(" ".join(cur_line)))
                last_y = c.d_top
                cur_line = [c.s_text]

        if cur_line:
            lines_out.append(normalize_ws(" ".join(cur_line)))

        return "\n".join([l for l in lines_out if l]).strip()


# -----------------------------
# Utils
# -----------------------------

def normalize_ws(s_text: str) -> str:
    return r_ws.sub(" ", (s_text or "").strip())


def safe_float(v: Any, d_default: float = 0.0) -> float:
    try:
        return float(v)
    except Exception:
        return d_default


def clamp_float(d_v: float, d_min_v: float, d_max_v: float) -> float:
    if d_v < d_min_v:
        return d_min_v
    if d_v > d_max_v:
        return d_max_v
    return d_v


def median(d_vals: List[float]) -> float:
    if not d_vals:
        return 0.0
    s = sorted(d_vals)
    i_n = len(s)
    i_m = i_n // 2
    if i_n % 2 == 1:
        return float(s[i_m])
    return float((s[i_m - 1] + s[i_m]) / 2.0)


def bbox_x_overlap_rel(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> float:
    ax0, _, ax1, _ = a
    bx0, _, bx1, _ = b
    d_left = max(ax0, bx0)
    d_right = min(ax1, bx1)
    d_ov = d_right - d_left
    if d_ov <= 0.0:
        return 0.0
    d_aw = max(1.0, ax1 - ax0)
    d_bw = max(1.0, bx1 - bx0)
    return float(d_ov / min(d_aw, d_bw))


def bbox_vertical_gap(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> float:
    _, ay0, _, ay1 = a
    _, by0, _, by1 = b
    if ay1 < by0:
        return by0 - ay1
    if by1 < ay0:
        return ay0 - by1
    return 0.0


def center_dist_rel(
    a: Tuple[float, float, float, float],
    b: Tuple[float, float, float, float],
    d_page_w: float,
    d_page_h: float,
) -> float:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    acx = (ax0 + ax1) / 2.0
    acy = (ay0 + ay1) / 2.0
    bcx = (bx0 + bx1) / 2.0
    bcy = (by0 + by1) / 2.0
    dx = (acx - bcx) / max(1.0, d_page_w)
    dy = (acy - bcy) / max(1.0, d_page_h)
    return float((dx * dx + dy * dy) ** 0.5)


# -----------------------------
# Extraction (pdfplumber)
# -----------------------------

def extract_words_plumber(page: Any) -> List[word_item]:
    # pdfplumber uses top/bottom relative to page top.
    words_raw = page.extract_words(
        x_tolerance=1,
        y_tolerance=1,
        keep_blank_chars=False,
        use_text_flow=False,
    )
    out: List[word_item] = []
    for w in words_raw or []:
        s_text = normalize_ws(w.get("text", ""))
        if not s_text:
            continue
        d_x0 = safe_float(w.get("x0", 0.0))
        d_x1 = safe_float(w.get("x1", 0.0))
        d_top = safe_float(w.get("top", 0.0))
        d_bottom = safe_float(w.get("bottom", 0.0))
        out.append(word_item(d_x0=d_x0, d_top=d_top, d_x1=d_x1, d_bottom=d_bottom, s_text=s_text))
    return out


# -----------------------------
# Words -> lines
# -----------------------------

def words_to_lines(words: List[word_item]) -> List[line_item]:
    if not words:
        return []
    words_sorted = sorted(words, key=lambda w: (w.d_top, w.d_x0))
    buckets: List[float] = []
    groups: List[List[word_item]] = []

    for w in words_sorted:
        d_y = w.d_top
        b_added = False
        for i_idx, d_by in enumerate(buckets):
            if abs(d_y - d_by) <= d_line_y_tol:
                groups[i_idx].append(w)
                b_added = True
                break
        if not b_added:
            buckets.append(d_y)
            groups.append([w])

    out_lines: List[line_item] = []
    for d_y, grp in sorted(zip(buckets, groups), key=lambda t: t[0]):
        grp_sorted = sorted(grp, key=lambda x: x.d_x0)
        out_lines.append(line_item(d_y=float(d_y), words=grp_sorted))

    return out_lines


# -----------------------------
# Lines -> cells (x split)
# -----------------------------

def line_to_cells(ln: line_item, i_line_id: int) -> List[cell_item]:
    words = sorted(ln.words, key=lambda w: w.d_x0)
    if not words:
        return []

    cells_words: List[List[word_item]] = [[]]
    prev_x1: Optional[float] = None

    for w in words:
        if prev_x1 is not None:
            d_gap = w.d_x0 - prev_x1
            if d_gap >= d_cell_gap_min:
                cells_words.append([])
        cells_words[-1].append(w)
        prev_x1 = w.d_x1

    out: List[cell_item] = []
    for cw in cells_words:
        if not cw:
            continue
        d_x0 = min(x.d_x0 for x in cw)
        d_x1 = max(x.d_x1 for x in cw)
        d_top = min(x.d_top for x in cw)
        d_bottom = max(x.d_bottom for x in cw)
        s_text = normalize_ws(" ".join([x.s_text for x in cw if x.s_text]))
        if not s_text:
            continue
        out.append(
            cell_item(
                i_line_id=int(i_line_id),
                d_x0=float(d_x0),
                d_top=float(d_top),
                d_x1=float(d_x1),
                d_bottom=float(d_bottom),
                s_text=s_text,
            )
        )
    return out


def lines_to_cells(lines: List[line_item]) -> List[cell_item]:
    cells: List[cell_item] = []
    for i_idx, ln in enumerate(lines, start=1):
        cells.extend(line_to_cells(ln, i_idx))
    return cells


# -----------------------------
# Header/footer repeat filter (line based)
# -----------------------------

def build_repeat_filter(pages_lines: List[List[line_item]], pages_sizes: List[Tuple[float, float]]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for i_idx, lines in enumerate(pages_lines):
        d_w, d_h = pages_sizes[i_idx]
        _ = d_w
        d_zone = float(d_header_footer_zone_rel) * float(d_h)
        for ln in lines:
            if ln.d_y <= d_zone or ln.d_y >= (d_h - d_zone):
                s_key = normalize_ws(ln.s_text)
                if s_key:
                    counts[s_key] = counts.get(s_key, 0) + 1
    return counts


def filter_repeated_header_footer(lines: List[line_item], d_page_h: float, repeat_counts: Dict[str, int]) -> List[line_item]:
    if not b_remove_repeated_header_footer:
        return lines
    if not repeat_counts:
        return lines

    d_zone = float(d_header_footer_zone_rel) * float(d_page_h)
    out: List[line_item] = []

    for ln in lines:
        b_zone = (ln.d_y <= d_zone) or (ln.d_y >= (d_page_h - d_zone))
        if b_zone:
            s_key = normalize_ws(ln.s_text)
            if repeat_counts.get(s_key, 0) >= i_repeat_min_pages:
                continue
        out.append(ln)

    return out


# -----------------------------
# Adaptive eps estimation (on cells)
# -----------------------------

def estimate_eps_for_cells(cells: List[cell_item], d_page_w: float, d_page_h: float) -> float:
    if not cells or d_page_w <= 0.0 or d_page_h <= 0.0:
        return float(d_eps_min)

    cells_sorted = sorted(cells, key=lambda c: (c.d_top, c.d_x0))
    dy_norms: List[float] = []

    for i_idx in range(1, len(cells_sorted)):
        a = cells_sorted[i_idx - 1]
        b = cells_sorted[i_idx]
        if abs(a.d_cx - b.d_cx) > 0.40 * d_page_w:
            continue
        d_dy = abs(b.d_cy - a.d_cy)
        if d_dy <= 0.0:
            continue
        dy_norms.append(float(d_dy / d_page_h))

    d_base = median(dy_norms)
    if d_base <= 0.0:
        d_base = 0.030

    d_eps = d_base * float(d_eps_mult) * float(d_y_scale)
    return float(clamp_float(d_eps, float(d_eps_min), float(d_eps_max)))


# -----------------------------
# Cells -> blocks (DBSCAN + post-merge)
# -----------------------------

def cluster_cells_dbscan(cells: List[cell_item], d_page_w: float, d_page_h: float) -> List[block_item]:
    if not cells:
        return []

    d_eps = estimate_eps_for_cells(cells, d_page_w, d_page_h)

    pts: List[List[float]] = []
    for c in cells:
        d_x = (c.d_cx / d_page_w) / max(0.001, float(d_x_scale))
        d_y = (c.d_cy / d_page_h) / max(0.001, float(d_y_scale))
        pts.append([float(d_x), float(d_y)])

    model = DBSCAN(eps=float(d_eps), min_samples=int(i_dbscan_min_samples))
    labels = model.fit_predict(pts)

    clusters: Dict[int, List[cell_item]] = {}
    i_noise_seed = 1000000
    for c, i_label in zip(cells, labels):
        if int(i_label) == -1:
            i_label = i_noise_seed
            i_noise_seed += 1
        clusters.setdefault(int(i_label), []).append(c)

    blocks: List[block_item] = []
    for _, cc in clusters.items():
        d_x0 = min(x.d_x0 for x in cc)
        d_y0 = min(x.d_top for x in cc)
        d_x1 = max(x.d_x1 for x in cc)
        d_y1 = max(x.d_bottom for x in cc)
        blocks.append(block_item(i_block_id=0, d_x0=d_x0, d_y0=d_y0, d_x1=d_x1, d_y1=d_y1, cells=cc))

    blocks = merge_close_blocks(blocks, d_page_w, d_page_h)

    blocks.sort(key=lambda b: (b.d_y0, b.d_x0))
    for i_idx, b in enumerate(blocks, start=1):
        b.i_block_id = i_idx

    return blocks


def merge_close_blocks(blocks: List[block_item], d_page_w: float, d_page_h: float) -> List[block_item]:
    if not blocks:
        return []

    d_y_gap_max = float(d_merge_y_gap_max_rel) * float(d_page_h)
    bboxes = [(b.d_x0, b.d_y0, b.d_x1, b.d_y1) for b in blocks]
    n = len(blocks)
    adj: List[List[int]] = [[] for _ in range(n)]

    for i in range(n):
        for j in range(i + 1, n):
            a = bboxes[i]
            b = bboxes[j]
            d_ov = bbox_x_overlap_rel(a, b)
            d_gap = bbox_vertical_gap(a, b)
            d_ctr = center_dist_rel(a, b, d_page_w, d_page_h)

            b_merge = False
            if d_ov >= float(d_merge_x_overlap_min_rel):
                if d_gap <= 0.0:
                    b_merge = True
                elif d_gap <= d_y_gap_max:
                    b_merge = True

            if (not b_merge) and d_ctr <= float(d_merge_center_dist_max_rel):
                acx = (a[0] + a[2]) / 2.0
                bcx = (b[0] + b[2]) / 2.0
                if abs(acx - bcx) <= 0.45 * d_page_w:
                    b_merge = True

            if b_merge:
                adj[i].append(j)
                adj[j].append(i)

    visited = [False] * n
    merged: List[block_item] = []

    for i in range(n):
        if visited[i]:
            continue
        stack = [i]
        visited[i] = True
        comp: List[int] = []

        while stack:
            cur = stack.pop()
            comp.append(cur)
            for nb in adj[cur]:
                if not visited[nb]:
                    visited[nb] = True
                    stack.append(nb)

        comp_cells: List[cell_item] = []
        d_x0 = 1e18
        d_y0 = 1e18
        d_x1 = -1e18
        d_y1 = -1e18

        for idx in comp:
            comp_cells.extend(blocks[idx].cells)
            d_x0 = min(d_x0, blocks[idx].d_x0)
            d_y0 = min(d_y0, blocks[idx].d_y0)
            d_x1 = max(d_x1, blocks[idx].d_x1)
            d_y1 = max(d_y1, blocks[idx].d_y1)

        merged.append(block_item(i_block_id=0, d_x0=d_x0, d_y0=d_y0, d_x1=d_x1, d_y1=d_y1, cells=comp_cells))

    merged.sort(key=lambda b: (b.d_y0, b.d_x0))
    return merged


# -----------------------------
# Page processing
# -----------------------------

def page_to_ordered_text_and_blocks(page: Any, repeat_counts: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    d_w = safe_float(getattr(page, "width", 0.0), 0.0)
    d_h = safe_float(getattr(page, "height", 0.0), 0.0)

    words = extract_words_plumber(page)
    lines = words_to_lines(words)

    if repeat_counts is not None:
        lines = filter_repeated_header_footer(lines, d_h, repeat_counts)

    cells = lines_to_cells(lines)
    blocks = cluster_cells_dbscan(cells, d_w, d_h)

    ordered_text_parts: List[str] = []
    blocks_out: List[Dict[str, Any]] = []

    for b in blocks:
        s_t = b.s_text
        if s_t:
            ordered_text_parts.append(s_t)

        if b_debug:
            blk_obj: Dict[str, Any] = {
                "block_id": int(b.i_block_id),
                "bbox": {"x0": b.d_x0, "y0": b.d_y0, "x1": b.d_x1, "y1": b.d_y1},
                "text": s_t,
                "cells": [
                    {
                        "line_id": int(c.i_line_id),
                        "bbox": {"x0": c.d_x0, "y0": c.d_top, "x1": c.d_x1, "y1": c.d_bottom},
                        "text": c.s_text,
                    }
                    for c in sorted(b.cells, key=lambda x: (x.d_top, x.d_x0))
                ],
            }
            blocks_out.append(blk_obj)

    out: Dict[str, Any] = {
        "page_size": {"width": d_w, "height": d_h},
        "ordered_text": "\n\n".join(ordered_text_parts).strip(),
    }

    if b_debug:
        out["params"] = {
            "line_y_tol": float(d_line_y_tol),
            "cell_gap_min": float(d_cell_gap_min),
            "dbscan": {
                "min_samples": int(i_dbscan_min_samples),
                "eps_mult": float(d_eps_mult),
                "eps_min": float(d_eps_min),
                "eps_max": float(d_eps_max),
                "eps_estimated": float(estimate_eps_for_cells(cells, d_w, d_h)),
                "x_scale": float(d_x_scale),
                "y_scale": float(d_y_scale),
            },
            "post_merge": {
                "x_overlap_min_rel": float(d_merge_x_overlap_min_rel),
                "y_gap_max_rel": float(d_merge_y_gap_max_rel),
                "center_dist_max_rel": float(d_merge_center_dist_max_rel),
            },
            "remove_repeated_header_footer": bool(b_remove_repeated_header_footer),
        }
        out["blocks_count"] = int(len(blocks))
        out["blocks"] = blocks_out

    return out
# -----------------------------
# pdf_to_rag_json
# -----------------------------

def pdf_to_rag_json(pdf_path: Path) -> List[Dict[str, Any]]:
    if not isinstance(pdf_path, Path):
        raise TypeError("pdf_path must be a pathlib.Path")
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    if not pdf_path.is_file():
        raise ValueError(f"Not a file: {pdf_path}")

    with pdfplumber.open(str(pdf_path)) as pdf:
        repeat_counts: Dict[str, int] = {}

        if b_remove_repeated_header_footer:
            pages_lines: List[List[line_item]] = []
            pages_sizes: List[Tuple[float, float]] = []

            for p in pdf.pages:
                d_w = safe_float(getattr(p, "width", 0.0), 0.0)
                d_h = safe_float(getattr(p, "height", 0.0), 0.0)
                words = extract_words_plumber(p)
                lines = words_to_lines(words)
                pages_lines.append(lines)
                pages_sizes.append((d_w, d_h))

            repeat_counts = build_repeat_filter(pages_lines, pages_sizes)

        out_pages_debug: List[Dict[str, Any]] = []
        out_pages_simple: List[Dict[str, Any]] = []

        for i_page_no, p in enumerate(pdf.pages, start=1):
            page_obj = page_to_ordered_text_and_blocks(p, repeat_counts=repeat_counts)
            if b_debug:
                out_pages_debug.append({"page_no": int(i_page_no), "page_text": page_obj.get("ordered_text", ""), "page": page_obj})
            else:
                out_pages_simple.append({"page_no": int(i_page_no), "page_text": page_obj.get("ordered_text", "")})

        return out_pages_debug if b_debug else out_pages_simple

# -----------------------------
# pdf_to_text
# -----------------------------
def pdf_to_text(path):
    try:
        pages = pdf_to_rag_json(path)
        s_json = json.dumps(pages, ensure_ascii=True, indent=2)
        return s_json
    except Exception as e:
        sys.stderr.write(f"Error: {e}\n")
        return ''
    

print(pdf_to_text( r"d:\\xampp\\htdocs\\expchat\\python_search\\data\\save_pdfs\\250812_Praesi_Deutsch.pdf"))

# -----------------------------
# Main (fixed paths as requested)
# -----------------------------

#def main() -> int:
#    # History:
#    # - 2026-02-17 author_unknown: Fixed paths and safe JSON write.
#    s_pdf_path = r"d:\\xampp\\htdocs\\expchat\\python_search\\data\\save_pdfs\\250812_Praesi_Deutsch.pdf"
#    s_out_path = r"./filename.json"
#
#    in_path = Path(s_pdf_path)
#    out_path = Path(s_out_path)
#
#    try:
#        pages = pdf_to_rag_json(in_path)
#        s_json = json.dumps(pages, ensure_ascii=True, indent=2)
#        out_path.write_text(s_json, encoding="utf-8")
#    except Exception as e:
#        sys.stderr.write(f"Error: {e}\n")
#        return 1
#
#    return 0
#
#
#if __name__ == "__main__":
#    raise SystemExit(main())