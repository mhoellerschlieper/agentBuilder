# file: backend/nodes/tool_send_mail/node_impl.py
# description: Node zum Versand von E Mails ueber SMTP mit sicherer Validierung.
# history:
# - 2026-04-22: Erste funktionsfaehige Version erstellt. author Marcus Schlieper
# - 2026-04-22: TLS, Mehrfach Empfaenger und Fehlerbehandlung ergaenzt. author Marcus Schlieper

import copy
import re

from smtplib import SMTP_SSL as SMTP 
from email.message import EmailMessage
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode

class ToolSendMail(BaseNode):
    def get_node_type(self) -> str:
        return "tool_send_mail"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "mail_input",
                "s_description": "mail input data",
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
                "s_label": "mail_result",
                "s_description": "full mail result",
            },
            {
                "s_key": "status",
                "s_label": "status",
                "s_description": "send status",
            },
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_smtp_host = str(o_data.get("s_smtp_host", "")).strip()
        i_smtp_port = self._safe_int(o_data.get("i_smtp_port", 587), 587)
        s_smtp_username = str(o_data.get("s_smtp_username", "")).strip()
        s_smtp_password = str(o_data.get("s_smtp_password", "")).strip()
        b_use_tls = self._safe_bool(o_data.get("b_use_tls", True), True)

        s_from_mail = str(o_data.get("s_from_mail", "")).strip()
        s_from_name = str(o_data.get("s_from_name", "")).strip()
        s_to_mail = str(o_data.get("s_to_mail", "")).strip()
        s_subject = str(o_data.get("s_subject", "")).strip()
        s_body_text = str(o_data.get("s_body_text", "")).strip()
        s_body_html = str(o_data.get("s_body_html", "")).strip()

        if s_smtp_host == "":
            raise ValueError("node_tool_send_mail_smtp_host_required")

        if i_smtp_port < 1 or i_smtp_port > 65535:
            raise ValueError("node_tool_send_mail_invalid_smtp_port")

        if not self._is_valid_mail(s_from_mail):
            raise ValueError("node_tool_send_mail_invalid_from_mail")

        a_to_mail = self._parse_recipients(s_to_mail)
        if len(a_to_mail) == 0:
            raise ValueError("node_tool_send_mail_to_mail_required")

        for s_mail in a_to_mail:
            if not self._is_valid_mail(s_mail):
                raise ValueError("node_tool_send_mail_invalid_to_mail")

        if s_subject == "":
            raise ValueError("node_tool_send_mail_subject_required")

        if s_body_text == "" and s_body_html == "":
            raise ValueError("node_tool_send_mail_body_required")

        o_message = self._build_message(
            s_from_mail=s_from_mail,
            s_from_name=s_from_name,
            a_to_mail=a_to_mail,
            s_subject=s_subject,
            s_body_text=s_body_text,
            s_body_html=s_body_html,
        )

        self._send_message(
            s_smtp_host=s_smtp_host,
            i_smtp_port=i_smtp_port,
            s_smtp_username=s_smtp_username,
            s_smtp_password=s_smtp_password,
            b_use_tls=b_use_tls,
            o_message=o_message,
            a_to_mail=a_to_mail,
        )

        o_main_output = {
            "status": "sent",
            "smtp_host": s_smtp_host,
            "smtp_port": i_smtp_port,
            "from_mail": s_from_mail,
            "to_mail": a_to_mail,
            "subject": s_subject,
            "resolved_data": self._redact_sensitive_data(o_data),
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "node_tool_send_mail_ok",
            "output": o_main_output,
            "value": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "mail_result",
                "node_outputs": {
                    "output_main": o_main_output,
                    "status": "sent",
                },
            },
        }

    def _build_message(
        self,
        s_from_mail: str,
        s_from_name: str,
        a_to_mail: List[str],
        s_subject: str,
        s_body_text: str,
        s_body_html: str,
    ) -> EmailMessage:
        # history:
        # - 2026-04-22: Aufbau von Text und HTML Mail erstellt. author Marcus Schlieper

        o_message = EmailMessage()

        if s_from_name != "":
            o_message["From"] = f"{s_from_name} <{s_from_mail}>"
        else:
            o_message["From"] = s_from_mail

        o_message["To"] = ", ".join(a_to_mail)
        o_message["Subject"] = s_subject

        if s_body_text != "":
            o_message.set_content(s_body_text)
        else:
            o_message.set_content("html_mail")

        if s_body_html != "":
            o_message.add_alternative(s_body_html, subtype="html")

        return o_message

    def _send_message(
        self,
        s_smtp_host: str,
        i_smtp_port: int,
        s_smtp_username: str,
        s_smtp_password: str,
        b_use_tls: bool,
        o_message: EmailMessage,
        a_to_mail: List[str],
    ) -> None:
        o_server = None

        try:
            o_server = SMTP(s_smtp_host, i_smtp_port, timeout=30)
            o_server.ehlo()

            if b_use_tls:
                o_server.starttls()
                o_server.ehlo()

            if s_smtp_username != "":
                o_server.login(s_smtp_username, s_smtp_password)

            o_server.send_message(o_message, to_addrs=a_to_mail)

        except Exception as o_exc:
            raise ValueError(f"node_tool_send_mail_unexpected_error: {str(o_exc)}")
        finally:
            try:
                if o_server is not None:
                    o_server.quit()
            except Exception:
                pass

    def _parse_recipients(self, s_value: str) -> List[str]:
        if not isinstance(s_value, str):
            return []

        a_parts = re.split(r"[;,]", s_value)
        a_result = []

        for s_item in a_parts:
            s_item = s_item.strip()
            if s_item == "":
                continue
            a_result.append(s_item)

        return a_result

    def _is_valid_mail(self, s_value: str) -> bool:
        if not isinstance(s_value, str):
            return False

        s_value = s_value.strip()
        if s_value == "":
            return False

        return bool(re.match(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$", s_value))

    def _redact_sensitive_data(self, o_data: Dict[str, Any]) -> Dict[str, Any]:
        o_copy = copy.deepcopy(o_data)

        if "s_smtp_password" in o_copy:
            o_copy["s_smtp_password"] = "***"

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
