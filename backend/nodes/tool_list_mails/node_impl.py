# file: backend/nodes/tool_list_mails/node_impl.py
# description: Node zum sicheren Auflisten von E Mails ueber IMAP mit Filtern
# auf seit Datum, gelesen ungelesen und optionalem Setzen von Flags nach
# der Verarbeitung.
# history:
# - 2026-04-22: Erste funktionsfaehige Version erstellt. author Marcus Schlieper
# - 2026-04-22: Filter fuer since, seen, unseen, from, subject und folder ergaenzt. author Marcus Schlieper
# - 2026-04-22: Aktionen nach Verarbeitung fuer none, seen, unseen, flag und unflag ergaenzt. author Marcus Schlieper

import copy
import email
import imaplib
import json
import re
from datetime import datetime
from email.header import decode_header
from typing import Any, Dict, List, Optional, Tuple

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode

class ToolListMails(BaseNode):
    def get_node_type(self) -> str:
        return "tool_list_mails"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "mail_input",
                "s_description": "mail filter input data",
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
                "s_label": "mail_list_result",
                "s_description": "full mail list result",
            },
            {
                "s_key": "mails",
                "s_label": "mails",
                "s_description": "listed mails",
            },
            {
                "s_key": "result_count",
                "s_label": "result_count",
                "s_description": "count of listed mails",
            },
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_imap_host = str(o_data.get("s_imap_host", "")).strip()
        i_imap_port = self._safe_int(o_data.get("i_imap_port", 993), 993)
        s_username = str(o_data.get("s_username", "")).strip()
        s_password = str(o_data.get("s_password", "")).strip()
        b_use_ssl = self._safe_bool(o_data.get("b_use_ssl", True), True)

        s_folder = str(o_data.get("s_folder", "INBOX")).strip()
        i_limit = self._safe_int(o_data.get("i_limit", 20), 20)

        s_since = str(o_data.get("s_since", "")).strip()
        s_seen_filter = str(o_data.get("s_seen_filter", "all")).strip().lower()
        s_from_filter = str(o_data.get("s_from_filter", "")).strip()
        s_subject_filter = str(o_data.get("s_subject_filter", "")).strip()
        s_after_action = str(o_data.get("s_after_action", "none")).strip().lower()

        if s_imap_host == "":
            raise ValueError("node_tool_list_mails_imap_host_required")

        if i_imap_port < 1 or i_imap_port > 65535:
            raise ValueError("node_tool_list_mails_invalid_imap_port")

        if s_username == "":
            raise ValueError("node_tool_list_mails_username_required")

        if s_password == "":
            raise ValueError("node_tool_list_mails_password_required")

        if s_folder == "":
            s_folder = "INBOX"

        if i_limit < 1:
            i_limit = 1

        if i_limit > 500:
            i_limit = 500

        if s_seen_filter not in ["all", "seen", "unseen"]:
            raise ValueError("node_tool_list_mails_invalid_seen_filter")

        if s_after_action not in ["none", "seen", "unseen", "flag", "unflag"]:
            raise ValueError("node_tool_list_mails_invalid_after_action")

        s_since_imap = self._normalize_since_for_imap(s_since)

        a_mails = self._list_mails(
            s_imap_host=s_imap_host,
            i_imap_port=i_imap_port,
            s_username=s_username,
            s_password=s_password,
            b_use_ssl=b_use_ssl,
            s_folder=s_folder,
            i_limit=i_limit,
            s_since_imap=s_since_imap,
            s_seen_filter=s_seen_filter,
            s_from_filter=s_from_filter,
            s_subject_filter=s_subject_filter,
            s_after_action=s_after_action,
        )

        o_main_output = {
            "result_count": len(a_mails),
            "mails": a_mails,
            "folder": s_folder,
            "filters": {
                "since": s_since_imap,
                "seen_filter": s_seen_filter,
                "from_filter": s_from_filter,
                "subject_filter": s_subject_filter,
                "after_action": s_after_action,
                "limit": i_limit,
            },
            "resolved_data": self._redact_sensitive_data(o_data),
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "node_tool_list_mails_ok",
            "output": o_main_output,
            "value": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "mail_list_result",
                "node_outputs": {
                    "output_main": o_main_output,
                    "mails": a_mails,
                    "result_count": len(a_mails),
                },
            },
        }

    def _list_mails(
        self,
        s_imap_host: str,
        i_imap_port: int,
        s_username: str,
        s_password: str,
        b_use_ssl: bool,
        s_folder: str,
        i_limit: int,
        s_since_imap: str,
        s_seen_filter: str,
        s_from_filter: str,
        s_subject_filter: str,
        s_after_action: str,
    ) -> List[Dict[str, Any]]:
        # history:
        # - 2026-04-22: IMAP Suche, Auslesen und Flag Aktionen erstellt. author Marcus Schlieper

        o_imap = None
        a_result = []

        try:
            if b_use_ssl:
                o_imap = imaplib.IMAP4_SSL(s_imap_host, i_imap_port)
            else:
                o_imap = imaplib.IMAP4(s_imap_host, i_imap_port)

            o_login_result = o_imap.login(s_username, s_password)
            if not self._imap_ok(o_login_result):
                raise ValueError("node_tool_list_mails_login_failed")

            o_select_result = o_imap.select(f'"{s_folder}"')
            if not self._imap_ok(o_select_result):
                raise ValueError("node_tool_list_mails_select_folder_failed")

            s_search_query = self._build_search_query(
                s_since_imap=s_since_imap,
                s_seen_filter=s_seen_filter,
                s_from_filter=s_from_filter,
                s_subject_filter=s_subject_filter,
            )

            o_search_result = o_imap.search(None, s_search_query)
            if not self._imap_ok(o_search_result):
                raise ValueError("node_tool_list_mails_search_failed")

            a_mail_ids = self._extract_mail_ids(o_search_result)
            a_mail_ids = a_mail_ids[-i_limit:]
            a_mail_ids.reverse()

            for b_mail_id in a_mail_ids:
                o_fetch_result = o_imap.fetch(b_mail_id, "(RFC822 FLAGS)")
                if not self._imap_ok(o_fetch_result):
                    continue

                o_mail_item = self._parse_fetch_result(
                    b_mail_id=b_mail_id,
                    o_fetch_result=o_fetch_result,
                )

                if o_mail_item is None:
                    continue

                a_result.append(o_mail_item)

                self._apply_after_action(
                    o_imap=o_imap,
                    b_mail_id=b_mail_id,
                    s_after_action=s_after_action,
                )

            try:
                o_imap.expunge()
            except Exception:
                pass

            try:
                o_imap.close()
            except Exception:
                pass

            try:
                o_imap.logout()
            except Exception:
                pass

            return a_result

        except imaplib.IMAP4.error as o_exc:
            raise ValueError(f"node_tool_list_mails_imap_error: {str(o_exc)}")
        except Exception as o_exc:
            raise ValueError(f"node_tool_list_mails_unexpected_error: {str(o_exc)}")
        finally:
            try:
                if o_imap is not None:
                    o_imap.logout()
            except Exception:
                pass

    def _build_search_query(
        self,
        s_since_imap: str,
        s_seen_filter: str,
        s_from_filter: str,
        s_subject_filter: str,
    ) -> str:
        a_parts = []

        if s_since_imap != "":
            a_parts.extend(["SINCE", f'"{s_since_imap}"'])

        if s_seen_filter == "seen":
            a_parts.append("SEEN")
        elif s_seen_filter == "unseen":
            a_parts.append("UNSEEN")

        if s_from_filter != "":
            a_parts.extend(["FROM", f'"{self._escape_imap_string(s_from_filter)}"'])

        if s_subject_filter != "":
            a_parts.extend(["SUBJECT", f'"{self._escape_imap_string(s_subject_filter)}"'])

        if len(a_parts) == 0:
            return "ALL"

        return " ".join(a_parts)

    def _parse_fetch_result(
        self,
        b_mail_id: bytes,
        o_fetch_result: Tuple[Any, Any],
    ) -> Optional[Dict[str, Any]]:
        a_data = o_fetch_result[1]
        b_raw_mail = None
        s_flags_raw = ""

        if not isinstance(a_data, list):
            return None

        for o_item in a_data:
            if isinstance(o_item, tuple) and len(o_item) >= 2:
                if isinstance(o_item[1], bytes):
                    b_raw_mail = o_item[1]
                if isinstance(o_item[0], bytes):
                    s_flags_raw = o_item[0].decode("utf-8", errors="ignore")

        if b_raw_mail is None:
            return None

        o_message = email.message_from_bytes(b_raw_mail)

        s_subject = self._decode_mime_header(o_message.get("Subject", ""))
        s_from = self._decode_mime_header(o_message.get("From", ""))
        s_to = self._decode_mime_header(o_message.get("To", ""))
        s_date = self._decode_mime_header(o_message.get("Date", ""))
        s_message_id = self._decode_mime_header(o_message.get("Message-ID", ""))

        s_body_text, s_body_html = self._extract_message_bodies(o_message)

        return {
            "mail_id": b_mail_id.decode("utf-8", errors="ignore"),
            "subject": s_subject,
            "from": s_from,
            "to": s_to,
            "date": s_date,
            "message_id": s_message_id,
            "flags": self._extract_flags(s_flags_raw),
            "b_seen": "\\Seen" in s_flags_raw,
            "b_flagged": "\\Flagged" in s_flags_raw,
            "body_text": s_body_text,
            "body_html": s_body_html,
        }

    def _extract_message_bodies(self, o_message: Any) -> Tuple[str, str]:
        s_body_text = ""
        s_body_html = ""

        try:
            if o_message.is_multipart():
                for o_part in o_message.walk():
                    s_content_type = str(o_part.get_content_type()).lower()
                    s_disposition = str(o_part.get("Content-Disposition", "")).lower()

                    if "attachment" in s_disposition:
                        continue

                    b_payload = o_part.get_payload(decode=True)
                    if b_payload is None:
                        continue

                    s_charset = o_part.get_content_charset() or "utf-8"
                    s_decoded = self._decode_bytes(b_payload, s_charset)

                    if s_content_type == "text/plain" and s_body_text == "":
                        s_body_text = s_decoded.strip()

                    if s_content_type == "text/html" and s_body_html == "":
                        s_body_html = s_decoded.strip()
            else:
                b_payload = o_message.get_payload(decode=True)
                if b_payload is not None:
                    s_charset = o_message.get_content_charset() or "utf-8"
                    s_decoded = self._decode_bytes(b_payload, s_charset)
                    s_content_type = str(o_message.get_content_type()).lower()

                    if s_content_type == "text/html":
                        s_body_html = s_decoded.strip()
                    else:
                        s_body_text = s_decoded.strip()
        except Exception:
            pass

        return s_body_text, s_body_html

    def _apply_after_action(
        self,
        o_imap: Any,
        b_mail_id: bytes,
        s_after_action: str,
    ) -> None:
        if s_after_action == "none":
            return

        if s_after_action == "seen":
            o_imap.store(b_mail_id, "+FLAGS", "\\Seen")
            return

        if s_after_action == "unseen":
            o_imap.store(b_mail_id, "-FLAGS", "\\Seen")
            return

        if s_after_action == "flag":
            o_imap.store(b_mail_id, "+FLAGS", "\\Flagged")
            return

        if s_after_action == "unflag":
            o_imap.store(b_mail_id, "-FLAGS", "\\Flagged")
            return

    def _extract_mail_ids(self, o_search_result: Tuple[Any, Any]) -> List[bytes]:
        try:
            a_data = o_search_result[1]
            if not isinstance(a_data, list) or len(a_data) == 0:
                return []
            b_joined = a_data[0]
            if not isinstance(b_joined, bytes):
                return []
            return [b_item for b_item in b_joined.split() if b_item.strip() != b""]
        except Exception:
            return []

    def _extract_flags(self, s_flags_raw: str) -> List[str]:
        a_found = re.findall(r"\\\$A-Za-z]+", s_flags_raw)
        a_unique = []
        a_seen = set()

        for s_flag in a_found:
            if s_flag in a_seen:
                continue
            a_seen.add(s_flag)
            a_unique.append(s_flag)

        return a_unique

    def _decode_mime_header(self, s_value: str) -> str:
        if not isinstance(s_value, str):
            return ""

        try:
            a_parts = decode_header(s_value)
            a_result = []

            for o_part, o_encoding in a_parts:
                if isinstance(o_part, bytes):
                    s_encoding = o_encoding or "utf-8"
                    a_result.append(self._decode_bytes(o_part, s_encoding))
                else:
                    a_result.append(str(o_part))

            return "".join(a_result).strip()
        except Exception:
            return str(s_value).strip()

    def _decode_bytes(self, b_value: bytes, s_charset: str) -> str:
        try:
            return b_value.decode(s_charset, errors="replace")
        except Exception:
            try:
                return b_value.decode("utf-8", errors="replace")
            except Exception:
                return ""

    def _normalize_since_for_imap(self, s_value: str) -> str:
        if s_value == "":
            return ""

        a_formats = [
            "%Y-%m-%d",
            "%d.%m.%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
        ]

        for s_format in a_formats:
            try:
                o_dt = datetime.strptime(s_value, s_format)
                return o_dt.strftime("%d-%b-%Y")
            except Exception:
                pass

        try:
            o_dt = datetime.fromisoformat(s_value.replace("Z", "+00:00"))
            return o_dt.strftime("%d-%b-%Y")
        except Exception:
            raise ValueError("node_tool_list_mails_invalid_since")

    def _escape_imap_string(self, s_value: str) -> str:
        return str(s_value).replace("\\", "\\\\").replace('"', '\\"')

    def _imap_ok(self, o_result: Any) -> bool:
        try:
            return isinstance(o_result, tuple) and len(o_result) >= 1 and o_result[0] == "OK"
        except Exception:
            return False

    def _redact_sensitive_data(self, o_data: Dict[str, Any]) -> Dict[str, Any]:
        o_copy = copy.deepcopy(o_data)

        for s_key in ["s_password"]:
            if s_key in o_copy:
                o_copy[s_key] = "***"

        return o_copy

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
