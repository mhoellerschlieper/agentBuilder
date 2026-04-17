/* file: frontend/src/components/template_selector.tsx
description: Auswahlkomponente fuer JSON Vorlagen und Laden auf Canvas.
history:
- 2026-03-27: Erstellt fuer Template Auswahl im Frontend. author Marcus Schlieper
- 2026-04-04: Styling an Agent Designer angepasst mit Theme, Icons und Cards. author Marcus Schlieper
*/
import { FiLayers, FiFileText, FiPlayCircle } from "react-icons/fi";
import { a_workflow_templates } from "../data/workflow_templates";
import { use_workflow_store } from "../store/workflow_store";

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

function get_grid_style(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  };
}

function get_template_button_style(): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    background: "var(--color_panel)",
    color: "var(--color_text)",
    padding: "12px",
    cursor: "pointer",
    transition: "all 0.18s ease",
  };
}

function get_template_title_row_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--color_text)",
  };
}

function get_template_text_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    lineHeight: 1.45,
    color: "var(--color_text_muted)",
  };
}

function get_empty_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "var(--color_text_muted)",
    lineHeight: 1.45,
  };
}

export function TemplateSelector(): JSX.Element {
  const { load_workflow_definition } = use_workflow_store();

  return (
    <div style={get_wrapper_style()}>
      <div style={get_card_style()}>
        <div style={get_header_style()}>
          <div style={get_header_icon_style()}>
            <FiLayers size={16} />
          </div>
          <div>
            <h3 style={get_title_style()}>Beispiel Vorlagen</h3>
            <p style={get_text_style()}>
              Klick auf eine Vorlage erzeugt Nodes, Verbindungen und Parameter auf dem Canvas.
            </p>
          </div>
        </div>

        <div style={get_body_style()}>
          {a_workflow_templates.length === 0 ? (
            <div style={get_empty_style()}>
              Keine Vorlagen verfuegbar.
            </div>
          ) : (
            <div style={get_grid_style()}>
              {a_workflow_templates.map((o_template) => (
                <button
                  key={o_template.s_name}
                  onClick={() => load_workflow_definition(o_template.workflow)}
                  title={o_template.s_description}
                  style={get_template_button_style()}
                >
                  <div style={get_template_title_row_style()}>
                    <FiPlayCircle size={15} />
                    <span>{o_template.s_name}</span>
                  </div>
                  <div style={get_template_text_style()}>
                    {o_template.s_description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
