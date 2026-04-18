# file: backend/nodes/classifier/node_impl.py
# description: Classifier Node Implementierung mit optionaler LLM-Klassifikation.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper
# - 2026-04-17: Erweiterung um stabile LLM-Klassifikation mit JSON-Schema, Confidence, Similarity-Matching und sauberer Fehlerbehandlung. author ChatGPT
# - 2026-04-18: Default-Fallback bei zu niedriger LLM-Confidence und parallele Output-Handles. author ChatGPT

import copy
import difflib
import json
from typing import Any, Dict, List, Optional, Tuple

from tools.LLM import llmTextGen
from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    extract_primary_named_input,
    replace_input_placeholders,
    sanitize_handle_key,
)


class ClassifierLlmError(Exception):
    def __init__(self, s_error_type: str, s_message: str):
        super().__init__(s_message)
        self.s_error_type = s_error_type
        self.s_message = s_message


class ClassifierLlmTimeoutError(ClassifierLlmError):
    pass


class ClassifierLlmResponseError(ClassifierLlmError):
    pass


class ClassifierLlmNoMatchError(ClassifierLlmError):
    pass


class ClassifierNode(BaseNode):
    def get_node_type(self) -> str:
        return "classifier"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "input", "s_description": "data for classifier"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "default", "s_label": "default", "s_description": "fallback output"},
            {"s_key": "output_main", "s_label": "result", "s_description": "classifier result"},
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        a_classes = o_data.get("classes", [])
        if not isinstance(a_classes, list) or len(a_classes) == 0:
            raise ValueError("classifier_classes_required")

        s_prompt = str(o_data.get("s_prompt", "")).strip()
        s_system_prompt = str(o_data.get("s_system_prompt", "")).strip()
        s_provider = str(o_data.get("s_provider", "openai")).strip().lower()
        s_model_name = str(o_data.get("s_model_name", "")).strip()
        s_api_key = str(o_data.get("s_api_key", "")).strip()
        s_api_host = str(o_data.get("s_api_host", "")).strip()
        d_temperature = float(str(o_data.get("d_temperature", "0")).strip() or "0")
        i_timeout = int(o_data.get("i_timeout", 20000) or 20000)
        i_max_completion_tokens = int(o_data.get("max_completion_tokens", 2000) or 2000)
        d_similarity_threshold = float(str(o_data.get("d_similarity_threshold", "0.72")).strip() or "0.72")
        d_min_confidence_threshold = float(
            str(o_data.get("d_min_confidence_threshold", "0.75")).strip() or "0.75"
        )

        o_primary_input = extract_primary_named_input(o_context.input_context)
        s_input_text = self._stringify_classifier_input(o_primary_input)

        a_normalized_classes: List[Dict[str, Any]] = []

        for i_index, o_class in enumerate(a_classes):
            if not isinstance(o_class, dict):
                continue

            s_label = str(o_class.get("s_label", "")).strip()
            s_description = str(o_class.get("s_description", "")).strip()
            s_id = str(o_class.get("s_id", "")).strip() or f"class_{i_index + 1}"

            if s_label == "":
                s_label = f"class_{i_index + 1}"

            s_handle_key = sanitize_handle_key(f"class_{i_index + 1}")

            a_normalized_classes.append(
                {
                    "s_id": s_id,
                    "s_label": s_label,
                    "s_description": s_description,
                    "s_handle_key": s_handle_key,
                }
            )

        if len(a_normalized_classes) == 0:
            raise ValueError("classifier_classes_invalid")

        s_selected_handle = "default"
        s_selected_label = "default"
        s_selected_id = ""
        s_reason = "no_match"
        s_classifier_mode = "keyword"

        o_llm_meta: Dict[str, Any] = {
            "used": False,
            "success": False,
            "raw_response": "",
            "token_usage": None,
            "error_type": "",
            "error_message": "",
            "matched_by": "",
            "schema_used": False,
        }

        d_confidence = 0.0

        if s_model_name != "":
            try:
                (
                    s_selected_handle,
                    s_selected_label,
                    s_selected_id,
                    s_reason,
                    d_confidence,
                    o_llm_meta,
                ) = self._classify_with_llm(
                    s_input_text=s_input_text,
                    a_classes=a_normalized_classes,
                    s_prompt=s_prompt,
                    s_system_prompt=s_system_prompt,
                    s_provider=s_provider,
                    s_model_name=s_model_name,
                    s_api_key=s_api_key,
                    s_api_host=s_api_host,
                    d_temperature=d_temperature,
                    i_timeout=i_timeout,
                    i_max_completion_tokens=i_max_completion_tokens,
                    d_similarity_threshold=d_similarity_threshold,
                )
                s_classifier_mode = "llm"

                if d_confidence < d_min_confidence_threshold:
                    s_selected_handle = "default"
                    s_selected_label = "default"
                    s_selected_id = ""
                    s_reason = "llm_confidence_below_threshold"
                    o_llm_meta["success"] = False
                    o_llm_meta["error_type"] = "llm_confidence_too_low"
                    o_llm_meta["error_message"] = (
                        f"LLM confidence {d_confidence} liegt unter dem Schwellwert "
                        f"{d_min_confidence_threshold}."
                    )
                    o_llm_meta["matched_by"] = ""
                    s_classifier_mode = "llm_default_fallback"
                    d_confidence = 0.0

            except ClassifierLlmError as o_exc:
                o_llm_meta = {
                    "used": True,
                    "success": False,
                    "raw_response": o_llm_meta.get("raw_response", ""),
                    "token_usage": o_llm_meta.get("token_usage"),
                    "error_type": o_exc.s_error_type,
                    "error_message": o_exc.s_message,
                    "matched_by": "",
                    "schema_used": True,
                }
                (
                    s_selected_handle,
                    s_selected_label,
                    s_selected_id,
                    s_reason,
                    d_confidence,
                ) = self._classify_with_keywords(
                    s_input_text=s_input_text,
                    a_normalized_classes=a_normalized_classes,
                )
                s_classifier_mode = "keyword_fallback"

        if s_model_name == "":
            (
                s_selected_handle,
                s_selected_label,
                s_selected_id,
                s_reason,
                d_confidence,
            ) = self._classify_with_keywords(
                s_input_text=s_input_text,
                a_normalized_classes=a_normalized_classes,
            )

        o_passthrough_output = copy.deepcopy(o_primary_input)
        if not isinstance(o_passthrough_output, dict):
            o_passthrough_output = {"value": o_passthrough_output}

        a_active_output_handles = self._build_active_output_handles(
            s_selected_handle=s_selected_handle,
        )

        o_main_output = {
            **copy.deepcopy(o_passthrough_output),
            "selected_handle": s_selected_handle,
            "selected_class_label": s_selected_label,
            "selected_class_id": s_selected_id,
            "class_name": s_selected_label,
            "classifier_class_name": s_selected_label,
            "classifier_reason": s_reason,
            "classifier_mode": s_classifier_mode,
            "classifier_input_text": s_input_text,
            "confidence_score": d_confidence,
            "active_output_handles": a_active_output_handles,
            "llm_meta": o_llm_meta,
            "resolved_data": {
                **o_data,
                "s_prompt": s_prompt,
                "s_system_prompt": s_system_prompt,
                "s_provider": s_provider,
                "s_model_name": s_model_name,
                "s_api_key": "***" if s_api_key != "" else "",
                "s_api_host": s_api_host,
                "d_temperature": d_temperature,
                "i_timeout": i_timeout,
                "max_completion_tokens": i_max_completion_tokens,
                "d_similarity_threshold": d_similarity_threshold,
                "d_min_confidence_threshold": d_min_confidence_threshold,
                "classes": a_normalized_classes,
            },
            "inputs_used": o_context.input_context,
        }

        d_node_outputs: Dict[str, Any] = {
            "output_main": o_main_output,
            "default": {
                **copy.deepcopy(o_passthrough_output),
                "selected_handle": "default",
                "selected_class_label": "default",
                "selected_class_id": "",
                "class_name": "default",
                "classifier_class_name": "default",
                "confidence_score": 0.0,
                "active_output_handles": ["output_main", "default"],
            },
        }

        for o_class in a_normalized_classes:
            s_handle_key = str(o_class.get("s_handle_key", "")).strip()
            if s_handle_key == "":
                continue

            s_class_label = str(o_class.get("s_label", "")).strip()
            s_class_id = str(o_class.get("s_id", "")).strip()

            d_node_outputs[s_handle_key] = {
                **copy.deepcopy(o_passthrough_output),
                "selected_handle": s_handle_key,
                "selected_class_label": s_class_label,
                "selected_class_id": s_class_id,
                "class_name": s_class_label,
                "classifier_class_name": s_class_label,
                "active_output_handles": ["output_main", s_handle_key],
            }

        return {
            "message": "classifier_node_ok",
            "output": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "result",
                "node_outputs": d_node_outputs,
            },
        }

    def _build_active_output_handles(
        self,
        s_selected_handle: str,
    ) -> List[str]:
        a_handles: List[str] = ["output_main"]
        s_safe_selected_handle = sanitize_handle_key(s_selected_handle)

        if s_safe_selected_handle != "" and s_safe_selected_handle not in a_handles:
            a_handles.append(s_safe_selected_handle)

        return a_handles

    def _classify_with_keywords(
        self,
        s_input_text: str,
        a_normalized_classes: List[Dict[str, Any]],
    ) -> Tuple[str, str, str, str, float]:
        s_selected_handle = "default"
        s_selected_label = "default"
        s_selected_id = ""
        s_reason = "no_match"
        d_confidence = 0.0

        s_input_lower = s_input_text.lower()

        for o_class in a_normalized_classes:
            s_label_lower = str(o_class.get("s_label", "")).strip().lower()
            s_description_lower = str(o_class.get("s_description", "")).strip().lower()

            if s_label_lower != "" and s_label_lower in s_input_lower:
                s_selected_handle = str(o_class.get("s_handle_key", "default")).strip() or "default"
                s_selected_label = str(o_class.get("s_label", "default")).strip() or "default"
                s_selected_id = str(o_class.get("s_id", "")).strip()
                s_reason = "matched_label"
                d_confidence = 0.8
                break

            if s_description_lower != "" and s_description_lower in s_input_lower:
                s_selected_handle = str(o_class.get("s_handle_key", "default")).strip() or "default"
                s_selected_label = str(o_class.get("s_label", "default")).strip() or "default"
                s_selected_id = str(o_class.get("s_id", "")).strip()
                s_reason = "matched_description"
                d_confidence = 0.7
                break

        return s_selected_handle, s_selected_label, s_selected_id, s_reason, d_confidence

    def _classify_with_llm(
        self,
        s_input_text: str,
        a_classes: List[Dict[str, Any]],
        s_prompt: str,
        s_system_prompt: str,
        s_provider: str,
        s_model_name: str,
        s_api_key: str,
        s_api_host: str,
        d_temperature: float,
        i_timeout: int,
        i_max_completion_tokens: int,
        d_similarity_threshold: float,
    ) -> Tuple[str, str, str, str, float, Dict[str, Any]]:
        o_llm_meta: Dict[str, Any] = {
            "used": True,
            "success": False,
            "raw_response": "",
            "token_usage": None,
            "error_type": "",
            "error_message": "",
            "matched_by": "",
            "schema_used": True,
        }

        a_class_payload = []
        for o_class in a_classes:
            a_class_payload.append(
                {
                    "s_id": str(o_class.get("s_id", "")).strip(),
                    "s_label": str(o_class.get("s_label", "")).strip(),
                    "s_description": str(o_class.get("s_description", "")).strip(),
                    "s_handle_key": str(o_class.get("s_handle_key", "")).strip(),
                }
            )

        o_response_schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "classifier_result",
                "schema": {
                    "type": "object",
                    "properties": {
                        "s_id": {"type": "string"},
                        "s_label": {"type": "string"},
                        "s_handle_key": {"type": "string"},
                        "reason": {"type": "string"},
                        "confidence_score": {"type": "number"},
                    },
                    "required": ["s_label", "reason", "confidence_score"],
                    "additionalProperties": False,
                },
            },
        }

        s_default_system_prompt = (
            "Du bist ein Klassifikationssystem. "
            "Wähle genau eine passende Klasse aus der Liste. "
            "Wenn kein exakter Treffer vorhanden ist, wähle die ähnlichste passende Klasse. "
            "Nutze nur Werte aus der Klassenliste."
        )

        s_effective_system_prompt = (
            s_system_prompt + "\n" + s_default_system_prompt
            if s_system_prompt != ""
            else s_default_system_prompt
        )

        s_default_prompt = (
            "Klassifiziere den folgenden Eingabetext in genau eine Klasse.\n\n"
            f"Klassen:\n{json.dumps(a_class_payload, ensure_ascii=True)}\n\n"
            f"Eingabe:\n{s_input_text}\n\n"
            "Gib das Ergebnis strukturiert zurück."
        )

        s_effective_prompt = (
            s_prompt + "\n" + s_default_prompt
            if s_prompt != ""
            else s_default_prompt
        )

        a_messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": s_effective_system_prompt,
            },
            {
                "role": "user",
                "content": s_effective_prompt,
            },
        ]

        try:
            s_response_text, d_token = llmTextGen(
                model=s_model_name,
                messages=a_messages,
                max_completion_tokens=i_max_completion_tokens,
                timeout=i_timeout,
                response_format=o_response_schema,
                s_provider=s_provider,
                s_endpoint_url=s_api_host if s_provider == "endpoint" else "",
                s_endpoint_api_key=s_api_key if s_provider == "endpoint" else "",
                d_endpoint_headers=None,
            )
        except TimeoutError as o_exc:
            raise ClassifierLlmTimeoutError("llm_timeout", str(o_exc))
        except Exception as o_exc:
            s_message = str(o_exc).lower()
            if "timeout" in s_message:
                raise ClassifierLlmTimeoutError("llm_timeout", str(o_exc))
            raise ClassifierLlmError("llm_request_failed", str(o_exc))

        o_llm_meta["raw_response"] = s_response_text
        o_llm_meta["token_usage"] = d_token

        try:
            o_parsed = self._parse_llm_json_response(s_response_text)
        except Exception as o_exc:
            raise ClassifierLlmResponseError("llm_invalid_response", str(o_exc))

        s_selected_id = str(o_parsed.get("s_id", "")).strip()
        s_selected_label = str(o_parsed.get("s_label", "")).strip()
        s_selected_handle = str(o_parsed.get("s_handle_key", "")).strip()
        s_reason = str(o_parsed.get("reason", "llm_match")).strip() or "llm_match"

        try:
            d_confidence = float(o_parsed.get("confidence_score", 0.0))
        except Exception:
            d_confidence = 0.0

        if d_confidence < 0:
            d_confidence = 0.0
        if d_confidence > 1:
            d_confidence = 1.0

        o_match, s_matched_by, d_similarity_score = self._find_matching_class_with_similarity(
            a_classes=a_classes,
            s_id=s_selected_id,
            s_label=s_selected_label,
            s_handle_key=s_selected_handle,
            d_similarity_threshold=d_similarity_threshold,
        )

        if o_match is None:
            raise ClassifierLlmNoMatchError(
                "llm_class_not_found",
                "LLM-Antwort passt auf keine definierte Klasse.",
            )

        if s_matched_by == "similarity" and d_confidence < d_similarity_score:
            d_confidence = d_similarity_score

        o_llm_meta["success"] = True
        o_llm_meta["matched_by"] = s_matched_by

        return (
            str(o_match.get("s_handle_key", "default")).strip() or "default",
            str(o_match.get("s_label", "default")).strip() or "default",
            str(o_match.get("s_id", "")).strip(),
            s_reason,
            d_confidence,
            o_llm_meta,
        )

    def _parse_llm_json_response(self, s_response_text: str) -> Dict[str, Any]:
        s_clean = s_response_text.strip()
        if s_clean == "":
            raise ValueError("empty_llm_response")

        o_parsed = json.loads(s_clean)
        if not isinstance(o_parsed, dict):
            raise ValueError("llm_response_not_object")

        return o_parsed

    def _find_matching_class_with_similarity(
        self,
        a_classes: List[Dict[str, Any]],
        s_id: str,
        s_label: str,
        s_handle_key: str,
        d_similarity_threshold: float,
    ) -> Tuple[Optional[Dict[str, Any]], str, float]:
        for o_class in a_classes:
            if s_id != "" and str(o_class.get("s_id", "")).strip() == s_id:
                return o_class, "id", 1.0

        for o_class in a_classes:
            if s_handle_key != "" and str(o_class.get("s_handle_key", "")).strip() == s_handle_key:
                return o_class, "handle_key", 1.0

        s_label_lower = s_label.strip().lower()

        if s_label_lower != "":
            for o_class in a_classes:
                if str(o_class.get("s_label", "")).strip().lower() == s_label_lower:
                    return o_class, "label_exact", 1.0

        if s_label_lower != "":
            o_best_match = None
            d_best_score = 0.0

            for o_class in a_classes:
                s_candidate = str(o_class.get("s_label", "")).strip().lower()
                if s_candidate == "":
                    continue

                d_score = difflib.SequenceMatcher(None, s_label_lower, s_candidate).ratio()
                if d_score > d_best_score:
                    d_best_score = d_score
                    o_best_match = o_class

            if o_best_match is not None and d_best_score >= d_similarity_threshold:
                return o_best_match, "similarity", d_best_score

        return None, "", 0.0

    def _stringify_classifier_input(self, o_value: Any) -> str:
        if isinstance(o_value, dict):
            if "value" in o_value:
                return str(o_value.get("value", ""))
            try:
                return json.dumps(o_value, ensure_ascii=True)
            except Exception:
                return str(o_value)

        if isinstance(o_value, list):
            try:
                return json.dumps(o_value, ensure_ascii=True)
            except Exception:
                return str(o_value)

        if o_value is None:
            return ""

        return str(o_value)
