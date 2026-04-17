# file: backend/nodes/condition/node_impl.py
# description: Condition Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import extract_primary_named_input, replace_input_placeholders


class ConditionNode(BaseNode):
    def get_node_type(self) -> str:
        return "condition"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "check_data", "s_description": "data for condition"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "true", "s_label": "true", "s_description": "true path"},
            {"s_key": "false", "s_label": "false", "s_description": "false path"},
            {"s_key": "output_main", "s_label": "result", "s_description": "result"},
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        a_rules = self._build_condition_rules_from_data(o_data)
        if not isinstance(a_rules, list) or len(a_rules) == 0:
            raise ValueError("condition_rules_invalid")

        b_final_result = False
        s_matched_rule_id = ""
        a_condition_outputs: List[str] = []
        a_evaluated_rules: List[Dict[str, Any]] = []
        o_primary_input = extract_primary_named_input(o_context.input_context)

        for o_rule in a_rules:
            if not isinstance(o_rule, dict):
                continue

            o_resolved_rule = replace_input_placeholders(
                copy.deepcopy(o_rule),
                o_context.input_context,
            )

            s_rule_id = str(o_resolved_rule.get("s_id", "")).strip()
            o_left = o_resolved_rule.get("if_left", o_resolved_rule.get("s_if_left", ""))
            o_right = o_resolved_rule.get("if_right", o_resolved_rule.get("s_if_right", ""))
            s_operator = str(
                o_resolved_rule.get("operator", o_resolved_rule.get("s_operator", "equals"))
            ).strip().lower()

            b_rule_result = self._evaluate_condition_rule(o_left, s_operator, o_right)
            o_evaluated_rule = copy.deepcopy(o_resolved_rule)
            o_evaluated_rule["b_result"] = b_rule_result
            a_evaluated_rules.append(o_evaluated_rule)

            if b_rule_result and not b_final_result:
                b_final_result = True
                s_matched_rule_id = s_rule_id
                break

        s_routing_handle = "true" if b_final_result else "false"
        a_condition_outputs.append(s_routing_handle)

        o_passthrough_output = copy.deepcopy(o_primary_input)
        if not isinstance(o_passthrough_output, dict):
            o_passthrough_output = {"value": o_passthrough_output}

        o_main_output = {
            **copy.deepcopy(o_passthrough_output),
            "condition_result": b_final_result,
            "routing_handle": s_routing_handle,
            "matched_rule_id": s_matched_rule_id,
            "s_output": a_condition_outputs,
            "resolved_data": {
                **o_data,
                "rules": a_evaluated_rules,
            },
            "inputs_used": o_context.input_context,
        }

        o_true_output = {
            **copy.deepcopy(o_passthrough_output),
            "condition_result": True,
            "routing_handle": "true",
            "matched_rule_id": s_matched_rule_id,
        }

        o_false_output = {
            **copy.deepcopy(o_passthrough_output),
            "condition_result": False,
            "routing_handle": "false",
            "matched_rule_id": s_matched_rule_id,
        }

        return {
            "message": "condition_evaluated",
            "output": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "result",
                "node_outputs": {
                    "output_main": o_main_output,
                    "true": o_true_output,
                    "false": o_false_output,
                },
            },
        }

    def _build_condition_rules_from_data(self, o_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        a_rules = o_data.get("rules", [])
        if isinstance(a_rules, list) and len(a_rules) > 0:
            return a_rules

        s_if_left = str(o_data.get("if_left", o_data.get("s_if_left", ""))).strip()
        s_operator = str(o_data.get("operator", o_data.get("s_operator", "equals"))).strip().lower()
        s_if_right = str(o_data.get("if_right", o_data.get("s_if_right", ""))).strip()

        if s_if_left == "" and s_if_right == "":
            return []

        return [
            {
                "s_id": "rule_1",
                "if_left": s_if_left,
                "operator": s_operator,
                "if_right": s_if_right,
            }
        ]

    def _evaluate_condition_rule(self, o_left: Any, s_operator: str, o_right: Any) -> bool:
        if s_operator == "equals":
            return str(o_left) == str(o_right)
        if s_operator == "not_equals":
            return str(o_left) != str(o_right)
        if s_operator == "contains":
            return str(o_right) in str(o_left)
        if s_operator == "not_contains":
            return str(o_right) not in str(o_left)
        if s_operator == "starts_with":
            return str(o_left).startswith(str(o_right))
        if s_operator == "ends_with":
            return str(o_left).endswith(str(o_right))
        if s_operator == "greater_than":
            return self._to_float(o_left) > self._to_float(o_right)
        if s_operator == "greater_or_equals":
            return self._to_float(o_left) >= self._to_float(o_right)
        if s_operator == "less_than":
            return self._to_float(o_left) < self._to_float(o_right)
        if s_operator == "less_or_equals":
            return self._to_float(o_left) <= self._to_float(o_right)
        if s_operator == "is_empty":
            return str(o_left).strip() == ""
        if s_operator == "is_not_empty":
            return str(o_left).strip() != ""
        raise ValueError("condition_operator_unsupported")

    def _to_float(self, o_value: Any) -> float:
        try:
            return float(str(o_value).strip())
        except Exception as o_exc:
            raise ValueError("condition_numeric_conversion_failed") from o_exc
