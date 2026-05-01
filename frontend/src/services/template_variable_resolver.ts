/* file: frontend/src/services/template_variable_resolver.ts
description: Resolver fuer konsistente Template Syntax im Frontend.
history:
- 2026-05-01: Erste Version fuer input, output, node, global und workflow Zugriff erstellt. author Marcus Schlieper
author Marcus Schlieper
*/

export type TRecord = Record<string, unknown>;

export type TTemplateResolverContext = {
  o_current_node?: TRecord;
  o_nodes_by_id?: Record<string, TRecord>;
  o_global_values?: Record<string, unknown>;
  o_workflow?: Record<string, unknown>;
};

function get_safe_record(o_value: unknown): TRecord {
  return o_value && typeof o_value === "object" ? (o_value as TRecord) : {};
}

function parse_path_segments(s_path: string): string[] {
  if (typeof s_path !== "string") {
    return [];
  }

  const a_result: string[] = [];
  const a_parts = s_path.split(".");

  for (const s_part of a_parts) {
    const s_trimmed = s_part.trim();
    if (s_trimmed === "") {
      continue;
    }

    const o_matches = s_trimmed.match(/[^[$]+|$(\d+)$/g);
    if (!o_matches) {
      a_result.push(s_trimmed);
      continue;
    }

    for (const s_match of o_matches) {
      const s_clean = s_match.replace(/^$/, "").replace(/$$/, "").trim();
      if (s_clean !== "") {
        a_result.push(s_clean);
      }
    }
  }

  return a_result;
}

function get_nested_value(o_value: unknown, s_path: string): unknown {
  if (typeof s_path !== "string" || s_path.trim() === "") {
    return o_value;
  }

  let o_current: unknown = o_value;
  const a_segments = parse_path_segments(s_path);

  for (const s_segment of a_segments) {
    if (o_current === null || typeof o_current === "undefined") {
      return undefined;
    }

    if (Array.isArray(o_current)) {
      const i_index = Number.parseInt(s_segment, 10);
      if (!Number.isInteger(i_index) || i_index < 0 || i_index >= o_current.length) {
        return undefined;
      }
      o_current = o_current[i_index];
      continue;
    }

    if (typeof o_current !== "object") {
      return undefined;
    }

    const o_record = o_current as TRecord;
    if (!(s_segment in o_record)) {
      return undefined;
    }

    o_current = o_record[s_segment];
  }

  return o_current;
}

function stringify_safe(o_value: unknown): string {
  if (o_value === null || typeof o_value === "undefined") {
    return "";
  }

  if (
    typeof o_value === "string" ||
    typeof o_value === "number" ||
    typeof o_value === "boolean" ||
    typeof o_value === "bigint"
  ) {
    return String(o_value);
  }

  try {
    return JSON.stringify(o_value);
  } catch {
    return "";
  }
}

function get_current_node_input_map(o_current_node: TRecord): TRecord {
  const o_data = get_safe_record(o_current_node.data);
  const o_named_inputs = get_safe_record(o_data.input_values);
  if (Object.keys(o_named_inputs).length > 0) {
    return o_named_inputs;
  }

  const o_result = get_safe_record(o_data.result || o_data.o_result || o_data.runtime_result);
  return get_safe_record(o_result.inputs);
}

function get_current_node_output_map(o_current_node: TRecord): TRecord {
  const o_data = get_safe_record(o_current_node.data);
  const o_output_values = get_safe_record(o_data.output_values);
  if (Object.keys(o_output_values).length > 0) {
    return o_output_values;
  }

  const o_result = get_safe_record(o_data.result || o_data.o_result || o_data.runtime_result);
  const o_output = get_safe_record(o_result.output);
  return {
    output_main: o_output,
  };
}

function get_node_runtime_view(o_node: TRecord): TRecord {
  const o_data = get_safe_record(o_node.data);
  const o_result = get_safe_record(o_data.result || o_data.o_result || o_data.runtime_result);

  return {
    input: get_safe_record(o_data.input_values),
    output: get_safe_record(o_data.output_values),
    result: o_result,
    status: o_data.s_runtime_status,
  };
}

export function resolve_template_variable(
  s_expression: string,
  o_context: TTemplateResolverContext
): unknown {
  const s_safe_expression = typeof s_expression === "string" ? s_expression.trim() : "";
  if (s_safe_expression === "") {
    return undefined;
  }

  const i_separator = s_safe_expression.indexOf(":");
  if (i_separator <= 0) {
    return undefined;
  }

  const s_scope = s_safe_expression.slice(0, i_separator).trim();
  const s_body = s_safe_expression.slice(i_separator + 1).trim();

  if (s_scope === "input") {
    const o_current_node = get_safe_record(o_context.o_current_node);
    const o_input_map = get_current_node_input_map(o_current_node);
    return get_nested_value(o_input_map, s_body);
  }

  if (s_scope === "output") {
    const o_current_node = get_safe_record(o_context.o_current_node);
    const o_output_map = get_current_node_output_map(o_current_node);
    return get_nested_value(o_output_map, s_body);
  }

  if (s_scope === "global") {
    return get_nested_value(get_safe_record(o_context.o_global_values), s_body);
  }

  if (s_scope === "workflow") {
    return get_nested_value(get_safe_record(o_context.o_workflow), s_body);
  }

  if (s_scope === "node") {
    const i_first_dot = s_body.indexOf(".");
    if (i_first_dot <= 0) {
      return undefined;
    }

    const s_node_id = s_body.slice(0, i_first_dot).trim();
    const s_node_path = s_body.slice(i_first_dot + 1).trim();
    const o_nodes_by_id = o_context.o_nodes_by_id || {};
    const o_node = get_safe_record(o_nodes_by_id[s_node_id]);
    const o_runtime_view = get_node_runtime_view(o_node);

    return get_nested_value(o_runtime_view, s_node_path);
  }

  return undefined;
}

export function resolve_template_string(
  s_template: string,
  o_context: TTemplateResolverContext
): string {
  if (typeof s_template !== "string" || s_template.trim() === "") {
    return "";
  }

  return s_template.replace(/\{\{([^{}]+)\}\}/g, (_s_match: string, s_expression: string) => {
    const o_resolved = resolve_template_variable(s_expression, o_context);
    return stringify_safe(o_resolved);
  });
}
