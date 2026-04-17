# file: backend/nodes/classifier/node_impl.py
# description: Classifier Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
import json
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import extract_primary_named_input, replace_input_placeholders, sanitize_handle_key


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
        d_temperature = float(str(o_data.get("d_temperature", "0")).strip() or "0")

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

        for o_class in a_normalized_classes:
            s_label_lower = str(o_class.get("s_label", "")).strip().lower()
            s_description_lower = str(o_class.get("s_description", "")).strip().lower()
            s_input_lower = s_input_text.lower()

            if s_label_lower != "" and s_label_lower in s_input_lower:
                s_selected_handle = str(o_class.get("s_handle_key", "default")).strip() or "default"
                s_selected_label = str(o_class.get("s_label", "default")).strip() or "default"
                s_selected_id = str(o_class.get("s_id", "")).strip()
                s_reason = "matched_label"
                break

            if s_description_lower != "" and s_description_lower in s_input_lower:
                s_selected_handle = str(o_class.get("s_handle_key", "default")).strip() or "default"
                s_selected_label = str(o_class.get("s_label", "default")).strip() or "default"
                s_selected_id = str(o_class.get("s_id", "")).strip()
                s_reason = "matched_description"
                break

        o_passthrough_output = copy.deepcopy(o_primary_input)
        if not isinstance(o_passthrough_output, dict):
            o_passthrough_output = {"value": o_passthrough_output}

        o_main_output = {
            **copy.deepcopy(o_passthrough_output),
            "selected_handle": s_selected_handle,
            "selected_class_label": s_selected_label,
            "selected_class_id": s_selected_id,
            "class_name": s_selected_label,
            "classifier_reason": s_reason,
            "classifier_input_text": s_input_text,
            "resolved_data": {
                **o_data,
                "s_prompt": s_prompt,
                "s_system_prompt": s_system_prompt,
                "s_provider": s_provider,
                "s_model_name": s_model_name,
                "d_temperature": d_temperature,
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
            },
        }

        for o_class in a_normalized_classes:
            s_handle_key = str(o_class.get("s_handle_key", "")).strip()
            if s_handle_key == "":
                continue

            d_node_outputs[s_handle_key] = {
                **copy.deepcopy(o_passthrough_output),
                "selected_handle": s_handle_key,
                "selected_class_label": str(o_class.get("s_label", "")).strip(),
                "selected_class_id": str(o_class.get("s_id", "")).strip(),
                "class_name": str(o_class.get("s_label", "")).strip(),
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
