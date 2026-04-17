/* file: frontend/src/components/chat_panel.tsx
description: Linkes Chat Panel fuer Chat to Flow Eingaben und Verlauf.
history:
- 2026-03-29: Erstellt fuer dialogbasierten Workflow Aufbau. author Marcus Schlieper
- 2026-04-04: Styling an Agent Designer angepasst mit Theme, Icons und Cards. author Marcus Schlieper
author Marcus Schlieper
*/

import { useState } from "react";
import { FiArrowUpRight, FiCpu, FiMessageCircle, FiUser } from "react-icons/fi";
import { IChatMessage } from "../types/chat_flow";

interface IChatPanelProps {
  a_messages: IChatMessage[];
  on_submit: (s_message: string) => Promise<void> | void;
}

function get_wrapper_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    height: "48%",
    minHeight: "320px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_header_style(): React.CSSProperties {
  return {
    padding: "16px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel_elevated)",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
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
    margin: "0 0 6px 0",
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_text_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.5,
    color: "var(--color_text_muted)",
  };
}

function get_messages_style(): React.CSSProperties {
  return {
    flex: "1",
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "var(--color_panel)",
  };
}

function get_message_row_style(s_role: string): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: s_role === "user" ? "flex-end" : "flex-start",
  };
}

function get_message_style(s_role: string): React.CSSProperties {
  return {
    maxWidth: "90%",
    background:
      s_role === "user"
        ? "var(--color_accent_soft)"
        : "var(--color_panel_elevated)",
    color: s_role === "user" ? "var(--color_accent_text)" : "var(--color_text)",
    border: "1px solid var(--color_border)",
    borderRadius: "14px",
    padding: "10px 12px",
    fontSize: "13px",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
}

function get_message_meta_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    marginBottom: "6px",
    opacity: 0.85,
    fontWeight: 700,
  };
}

function get_empty_style(): React.CSSProperties {
  return {
    border: "1px dashed var(--color_border)",
    borderRadius: "14px",
    padding: "14px",
    background: "var(--color_panel_elevated)",
    color: "var(--color_text_muted)",
    fontSize: "13px",
    lineHeight: 1.5,
  };
}

function get_footer_style(): React.CSSProperties {
  return {
    padding: "12px",
    borderTop: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_textarea_style(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "88px",
    resize: "vertical",
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
    color: "var(--color_text)",
    background: "var(--color_panel_elevated)",
  };
}

function get_button_row_style(): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
  };
}

function get_button_style(b_is_loading: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid var(--color_accent)",
    background: b_is_loading ? "var(--color_panel_elevated)" : "var(--color_accent_soft)",
    color: b_is_loading ? "var(--color_text_muted)" : "var(--color_accent_text)",
    borderRadius: "10px",
    padding: "9px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: b_is_loading ? "not-allowed" : "pointer",
    opacity: b_is_loading ? 0.8 : 1,
  };
}

function get_hint_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "var(--color_text_muted)",
  };
}

export function ChatPanel({
  a_messages,
  on_submit,
}: IChatPanelProps): JSX.Element {
  const [s_input, set_input] = useState("");
  const [b_is_loading, set_is_loading] = useState(false);

  async function on_send(): Promise<void> {
    const s_safe_input = s_input.trim();
    if (s_safe_input === "" || b_is_loading) {
      return;
    }

    set_is_loading(true);

    try {
      await on_submit(s_safe_input);
      set_input("");
    } finally {
      set_is_loading(false);
    }
  }

  return (
    <div style={get_wrapper_style()}>
      <div style={get_header_style()}>
        <div style={get_header_icon_style()}>
          <FiMessageCircle size={18} />
        </div>
        <div>
          <h3 style={get_title_style()}>Assistent</h3>
          <p style={get_text_style()}>
            Der Chat erstellt und aendert Workflows direkt aus Sprache.
          </p>
        </div>
      </div>

      <div style={get_messages_style()}>
        {a_messages.length === 0 ? (
          <div style={get_empty_style()}>
            Beispiel: Wenn eine Email eingeht, pruefe den Betrag, entscheide ab
            5000 und sende danach eine Nachricht.
          </div>
        ) : (
          a_messages.map((o_message) => (
            <div key={o_message.s_id} style={get_message_row_style(o_message.s_role)}>
              <div style={get_message_style(o_message.s_role)}>
                <div style={get_message_meta_style()}>
                  {o_message.s_role === "user" ? <FiUser size={12} /> : <FiCpu size={12} />}
                  <span>{o_message.s_role === "user" ? "Eingabe" : "Assistent"}</span>
                </div>
                <div>{o_message.s_content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={get_footer_style()}>
        <textarea
          value={s_input}
          onChange={(o_event) => set_input(o_event.target.value)}
          placeholder="Prozess in natuerlicher Sprache beschreiben"
          style={get_textarea_style()}
        />
        <div style={get_button_row_style()}>
          <div style={get_hint_style()}>
            Chat Input - Intent Parser - Commands - Canvas
          </div>

          <button
            type="button"
            onClick={() => {
              void on_send();
            }}
            disabled={b_is_loading}
            style={get_button_style(b_is_loading)}
          >
            <FiArrowUpRight size={15} />
            {b_is_loading ? "Baue Workflow..." : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
