/* file: frontend/src/components/global_variables_panel.tsx
description: Verwaltung globaler Variablen mit stabiler Bearbeitung fuer integer, float, string, array und object.
history:
- 2026-03-25: Erstellt fuer systemweiten Variablenspeicher. author Marcus Schlieper
- 2026-03-29: Eingabeverhalten fuer string korrigiert. author Marcus Schlieper
- 2026-03-29: Bearbeitung fuer array und object ueber lokalen Textstatus ergaenzt, damit JSON frei eingegeben werden kann. author Marcus Schlieper
- 2026-04-04: Styling an Agent Designer angepasst mit Theme, Icons und Cards. author Marcus Schlieper
author Marcus Schlieper
*/
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiDatabase,
  FiFileText,
  FiHash,
  FiLayers,
  FiMinusCircle,
  FiPlus,
  FiSliders,
} from "react-icons/fi";
import { use_workflow_store } from "../store/workflow_store";
import { TVariableType } from "../types/workflow";

const a_variable_types: TVariableType[] = [
  "integer",
  "float",
  "string",
  "array",
  "object",
];

function get_string_from_value(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parse_variable_value(
  s_type: TVariableType,
  s_input: string
): { b_success: boolean; value: unknown } {
  if (s_type === "string") {
    return {
      b_success: true,
      value: s_input,
    };
  }

  if (s_type === "integer") {
    const i_value = Number.parseInt(s_input, 10);
    return {
      b_success: Number.isInteger(i_value),
      value: Number.isInteger(i_value) ? i_value : 0,
    };
  }

  if (s_type === "float") {
    const d_value = Number.parseFloat(s_input);
    return {
      b_success: Number.isFinite(d_value),
      value: Number.isFinite(d_value) ? d_value : 0,
    };
  }

  if (s_type === "array") {
    try {
      const value = JSON.parse(s_input);
      return {
        b_success: Array.isArray(value),
        value: Array.isArray(value) ? value : [],
      };
    } catch {
      return {
        b_success: false,
        value: [],
      };
    }
  }

  if (s_type === "object") {
    try {
      const value = JSON.parse(s_input);
      const b_is_object =
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value);
      return {
        b_success: b_is_object,
        value: b_is_object ? value : {},
      };
    } catch {
      return {
        b_success: false,
        value: {},
      };
    }
  }

  return {
    b_success: true,
    value: s_input,
  };
}

function get_wrapper_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  };
}

function get_card_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "14px",
    background: "var(--color_panel_elevated)",
    overflow: "hidden",
  };
}

function get_header_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "14px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_header_icon_style(): React.CSSProperties {
  return {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color_accent_soft)",
    color: "var(--color_accent_text)",
    flexShrink: 0,
  };
}

function get_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_text_style(): React.CSSProperties {
  return {
    margin: "4px 0 0 0",
    fontSize: "12px",
    lineHeight: 1.45,
    color: "var(--color_text_muted)",
  };
}

function get_body_style(): React.CSSProperties {
  return {
    padding: "14px",
  };
}

function get_button_row_style(): React.CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  };
}

function get_button_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid var(--color_accent)",
    background: "var(--color_accent_soft)",
    color: "var(--color_accent_text)",
    borderRadius: "10px",
    padding: "9px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function get_remove_button_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(239, 68, 68, 0.28)",
    background: "rgba(239, 68, 68, 0.10)",
    color: "#b91c1c",
    borderRadius: "10px",
    padding: "9px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function get_variable_card_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    background: "var(--color_panel)",
    padding: "12px",
    marginBottom: "10px",
  };
}

function get_field_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "12px",
  };
}

function get_label_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--color_text)",
  };
}

function get_input_style(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--color_border)",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
    background: "var(--color_panel_elevated)",
    color: "var(--color_text)",
    outline: "none",
  };
}

function get_textarea_style(): React.CSSProperties {
  return {
    ...get_input_style(),
    resize: "vertical",
    minHeight: "110px",
    fontFamily: "inherit",
  };
}

function get_status_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "8px",
    fontSize: "12px",
    color: "#b91c1c",
    background: "rgba(239, 68, 68, 0.10)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    borderRadius: "10px",
    padding: "8px 10px",
  };
}

function get_muted_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "var(--color_text_muted)",
    lineHeight: 1.45,
  };
}

interface IVariableValueEditorProps {
  s_id: string;
  s_type: TVariableType;
  value: unknown;
  update_global_variable: (
    s_id: string,
    o_patch: Partial<{
      s_name: string;
      s_type: TVariableType;
      value: unknown;
    }>
  ) => void;
}

