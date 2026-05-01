# file: backend/services/template_variable_resolver.py
# description: Sichere Aufloesung der konsistenten Template Syntax im Backend.
# history:
# - 2026-05-01: Erste Version fuer input, output, node, global und workflow Zugriff erstellt. author Marcus Schlieper
# author Marcus Schlieper

import re
from typing import Any, Dict, List


def _get_safe_dict(o_value: Any) -> Dict[str, Any]:
    return o_value if isinstance(o_value, dict) else {}


def _parse_path_segments(s_path: str) -> List[str]:
    if not isinstance(s_path, str):
        return []

    a_result: List[str] = []
    for s_part in s_path.split("."):
        s_part = s_part.strip()
        if s_part == "":
            continue

        a_matches = re.findall(r"[^.$$]+|$(\d+)$", s_part)
        if not a_matches:
            a_result.append(s_part)
            continue

        for o_match in re.finditer(r"[^$$]+|$(\d+)$", s_part):
            s_token = o_match.group(0)
            if s_token.startswith("[") and s_token.endswith("]"):
                s_token = s_token[1:-1].strip()
            else:
                s_token = s_token.strip()

            if s_token != "":
                a_result.append(s_token)

    return a_result


def _get_nested_value(o_value: Any, s_path: str) -> Any:
    if not isinstance(s_path, str) or s_path.strip() == "":
        return o_value

    o_current = o_value
    a_segments = _parse_path_segments(s_path)

    for s_segment in a_segments:
        if o_current is None:
            return None

        if isinstance(o_current, list):
            if not s_segment.isdigit():
                return None
            i_index = int(s_segment)
            if i_index < 0 or i_index >= len(o_current):
                return None
            o_current = o_current[i_index]
            continue

        if not isinstance(o_current, dict):
            return None

        if s_segment not in o_current:
            return None

        o_current = o_current[s_segment]

    return o_current


def _stringify_safe(o_value: Any) -> str:
    if o_value is None:
        return ""

    if isinstance(o_value, (str, int, float, bool)):
        return str(o_value)

    try:
        import json
        return json.dumps(o_value, ensure_ascii=True)
    except Exception:
        return ""


def resolve_template_variable(
    s_expression: str,
    o_current_node_context: Dict[str, Any],
    d_results_by_node_id: Dict[str, Dict[str, Any]],
    d_global_values: Dict[str, Any],
    d_workflow_values: Dict[str, Any],
) -> Any:
    s_safe_expression = str(s_expression).strip()
    if s_safe_expression == "" or ":" not in s_safe_expression:
        return None

    s_scope, s_body = s_safe_expression.split(":", 1)
    s_scope = s_scope.strip()
    s_body = s_body.strip()

    if s_scope == "input":
        d_named_inputs = _get_safe_dict(o_current_node_context.get("named_inputs", {}))
        return _get_nested_value(d_named_inputs, s_body)

    if s_scope == "output":
        d_current_result = _get_safe_dict(o_current_node_context.get("current_result", {}))
        d_output_meta = _get_safe_dict(d_current_result.get("output_meta", {}))
        d_node_outputs = _get_safe_dict(d_output_meta.get("node_outputs", {}))
        return _get_nested_value(d_node_outputs, s_body)

    if s_scope == "global":
        return _get_nested_value(_get_safe_dict(d_global_values), s_body)

    if s_scope == "workflow":
        return _get_nested_value(_get_safe_dict(d_workflow_values), s_body)

    if s_scope == "node":
        if "." not in s_body:
            return None

        s_node_id, s_node_path = s_body.split(".", 1)
        s_node_id = s_node_id.strip()
        s_node_path = s_node_path.strip()

        d_node_wrapper = _get_safe_dict(d_results_by_node_id.get(s_node_id, {}))
        d_node_result = _get_safe_dict(d_node_wrapper.get("result", {}))
        d_node_inputs = _get_safe_dict(d_node_wrapper.get("inputs", {}))
        d_output_meta = _get_safe_dict(d_node_result.get("output_meta", {}))
        d_node_outputs = _get_safe_dict(d_output_meta.get("node_outputs", {}))

        d_runtime_view = {
            "input": _get_safe_dict(d_node_inputs.get("named_inputs", {})),
            "output": d_node_outputs,
            "result": d_node_result,
            "status": d_node_wrapper.get("status"),
        }
        return _get_nested_value(d_runtime_view, s_node_path)

    return None


def resolve_template_text(
    s_template: str,
    o_current_node_context: Dict[str, Any],
    d_results_by_node_id: Dict[str, Dict[str, Any]],
    d_global_values: Dict[str, Any],
    d_workflow_values: Dict[str, Any],
) -> str:
    s_safe_template = str(s_template or "")

    def _replace(o_match: re.Match[str]) -> str:
        s_expression = o_match.group(1)
        o_value = resolve_template_variable(
            s_expression=s_expression,
            o_current_node_context=o_current_node_context,
            d_results_by_node_id=d_results_by_node_id,
            d_global_values=d_global_values,
            d_workflow_values=d_workflow_values,
        )
        return _stringify_safe(o_value)

    return re.sub(r"\{\{([^{}]+)\}\}", _replace, s_safe_template)
