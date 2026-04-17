/* file: frontend/src/components/tool_registry_panel.tsx
description: UI zum Laden von Tool Node JSON Beschreibungen.
history:
- 2026-03-28: Erstellt fuer Import von Tool Registries im Frontend. author Marcus Schlieper
- 2026-04-04: Styling an Agent Designer angepasst mit Theme, Icons und Cards. author Marcus Schlieper
*/

import { useState } from "react";
import {
  FiCheckCircle,
  FiCode,
  FiDatabase,
  FiDownload,
  FiTool,
  FiAlertCircle,
} from "react-icons/fi";
import { use_tool_registry_store } from "../store/tool_registry_store";

const s_example_json = `{
  "a_tools": [
    {
      "s_type": "tool_slack_send",
      "s_label": "Slack Send",
      "s_category": "Communication",
      "s_description": "Sendet eine Slack Nachricht ueber das Backend.",
      "s_class_name": "node_tool",
      "a_input_handles": ["input"],
      "a_output_handles": ["output"],
      "a_fields": [
        {
          "s_key": "s_channel",
          "s_label": "Channel",
          "s_field_type": "text",
          "b_required": true,
          "s_default": ""
        },
        {
          "s_key": "s_message",
          "s_label": "Message",
          "s_field_type": "textarea",
          "b_required": true,
          "s_default": ""
        }
      ]
    }
  ]
}`;

function get_wrapper_style(): React.CSSProperties {
  return {
    flexDirection: "column",
    gap: "10px",
    height: "calc(100vh - 200px)",
    maxHeight: "calc(100vh - 200px)",
    minHeight: 0,
    overflow: "auto",
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
    padding: "14px 16px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_header_icon_box_style(): React.CSSProperties {
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

function get_textarea_style(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "320px",
    resize: "vertical",
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "12px",
    lineHeight: 1.5,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
    color: "var(--color_text)",
    background: "var(--color_panel)",
  };
}

function get_button_row_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "12px",
    flexWrap: "wrap",
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
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function get_status_style(b_ok: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: b_ok ? "var(--color_accent_text)" : "#b91c1c",
    background: b_ok ? "var(--color_accent_soft)" : "rgba(239, 68, 68, 0.10)",
    border: b_ok
      ? "1px solid var(--color_accent)"
      : "1px solid rgba(239, 68, 68, 0.25)",
    borderRadius: "10px",
    padding: "8px 10px",
  };
}

function get_list_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };
}

function get_item_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    background: "var(--color_panel)",
    padding: "12px",
  };
}

function get_item_title_row_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
    color: "var(--color_text)",
    fontSize: "13px",
    fontWeight: 700,
  };
}

function get_item_meta_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "var(--color_text_muted)",
    lineHeight: 1.45,
  };
}

export function ToolRegistryPanel(): JSX.Element {
  const { register_tool_schemas_from_json, a_tool_schemas } = use_tool_registry_store();
  const [s_json, set_json] = useState(s_example_json);
  const [s_status, set_status] = useState("");

  function on_import(): void {
    const o_result = register_tool_schemas_from_json(s_json);
    if (o_result.success) {
      set_status(`import_ok_${String(o_result.i_count ?? 0)}`);
      return;
    }
    set_status(`import_error_${o_result.error ?? "unknown"}`);
  }

  const b_is_ok = s_status.startsWith("import_ok_");

  return (
    <div style={get_wrapper_style()}>
      <div style={get_card_style()}>
        <div style={get_header_style()}>
          <div style={get_header_icon_box_style()}>
            <FiDatabase size={18} />
          </div>
          <div>
            <h3 style={get_title_style()}>Tool Registry</h3>
            <p style={get_text_style()}>
              Tool Nodes koennen per JSON registriert und direkt in die Anwendung geladen werden.
            </p>
          </div>
        </div>

        <div style={get_body_style()}>
          <textarea
            value={s_json}
            onChange={(o_event) => set_json(o_event.target.value)}
            rows={16}
            spellCheck={false}
            style={get_textarea_style()}
            placeholder="Tool Registry JSON einfuegen"
          />

          <div style={get_button_row_style()}>
            <button type="button" onClick={on_import} style={get_button_style()}>
              <FiDownload size={15} />
              Import Tool JSON
            </button>

            {s_status ? (
              <div style={get_status_style(b_is_ok)}>
                {b_is_ok ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
                <span>{s_status}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={get_card_style()}>
        <div style={get_header_style()}>
          <div style={get_header_icon_box_style()}>
            <FiTool size={18} />
          </div>
          <div>
            <h3 style={get_title_style()}>Registrierte Tools</h3>
            <p style={get_text_style()}>
              Aktuell geladene Tool Schemas aus der Registry.
            </p>
          </div>
        </div>

        <div style={get_body_style()}>
          {a_tool_schemas.length === 0 ? (
            <div style={get_item_meta_style()}>
              Noch keine Tools registriert.
            </div>
          ) : (
            <div style={get_list_style()}>
              {a_tool_schemas.map((o_item) => (
                <div key={o_item.s_type} style={get_item_style()}>
                  <div style={get_item_title_row_style()}>
                    <FiCode size={15} />
                    <span>{o_item.s_label}</span>
                  </div>
                  <div style={get_item_meta_style()}>{o_item.s_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