function VariableValueEditor({
  s_id,
  s_type,
  value,
  update_global_variable,
}: IVariableValueEditorProps): JSX.Element {
  const s_initial_text = useMemo(() => get_string_from_value(value), [value]);
  const [s_text_value, set_text_value] = useState(s_initial_text);
  const [b_is_invalid_json, set_is_invalid_json] = useState(false);

  useEffect(() => {
    set_text_value(get_string_from_value(value));
    set_is_invalid_json(false);
  }, [value, s_id, s_type]);

  function on_change_text(o_event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const s_next_text = o_event.target.value;
    set_text_value(s_next_text);

    if (s_type === "string") {
      update_global_variable(s_id, { value: s_next_text });
      return;
    }

    const o_result = parse_variable_value(s_type, s_next_text);
    if (o_result.b_success) {
      update_global_variable(s_id, { value: o_result.value });
      set_is_invalid_json(false);
      return;
    }

    set_is_invalid_json(true);
  }

  if (s_type === "string" || s_type === "array" || s_type === "object") {
    return (
      <>
        <textarea
          value={s_text_value}
          onChange={on_change_text}
          style={get_textarea_style()}
        />
        {(s_type === "array" || s_type === "object") && b_is_invalid_json ? (
          <div style={get_status_style()}>
            <FiAlertCircle size={14} />
            invalid_json_input
          </div>
        ) : null}
      </>
    );
  }

  return (
    <input
      type="number"
      value={s_text_value}
      style={get_input_style()}
      onChange={(o_event) => {
        const s_next_text = o_event.target.value;
        set_text_value(s_next_text);

        if (s_next_text.trim() === "") {
          update_global_variable(s_id, { value: 0 });
          return;
        }

        const o_result = parse_variable_value(s_type, s_next_text);
        if (o_result.b_success) {
          update_global_variable(s_id, { value: o_result.value });
        }
      }}
    />
  );
}

export function GlobalVariablesPanel(): JSX.Element {
  const {
    global_variables,
    add_global_variable,
    update_global_variable,
    remove_global_variable,
  } = use_workflow_store();

  return (
    <div style={get_wrapper_style()}>
      <div style={get_card_style()}>
        <div style={get_header_style()}>
          <div style={get_header_icon_style()}>
            <FiDatabase size={16} />
          </div>
          <div>
            <h3 style={get_title_style()}>Globale Variablen</h3>
            <p style={get_text_style()}>
              Diese Variablen sind in allen Inputs und Outputs verfuegbar.
            </p>
          </div>
        </div>
        <div style={get_body_style()}>
          <div style={get_button_row_style()}>
            {a_variable_types.map((s_type) => (
              <button
                key={s_type}
                onClick={() => add_global_variable(s_type)}
                style={get_button_style()}
                type="button"
              >
                <FiPlus size={14} />
                Add {s_type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={get_card_style()}>
        <div style={get_header_style()}>
          <div style={get_header_icon_style()}>
            <FiSliders size={16} />
          </div>
          <div>
            <h3 style={get_title_style()}>Variable Liste</h3>
            <p style={get_text_style()}>
              Werte koennen direkt bearbeitet und typgerecht gespeichert werden.
            </p>
          </div>
        </div>
        <div style={get_body_style()}>
          {global_variables.length === 0 ? (
            <div style={get_muted_style()}>
              Noch keine globalen Variablen vorhanden.
            </div>
          ) : (
            global_variables.map((o_item) => (
              <div key={o_item.s_id} style={get_variable_card_style()}>
                <div style={get_field_style()}>
                  <label style={get_label_style()}>Name</label>
                  <input
                    value={o_item.s_name}
                    style={get_input_style()}
                    onChange={(o_event) =>
                      update_global_variable(o_item.s_id, {
                        s_name: o_event.target.value,
                      })
                    }
                  />
                </div>

                <div style={get_field_style()}>
                  <label style={get_label_style()}>Type</label>
                  <select
                    value={o_item.s_type}
                    style={get_input_style()}
                    onChange={(o_event) =>
                      update_global_variable(o_item.s_id, {
                        s_type: o_event.target.value as TVariableType,
                      })
                    }
                  >
                    {a_variable_types.map((s_type) => (
                      <option key={s_type} value={s_type}>
                        {s_type}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={get_field_style()}>
                  <label style={get_label_style()}>Value</label>
                  <VariableValueEditor
                    s_id={o_item.s_id}
                    s_type={o_item.s_type}
                    value={o_item.value}
                    update_global_variable={update_global_variable}
                  />
                </div>

                <button
                  onClick={() => remove_global_variable(o_item.s_id)}
                  style={get_remove_button_style()}
                  type="button"
                >
                  <FiMinusCircle size={14} />
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
