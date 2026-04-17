/* file: src/types/tool_registry.ts
description: Typen und Hilfsfunktionen fuer Tool Registry mit Gruppe, Untergruppe und Icon.
history:
- 2026-03-28: Erstellt fuer dynamische Tool Nodes. author Marcus Schlieper
- 2026-03-29: Felder fuer Gruppe, Untergruppe und Icon ergaenzt. author Marcus Schlieper
author Marcus Schlieper
*/

export interface IToolFieldOption {
  s_label: string;
  s_value: string;
}

export type TToolFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "variable_select";

export interface IToolFieldDefinition {
  s_key: string;
  s_label: string;
  s_field_type: TToolFieldType;
  b_required?: boolean;
  s_default?: string;
  d_default?: number;
  d_min?: number;
  d_max?: number;
  a_options?: IToolFieldOption[];
  a_allowed_types?: string[];
}

export interface IToolNodeSchema {
  s_type: string;
  s_label: string;
  s_category?: string;
  s_group: string;
  s_subgroup: string;
  s_icon: string;
  s_description?: string;
  s_class_name: string;
  a_input_handles: string[];
  a_output_handles: string[];
  a_fields: IToolFieldDefinition[];
}

export interface IToolRegistryPayload {
  a_tools: unknown[];
}

export interface IToolNodeData {
  s_label: string;
  s_tool_type: string;
  s_schema_version: string;
  [key: string]: unknown;
}

export function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitize_tool_node_schema(
  value: unknown
): IToolNodeSchema | null {
  if (!is_record(value)) {
    return null;
  }

  const s_type = typeof value.s_type === "string" ? value.s_type.trim() : "";
  const s_label = typeof value.s_label === "string" ? value.s_label.trim() : "";
  const s_group =
    typeof value.s_group === "string" && value.s_group.trim() !== ""
      ? value.s_group.trim()
      : "General";
  const s_subgroup =
    typeof value.s_subgroup === "string" && value.s_subgroup.trim() !== ""
      ? value.s_subgroup.trim()
      : "Default";
  const s_icon =
    typeof value.s_icon === "string" && value.s_icon.trim() !== ""
      ? value.s_icon.trim()
      : "tool";
  const s_category =
    typeof value.s_category === "string" ? value.s_category.trim() : "";
  const s_description =
    typeof value.s_description === "string" ? value.s_description : "";
  const s_class_name =
    typeof value.s_class_name === "string" && value.s_class_name.trim() !== ""
      ? value.s_class_name.trim()
      : "node_tool";

  const a_input_handles = Array.isArray(value.a_input_handles)
    ? value.a_input_handles.filter(
        (o_item): o_item is string =>
          typeof o_item === "string" && o_item.trim() !== ""
      )
    : ["input"];

  const a_output_handles = Array.isArray(value.a_output_handles)
    ? value.a_output_handles.filter(
        (o_item): o_item is string =>
          typeof o_item === "string" && o_item.trim() !== ""
      )
    : ["output"];

  const a_fields = Array.isArray(value.a_fields)
    ? value.a_fields
        .filter((o_item) => is_record(o_item))
        .map((o_item) => {
          const a_options = Array.isArray(o_item.a_options)
            ? o_item.a_options
                .filter((o_option) => is_record(o_option))
                .map((o_option) => ({
                  s_label:
                    typeof o_option.s_label === "string"
                      ? o_option.s_label
                      : "",
                  s_value:
                    typeof o_option.s_value === "string"
                      ? o_option.s_value
                      : "",
                }))
                .filter(
                  (o_option) =>
                    o_option.s_label.trim() !== "" &&
                    o_option.s_value.trim() !== ""
                )
            : undefined;

          return {
            s_key:
              typeof o_item.s_key === "string" ? o_item.s_key.trim() : "",
            s_label:
              typeof o_item.s_label === "string" ? o_item.s_label.trim() : "",
            s_field_type:
              typeof o_item.s_field_type === "string"
                ? (o_item.s_field_type as TToolFieldType)
                : "text",
            b_required: Boolean(o_item.b_required),
            s_default:
              typeof o_item.s_default === "string" ? o_item.s_default : "",
            d_default:
              typeof o_item.d_default === "number" && Number.isFinite(o_item.d_default)
                ? o_item.d_default
                : undefined,
            d_min:
              typeof o_item.d_min === "number" && Number.isFinite(o_item.d_min)
                ? o_item.d_min
                : undefined,
            d_max:
              typeof o_item.d_max === "number" && Number.isFinite(o_item.d_max)
                ? o_item.d_max
                : undefined,
            a_options,
            a_allowed_types: Array.isArray(o_item.a_allowed_types)
              ? o_item.a_allowed_types.filter(
                  (o_allowed): o_allowed is string =>
                    typeof o_allowed === "string" && o_allowed.trim() !== ""
                )
              : undefined,
          } as IToolFieldDefinition;
        })
        .filter(
          (o_item) =>
            o_item.s_key.trim() !== "" && o_item.s_label.trim() !== ""
        )
    : [];

  if (s_type === "" || s_label === "") {
    return null;
  }

  return {
    s_type,
    s_label,
    s_category,
    s_group,
    s_subgroup,
    s_icon,
    s_description,
    s_class_name,
    a_input_handles: a_input_handles.length > 0 ? a_input_handles : ["input"],
    a_output_handles:
      a_output_handles.length > 0 ? a_output_handles : ["output"],
    a_fields,
  };
}

export function build_tool_node_data(
  o_schema: IToolNodeSchema
): IToolNodeData {
  const o_result: IToolNodeData = {
    s_label: o_schema.s_label,
    s_tool_type: o_schema.s_type,
    s_schema_version: "1",
  };

  for (const o_field of o_schema.a_fields) {
    if (typeof o_field.s_default === "string") {
      o_result[o_field.s_key] = o_field.s_default;
      continue;
    }
    if (typeof o_field.d_default === "number") {
      o_result[o_field.s_key] = o_field.d_default;
      continue;
    }
    if (o_field.s_field_type === "checkbox") {
      o_result[o_field.s_key] = false;
      continue;
    }
    o_result[o_field.s_key] = "";
  }

  return o_result;
}
