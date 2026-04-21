# file: backend/nodes/tool_web_crawler/node_impl.py
# description: Crawler Node fuer Webseiten. Die Node verarbeitet Start URLs,
# besucht Seiten bis zu einer konfigurierbaren Tiefe und sammelt Texte,
# Seiten Links und Bild Links. Das Laden der Seiten erfolgt ueber Playwright.
# history:
# - 2026-04-21: Erste Version des crawler_node erstellt. author Marcus Schlieper
# - 2026-04-21: Input Verarbeitung fuer URLs aus web_search Ergebnissen ergaenzt. author Marcus Schlieper
# - 2026-04-21: Sichere Begrenzungen fuer Tiefe, Limits und Timeout ergaenzt. author Marcus Schlieper
# - 2026-04-21: _fetch_page_data von requests auf Playwright umgestellt. author Marcus Schlieper

import copy
import json
import re
from collections import deque
from typing import Any, Dict, List, Tuple
from urllib.parse import urljoin, urlparse, urldefrag

from html2text import html2text
from playwright.sync_api import sync_playwright

from bs4 import BeautifulSoup

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class ToolWebCrawler(BaseNode):
    def get_node_type(self) -> str:
        return "tool_web_crawler"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "urls",
                "s_description": "start urls or web search result links",
            },
            {
                "s_key": "input_context",
                "s_label": "context",
                "s_description": "extra context",
            },
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "crawl_result",
                "s_description": "crawled pages with text links and image links",
            },
            {
                "s_key": "pages",
                "s_label": "pages",
                "s_description": "list of crawled pages",
            },
            {
                "s_key": "links",
                "s_label": "links",
                "s_description": "all discovered page links",
            },
            {
                "s_key": "image_links",
                "s_label": "image_links",
                "s_description": "all discovered image links",
            },
        ]

    def remove_embedded_image(self, html_string):
        """
        Entfernt eingebettete Bilder im Format 'data:image/...' aus einem HTML-String.

        :param html_string: Der HTML-String, aus dem das Bild entfernt werden soll.
        :return: Der bereinigte HTML-String.
        """
        try:
            # Regex-Muster zum Finden von eingebetteten Bildern im Format 'data:image/...'
            pattern = r'<img[^>]*src="data:image/[^"]*"[^>]*>'
            # Entfernen der eingebetteten Bilder
            html_string = re.sub(pattern, '', html_string)
        except Exception as e:
            print("Error in remove_embedded_image: "+str(e))
            
        try:
            soup = BeautifulSoup(html_string, 'html.parser')

            # Find all <script> tags and remove them
            for script in soup.find_all('script'):
                script.decompose()

            # Return the modified HTML as a string
            return str(soup.text)
        except Exception as e:
            print("Error in remove scripts: "+str(e))
            
        return html_string
    # =============================================================================
    # =============================================================================
    ##
    # =============================================================================
    # =============================================================================


    def remove_markdown_image(self, html_string):
        """
        Entfernt eingebettete Bilder im Format 'data:image/...' aus einem HTML-String.

        :param html_string: Der HTML-String, aus dem das Bild entfernt werden soll.
        :return: Der bereinigte HTML-String.
        """
        cleaned_html = ""
        if html_string != '':
            try:
                # Regex-Muster zum Finden von eingebetteten Bildern im Format 'data:image/...'
                pattern = r'!\[.*?\]\(.*?\)'
                # Entfernen der eingebetteten Bilder
                cleaned_html = re.sub(pattern, '', html_string)
                return cleaned_html
            except Exception as e:
                print("Error in remove_markdown_image: "+str(e))

            # Return the modified HTML as a string
            return html_string
        else:
            return html_string


    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        i_max_depth = self._safe_int(o_data.get("i_max_depth", 1), 1)
        i_max_pages = self._safe_int(o_data.get("i_max_pages", 5), 5)
        i_timeout = self._safe_int(o_data.get("i_timeout", 15000), 15000)
        b_same_host_only = self._safe_bool(o_data.get("b_same_host_only", True), True)

        if i_max_depth < 0:
            i_max_depth = 0
        if i_max_depth > 5:
            i_max_depth = 5

        if i_max_pages < 1:
            i_max_pages = 1
        if i_max_pages > 200:
            i_max_pages = 200

        if i_timeout < 1000:
            i_timeout = 1000
        if i_timeout > 120000:
            i_timeout = 120000

        a_start_urls = self._extract_start_urls(o_data, o_context.input_context)
        if len(a_start_urls) == 0:
            raise ValueError("node_web_crawler_urls_required")

        o_result = self._crawl_urls(
            a_start_urls=a_start_urls,
            i_max_depth=i_max_depth,
            i_max_pages=i_max_pages,
            i_timeout=i_timeout,
            b_same_host_only=b_same_host_only,
        )

        o_main_output = {
            "start_urls": a_start_urls,
            "page_count": len(o_result.get("pages", [])),
            "pages": o_result.get("pages", []),
            "links": o_result.get("links", []),
            "image_links": o_result.get("image_links", []),
            "resolved_data": o_data,
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "node_web_crawler_ok",
            "output": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "crawl_result",
                "node_outputs": {
                    "output_main": o_main_output,
                    "pages": o_result.get("pages", []),
                    "links": o_result.get("links", []),
                    "image_links": o_result.get("image_links", []),
                },
            },
        }

    def _extract_start_urls(self, o_data: Dict[str, Any], o_input_context: Dict[str, Any]) -> List[str]:
        # history:
        # - 2026-04-21: Extraktion von URLs aus Node Daten und Input Kontext erstellt. author Marcus Schlieper
        # - 2026-04-21: Unterstuetzung fuer web_search output Formate ergaenzt. author Marcus Schlieper

        a_candidates = []

        for s_key in ["a_urls", "urls", "start_urls", "s_url"]:
            if s_key in o_data:
                a_candidates.append(o_data.get(s_key))

        d_named_inputs = o_input_context.get("named_inputs", {})
        if isinstance(d_named_inputs, dict):
            for s_key in ["input_main", "urls", "links", "output_main", "input"]:
                if s_key in d_named_inputs:
                    a_candidates.append(d_named_inputs.get(s_key))

        a_urls = []
        for o_value in a_candidates:
            a_urls.extend(self._extract_urls_from_any(o_value))

        a_unique_urls = []
        a_seen = set()
        for s_url in a_urls:
            s_normalized_url = self._normalize_url(s_url)
            if s_normalized_url == "":
                continue
            if s_normalized_url in a_seen:
                continue
            a_seen.add(s_normalized_url)
            a_unique_urls.append(s_normalized_url)

        return a_unique_urls

    def _extract_urls_from_any(self, o_value: Any) -> List[str]:
        a_urls = []

        if o_value is None:
            return a_urls

        if isinstance(o_value, str):
            s_value = o_value.strip()
            if s_value == "":
                return a_urls

            try:
                o_json = json.loads(s_value)
                return self._extract_urls_from_any(o_json)
            except Exception:
                pass

            a_urls.extend(self._find_urls_in_text(s_value))
            if len(a_urls) == 0 and self._looks_like_url(s_value):
                a_urls.append(s_value)
            return a_urls

        if isinstance(o_value, list):
            for o_item in o_value:
                a_urls.extend(self._extract_urls_from_any(o_item))
            return a_urls

        if isinstance(o_value, dict):
            for s_key in [
                "url",
                "href",
                "link",
                "urls",
                "links",
                "results",
                "output",
                "output_main",
                "value",
            ]:
                if s_key in o_value:
                    a_urls.extend(self._extract_urls_from_any(o_value.get(s_key)))

            for o_item in o_value.values():
                if isinstance(o_item, (dict, list)):
                    a_urls.extend(self._extract_urls_from_any(o_item))

            return a_urls

        return a_urls

    def _crawl_urls(
        self,
        a_start_urls: List[str],
        i_max_depth: int,
        i_max_pages: int,
        i_timeout: int,
        b_same_host_only: bool,
    ) -> Dict[str, Any]:
        a_pages = []
        a_all_links = set()
        a_all_image_links = set()
        a_visited = set()
        q_queue: deque[Tuple[str, int, str]] = deque()

        for s_url in a_start_urls:
            s_host = self._get_host(s_url)
            q_queue.append((s_url, 0, s_host))

        while len(q_queue) > 0 and len(a_pages) < i_max_pages:
            s_current_url, i_depth, s_root_host = q_queue.popleft()
            s_normalized_url = self._normalize_url(s_current_url)

            if s_normalized_url == "":
                continue
            if s_normalized_url in a_visited:
                continue

            a_visited.add(s_normalized_url)

            o_page_result = self._fetch_page_data(
                s_url=s_normalized_url,
                i_timeout=i_timeout,
            )

            if not o_page_result.get("b_ok", False):
                a_pages.append(
                    {
                        "url": s_normalized_url,
                        "depth": i_depth,
                        "status_code": o_page_result.get("i_status_code", 0),
                        "content_type": o_page_result.get("s_content_type", ""),
                        "text": "",
                        "links": [],
                        "image_links": [],
                        "error": o_page_result.get("s_error", "request_failed"),
                    }
                )
                continue

            a_links = o_page_result.get("links", [])
            a_image_links = o_page_result.get("image_links", [])
            s_text = o_page_result.get("text", "")
            
            s_text = self.remove_embedded_image(s_text)

            for s_link in a_links:
                a_all_links.add(s_link)

            for s_image_link in a_image_links:
                a_all_image_links.add(s_image_link)

            a_pages.append(
                {
                    "url": s_normalized_url,
                    "depth": i_depth,
                    "status_code": o_page_result.get("i_status_code", 200),
                    "content_type": o_page_result.get("s_content_type", ""),
                    "text": s_text[:5000],
                    #"links": a_links,
                    #"image_links": a_image_links,
                    "error": "",
                }
            )

            if i_depth >= i_max_depth:
                continue

            for s_link in a_links:
                s_next_url = self._normalize_url(s_link)
                if s_next_url == "":
                    continue
                if s_next_url in a_visited:
                    continue
                if b_same_host_only and self._get_host(s_next_url) != s_root_host:
                    continue
                q_queue.append((s_next_url, i_depth + 1, s_root_host))

        return {
            "pages": a_pages,
            "links": sorted(a_all_links),
            "image_links": sorted(a_all_image_links),
        }

    def _fetch_page_data(self, s_url: str, i_timeout: int) -> Dict[str, Any]:
        # history:
        # - 2026-04-21: requests.get durch Playwright ersetzt. author Marcus Schlieper
        # - 2026-04-21: Browser wird unsichtbar ausserhalb des sichtbaren Bereichs gestartet. author Marcus Schlieper

        o_browser = None
        o_context = None

        try:
            with sync_playwright() as p:
                o_browser = p.chromium.launch(
                    headless=False,
                    args=[
                        "--window-position=-2000,-2000",
                        "--window-size=1280,800",
                    ],
                )
                o_context = o_browser.new_context()

                self.page = o_context.new_page()

                self.page.set_default_timeout(i_timeout)
                self.page.set_default_navigation_timeout(i_timeout)

                self.page.goto(s_url, wait_until="domcontentloaded", timeout=i_timeout)

                s_title = self.page.title()

                self.page.save_screenshot = self.page.screenshot

                def write_file(s_file: str, s_selector: str) -> None:
                    with open(s_file, "w", encoding="utf-8") as o_file:
                        o_file.write(self.page.inner_text(s_selector))

                self.page.write_file = write_file
                self.page.save_text = write_file
                self.page.save_to_file = write_file

                s_html = self.page.content()
                s_final_url = self.page.url

                try:
                    s_body_text = self.page.inner_text("body")
                except Exception:
                    s_body_text = self._html_to_text(s_html)

                o_links_data = self._extract_links_from_html(
                    s_url=s_final_url,
                    s_html=s_html,
                )

                try:
                    o_context.close()
                except Exception:
                    pass

                try:
                    o_browser.close()
                except Exception:
                    pass

                return {
                    "b_ok": True,
                    "i_status_code": 200,
                    "s_content_type": "text/html",
                    "text": s_body_text.strip(),
                    "links": o_links_data.get("links", []),
                    "image_links": o_links_data.get("image_links", []),
                    "s_title": s_title,
                    "s_final_url": s_final_url,
                }

        except Exception as o_exc:
            try:
                if o_context is not None:
                    o_context.close()
            except Exception:
                pass

            try:
                if o_browser is not None:
                    o_browser.close()
            except Exception:
                pass

            return {
                "b_ok": False,
                "i_status_code": 0,
                "s_content_type": "",
                "s_error": f"playwright_exception: {str(o_exc)}",
            }

    def _extract_links_from_html(self, s_url: str, s_html: str) -> Dict[str, List[str]]:
        a_links = set()
        a_image_links = set()

        a_href_patterns = [
            r'(?i)\bhref\s*=\s*["\']([^"\']+)["\']',
        ]
        a_img_patterns = [
            r'(?i)\bsrc\s*=\s*["\']([^"\']+)["\']',
            r'(?i)\bsrcset\s*=\s*["\']([^"\']+)["\']',
        ]
        a_image_extensions = (
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".svg",
            ".bmp",
            ".tif",
            ".tiff",
            ".ico",
            ".avif",
            ".apng",
        )

        for s_pattern in a_href_patterns:
            for s_raw_link in re.findall(s_pattern, s_html):
                s_link = self._normalize_relative_url(s_url, s_raw_link)
                if s_link == "":
                    continue
                if self._is_http_url(s_link):
                    a_links.add(s_link)

        for s_pattern in a_img_patterns:
            for s_match in re.findall(s_pattern, s_html):
                for s_token in re.split(r"\s*,\s*", s_match):
                    s_candidate = s_token.split()[0].strip()
                    s_link = self._normalize_relative_url(s_url, s_candidate)
                    if s_link == "":
                        continue
                    if not self._is_http_url(s_link):
                        continue
                    if self._has_image_extension(s_link, a_image_extensions):
                        a_image_links.add(s_link)

        return {
            "links": sorted(a_links),
            "image_links": sorted(a_image_links),
        }

    def _normalize_relative_url(self, s_base_url: str, s_link: str) -> str:
        if not isinstance(s_link, str):
            return ""

        s_link = s_link.strip()
        if s_link == "":
            return ""
        if s_link.startswith("#"):
            return ""
        if s_link.startswith("javascript:"):
            return ""
        if s_link.startswith("mailto:"):
            return ""
        if s_link.startswith("tel:"):
            return ""
        if s_link.startswith("data:"):
            return ""

        s_joined = urljoin(s_base_url, s_link)
        return self._normalize_url(s_joined)

    def _normalize_url(self, s_url: str) -> str:
        if not isinstance(s_url, str):
            return ""

        s_url = s_url.strip()
        if s_url == "":
            return ""
        if not self._is_http_url(s_url):
            return ""

        s_clean_url, _ = urldefrag(s_url)
        return s_clean_url.strip()

    def _html_to_text(self, s_html: str) -> str:
        try:
            s_text = html2text(s_html)
            s_text = re.sub(r"\n{3,}", "\n\n", s_text)
            return s_text.strip()
        except Exception:
            s_text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", s_html)
            s_text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", s_text)
            s_text = re.sub(r"(?is)<[^>]+>", " ", s_text)
            s_text = re.sub(r"\s+", " ", s_text)
            return s_text.strip()

    def _find_urls_in_text(self, s_text: str) -> List[str]:
        if not isinstance(s_text, str) or s_text.strip() == "":
            return []
        return re.findall(r'(?i)\bhttps?://[^\s<>"\']+', s_text)

    def _looks_like_url(self, s_value: str) -> bool:
        return self._is_http_url(s_value)

    def _is_http_url(self, s_url: str) -> bool:
        return bool(re.match(r"^https?://", str(s_url).strip(), re.IGNORECASE))

    def _get_host(self, s_url: str) -> str:
        try:
            return urlparse(s_url).hostname or ""
        except Exception:
            return ""

    def _has_image_extension(self, s_url: str, a_image_extensions: tuple) -> bool:
        try:
            s_path = urlparse(s_url).path.lower()
            for s_extension in a_image_extensions:
                if s_path.endswith(s_extension):
                    return True
            return False
        except Exception:
            return False

    def _safe_int(self, o_value: Any, i_default: int) -> int:
        try:
            return int(o_value)
        except Exception:
            return i_default

    def _safe_bool(self, o_value: Any, b_default: bool) -> bool:
        if isinstance(o_value, bool):
            return o_value

        if isinstance(o_value, str):
            s_value = o_value.strip().lower()
            if s_value in ["true", "1", "yes", "ja"]:
                return True
            if s_value in ["false", "0", "no", "nein"]:
                return False

        return b_default
