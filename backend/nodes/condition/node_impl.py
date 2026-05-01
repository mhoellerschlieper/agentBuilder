# file: backend/nodes/condition/node_impl.py
# description: Condition Node Implementierung mit zentral vorbereiteter Template Syntax
# und sicherer Auswertung von Regeln.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper
# - 2026-05-01: Doppelte Placeholder Aufloesung entfernt und auf zentral
#   aufgeloeste Node Daten umgestellt. author Marcus Schlieper
# - 2026-05-01: Sichere Operator Normalisierung und robustere Bool und Leerwert
#   Behandlung ergaenzt. author Marcus Schlieper
# author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import extract_primary_named_input


class ConditionNode(BaseNode):
    def get_node_type(self) -> str:
        return "condition"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "check_data",
                "s_description": "data for condition",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "true",
                "s_label": "true",
                "s_description": "true path",
            },
            {
                "s_key": "false",
                "s_label": "false",
                "s_description": "false path",
            },
            {
                "s_key": "output_main",
                "s_label": "result",
                "s_description": "result",
            },
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        # history:
        # - 2026-05-01: Die neue Template Syntax wird zentral im Workflow Runner
        #   aufgeloest. Diese Node arbeitet nur noch mit bereits vorbereiteten
        #   Daten. author Marcus Schlieper

        o_data = copy.deepcopy(o_context.node.get("data", {}))

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

            o_resolved_rule = copy.deepcopy(o_rule)

            s_rule_id = str(o_resolved_rule.get("s_id", "")).strip()
            o_left = o_resolved_rule.get(
                "if_left",
                o_resolved_rule.get("s_if_left", ""),
            )
            o_right = o_resolved_rule.get(
                "if_right",
                o_resolved_rule.get("s_if_right", ""),
            )
            s_operator = self._normalize_operator(
                o_resolved_rule.get(
                    "operator",
                    o_resolved_rule.get("s_operator", "equals"),
                )
            )

            b_rule_result = self._evaluate_condition_rule(
                o_left,
                s_operator,
                o_right,
            )

            o_evaluated_rule = copy.deepcopy(o_resolved_rule)
            o_evaluated_rule["b_result"] = b_rule_result
            o_evaluated_rule["s_operator"] = s_operator
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
            "inputs_used": copy.deepcopy(o_context.input_context),
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
            "value": o_main_output,
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
            return [o_rule for o_rule in a_rules if isinstance(o_rule, dict)]

        s_if_left = str(o_data.get("if_left", o_data.get("s_if_left", ""))).strip()
        s_operator = self._normalize_operator(
            o_data.get("operator", o_data.get("s_operator", "equals"))
        )
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

    def _normalize_operator(self, o_value: Any) -> str:
        s_operator = str(o_value).strip().lower()
        if s_operator == "":
            return "equals"
        return s_operator

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
            return self._is_empty_value(o_left)

        if s_operator == "is_not_empty":
            return not self._is_empty_value(o_left)

        if s_operator == "is_true":
            return self._to_bool(o_left) is True

        if s_operator == "is_false":
            return self._to_bool(o_left) is False

        raise ValueError("condition_operator_unsupported")

    def _is_empty_value(self, o_value: Any) -> bool:
        if o_value is None:
            return True

        if isinstance(o_value, str):
            return o_value.strip() == ""

        if isinstance(o_value, (list, tuple, dict, set)):
            return len(o_value) == 0

        return False

    def _to_bool(self, o_value: Any) -> bool:
        if isinstance(o_value, bool):
            return o_value

        s_value = str(o_value).strip().lower()
        if s_value in ["true", "1", "yes", "ja", "on"]:
            return True
        if s_value in ["false", "0", "no", "nein", "off", ""]:
            return False

        raise ValueError("condition_boolean_conversion_failed")

    def _to_float(self, o_value: Any) -> float:
        try:
            return float(str(o_value).strip())
        except Exception as o_exc:
            raise ValueError("condition_numeric_conversion_failed") from o_exc
