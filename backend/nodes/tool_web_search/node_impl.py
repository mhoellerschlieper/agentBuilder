# file: backend/nodes/tool_web_search/node_impl.py
# description: Web Search Node Implementierung mit robuster Query Extraktion.
# history:
# - 2026-04-20: Erste ausgelagerte Version aus bestehender Browser und Search Logik. author Marcus Schlieper
# - 2026-04-20: Query Extraktion erweitert, damit JSON Input mit Feld value direkt genutzt wird. author Marcus Schlieper

import copy
import json
import re
from typing import Any, Dict, List
from urllib.parse import quote_plus, urlparse, parse_qs, unquote, urljoin

import requests
from html2text import html2text

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode

import playwright
from playwright.sync_api import sync_playwright


class ToolWebSearch(BaseNode):
    def get_node_type(self) -> str:
        return "tool_web_search"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "input_main", "s_label": "query", "s_description": "search query"},
            {"s_key": "input_context", "s_label": "context", "s_description": "extra context"},
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "output_main", "s_label": "results", "s_description": "search results"},
            {"s_key": "links", "s_label": "links", "s_description": "found links"},
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_query = str(o_data.get("s_query", "")).strip()
        i_limit = self._safe_int(o_data.get("i_limit", 5), 5)
        i_timeout = self._safe_int(o_data.get("i_timeout", 15000), 15000)
        

        if s_query == "":
            s_query = self._build_query_from_inputs(o_context.input_context)

        # Wichtige Normalisierung:
        # Falls der Input ein JSON String wie
        # {"value": "...", "type": "string", ...}
        # ist, wird nur das Feld value als Suchbegriff genutzt.
        s_query = self._extract_query_value(s_query)

        if s_query == "":
            raise ValueError("node_web_search_query_required")

        if i_limit < 1:
            i_limit = 1
        if i_limit > 20:
            i_limit = 20

        a_results = self._search_duckduckgo_html(
            s_query=s_query,
            i_limit=i_limit,
            i_timeout=i_timeout,
        )

       
        o_main_output = {
            "query": s_query,
            "result_count": len(a_results),
            "results": a_results,
            "value": a_results,
            "links": a_results,
            "resolved_data": o_data,
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "node_web_search_ok",
            "output": o_main_output,
            "value": a_results,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "results",
                "node_outputs": {
                    "output_main": o_main_output,
                    
                    "links": {
                        "query": s_query,
                        "links": a_results,
                        
                        "result_count": len(a_results),
                    },
                },
            },
        }

    def _build_query_from_inputs(self, o_input_context: Dict[str, Any]) -> str:
        d_named_inputs = o_input_context.get("named_inputs", {})
        if not isinstance(d_named_inputs, dict):
            return ""

        for s_key in ["input_main", "query", "prompt_data", "input"]:
            if s_key in d_named_inputs:
                return self._stringify_value(d_named_inputs.get(s_key))

        try:
            return json.dumps(d_named_inputs, ensure_ascii=True)
        except Exception:
            return str(d_named_inputs)

    def _extract_query_value(self, o_value: Any) -> str:
        # Historie:
        # - 2026-04-20: JSON String und Dict Input mit value Feld werden direkt ausgewertet.
        #
        # Diese Funktion nutzt bei einem Input wie
        # {"value": "wie wird das wetter in breckerfeld", ...}
        # nur den Inhalt von value.

        if o_value is None:
            return ""

        if isinstance(o_value, dict):
            s_value = str(o_value.get("value", "")).strip()
            if s_value != "":
                return s_value
            return self._stringify_value(o_value).strip()

        if isinstance(o_value, str):
            s_value = o_value.strip()
            if s_value == "":
                return ""

            try:
                o_json = json.loads(s_value)
                if isinstance(o_json, dict):
                    s_json_value = str(o_json.get("value", "")).strip()
                    if s_json_value != "":
                        return s_json_value
            except Exception:
                pass

            return s_value

        return str(o_value).strip()

    def _clean_host(self, u: str) -> str:
        """Host ohne Port zurückgeben."""
        return urlparse(u).hostname or ''
    
    def find_embedded_image_links(self,url: str, text: str) -> dict:
        """
        Sucht in 'text' nach
        • eingebetteten Bildern  (data:image/…)
        • verlinkten Bildern     (<img src= …> u. a.)
        • verlinkten Webseiten   (<a href= …?PHPSESSID=2l0mpp47g9k6v19umdklnh6vji>, Text-URLs)
        """
        linked_homepage: set[str] = set()
        embedded_images: set[str] = set()
        linked_images:   set[str] = set()

        try:
            page_host = self._clean_host(url)                # Hilfsroutine wie bisher
            base_url  = f'{urlparse(url).scheme}://{page_host}'

            forbidden = {
                page_host, 'font', 'cookie', 'login', 'icon', 'icons', 'default',
                'assets', 'impressum', 'kontakt', 'blank', 'facebook', 'logo', 'duckduckgo', 'duck.ai'
            }

            # --------------------------- 1. Bilder (HTML) ---------------------------
            img_patterns = [
                # 1. data:-URIs
                r'(?i)\bsrc\s*=\s*["\'](data:image/[^"\']+)["\']',
                # 2. absolute http(s)
                r'(?i)\bsrc\s*=\s*["\'](https?://[^"\']+)["\']',
                # 3. protokoll-relativ
                r'(?i)\bsrc\s*=\s*["\'](//[^"\']+)["\']',
                # 4. root-relativ
                r'(?i)\bsrc\s*=\s*["\'](/[^"\']+)["\']',
                # 5. pfad-relativ
                r'(?i)\bsrc\s*=\s*["\']([^/:"\'\s][^"\']+)["\']',
                # 6. srcset
                r'(?i)\bsrcset\s*=\s*["\']([^"\']+)["\']',
                # 7. CSS-url()
                r'(?i)url$["\']?(data:image/[^"\')]+|https?://[^"\')]+|//[^"\')]+|/[^"\')]+|[^/: "\')][^"\')]+)["\']?$',
            ]

            # ------------------------- 2. Webseiten (HTML) --------------------------
            page_patterns = [
                r'(?i)\bhref\s*=\s*["\'](https?://[^"\']+)["\']',
                r'(?i)\bhref\s*=\s*["\'](//[^"\']+)["\']',
                r'(?i)\bhref\s*=\s*["\'](/[^"\']+)["\']',
                r'(?i)\bhref\s*=\s*["\']([^/:"\'\s][^"\']+)["\']',
            ]

            # ----------------- 3. Text-Links (kein HTML vorhanden) ------------------
            plain_url_pattern = r'(?i)\bhttps?://[^\s)>$},"\']+'

            # -----------------------------------------------------------------------
            # Helfer: Normalisieren & filtern eines Links
            # -----------------------------------------------------------------------
            def _normalize(link: str) -> str | None:
                if not link:
                    return None
                if link.startswith('//'):
                    link = urlparse(url).scheme + ':' + link
                elif link.startswith('/'):
                    link = urljoin(base_url, link)
                elif not re.match(r'https?://', link):
                    link = urljoin(url, link)

                if any(bad in link for bad in forbidden):
                    return None
                return link

            # --------------------------- 4. Bilder sammeln --------------------------
            for pat in img_patterns:
                for m in re.findall(pat, text):
                    for token in re.split(r'\s*,\s*', m):           # srcset
                        link = token.split()[0].strip()
                        if not link:
                            continue
                        # data:-URI
                        if link.startswith('data:image/'):
                            if len(link) > 3000:
                                embedded_images.add(link)
                            continue
                        link = _normalize(link)
                        if not link:
                            continue
                        if not link.lower().endswith(IMAGE_EXTENSIONS):
                            continue
                        linked_images.add(link)

            # --------------------------- 5. Seiten sammeln --------------------------
            NON_HTML_EXT = (
                '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg',
                '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz', '.mp4', '.mp3'
            )
            # Erweiterte Liste gängiger Bild­-Endungen
            IMAGE_EXTENSIONS = (
                '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp',
                '.tif', '.tiff', '.ico', '.avif', '.apng'
            )

            html_found = bool(re.search(r'</?\w+[^>]*>', text))     # grober HTML-Check

            # (a) Links aus HTML-Attributen
            if html_found:
                for pat in page_patterns:
                    for raw in re.findall(pat, text):
                        link = _normalize(raw)
                        if not link or link.lower().endswith(NON_HTML_EXT):
                            continue
                        linked_homepage.add(link)

            # (b) Rein textuelle URLs
            else:
                for raw in re.findall(plain_url_pattern, text):
                    link = _normalize(raw)
                    if not link or link.lower().endswith(NON_HTML_EXT):
                        continue
                    linked_homepage.add(link)

        except Exception as e:
            print("Error in find_embedded_image_links:", e)

        return {
            "embeddedImages": list(embedded_images),
            "linkedImages":   list(linked_images),
            "linkedHomepage": list(linked_homepage),
        }

    def _search_duckduckgo_html(
        self,
        s_query: str,
        i_limit: int,
        i_timeout: int,
    ) -> List[Dict[str, Any]]:
        import playwright
        from playwright.sync_api import sync_playwright
            
        linkedHomepage=[]
        try:
            
            s_url = f"https://duckduckgo.com/?t=h_&q={quote_plus(s_query)}&ia=web"
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=False, args=[
                    "--window-position=-2000,-2000",
                    "--window-size=1280,800",
                ],)
                context = browser.new_context()

                self.page = context.new_page()

                self.page.goto(s_url)
                
                title = self.page.title()
                
                self.page.set_default_timeout(i_timeout)
                self.page.set_default_navigation_timeout(i_timeout)
                        
                self.page.save_screenshot = self.page.screenshot

                def write_file(file, selector):
                    with open(file, "w") as f:
                        f.write(self.page.inner_text(selector))

                self.page.write_file = write_file
                self.page.save_text = write_file
                self.page.save_to_file = write_file
                
                html = self.page.content()
                data = self.find_embedded_image_links(s_url, html)

                #embeddedImages = data["embeddedImages"]
                #linkedImages = data["linkedImages"]
                linkedHomepage = data["linkedHomepage"]
                
                context.close()
                browser.close()
                
        except Exception as e:
            print("Error in BrowserTool.tool_runner: "+str(e))
            
        linkedHomepage = linkedHomepage[:i_limit]
        return linkedHomepage

    def _safe_int(self, o_value: Any, i_default: int) -> int:
        try:
            return int(o_value)
        except Exception:
            return i_default

    def _stringify_value(self, o_value: Any) -> str:
        if isinstance(o_value, dict) or isinstance(o_value, list):
            try:
                return json.dumps(o_value, ensure_ascii=True)
            except Exception:
                return str(o_value)
        if o_value is None:
            return ""
        return str(o_value)
