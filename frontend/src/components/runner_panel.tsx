/* file: frontend/src/components/runner_panel.tsx
description: Runner panel with workflow normalization, validation and robust
run result forwarding to the parent component.
history:
- 2026-03-27: Extended for template demo results. author Marcus Schlieper
- 2026-04-04: Extended with external workflow status and improved panel design. author Marcus Schlieper
- 2026-04-04: Added external on_run control via forward_ref and useImperativeHandle. author Marcus Schlieper
- 2026-04-04: Added on_run_result callback so parent can process backend status. author Marcus Schlieper
- 2026-04-06: Extended workflow export with named input and output handles. author Marcus Schlieper
- 2026-04-06: Extended default handles for condition, llm and event flags. author Marcus Schlieper
- 2026-04-08: Added default provider openai for llm node export. author Marcus Schlieper
- 2026-04-13: Run result is always forwarded to parent to avoid stuck starting state. author Marcus Schlieper
author Marcus Schlieper
*/

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  FiActivity,
  FiCheckCircle,
  FiPlay,
  FiShield,
  FiTerminal,
  FiXCircle,
} from "react-icons/fi";
import { run_workflow, validate_workflow } from "../services/api";
import { use_workflow_store } from "../store/workflow_store";

export type TWorkflowRunState =
  | "idle"
  | "starting"
  | "running"
  | "finished"
  | "error"
  | "stopped";

export type TRunnerPanelHandle = {
  on_run: () => Promise<void>;
  on_validate: () => Promise<void>;
};

export type TRunWorkflowResultItem = {
  node_id?: string;
  node_type?: string;
  status?: string;
  result?: unknown;
  error?: string;
};

export type TRunWorkflowResult = {
  success?: boolean;
  workflow_name?: string;
  status?: string;
  error?: string;
  results?: TRunWorkflowResultItem[];
};

type TRunnerPanelProps = {
  s_workflow_run_state: TWorkflowRunState;
  s_workflow_status_text: string;
  on_run_result?: (o_result: TRunWorkflowResult) => void;
};

type THandleDefinition = {
  s_key: string;
  s_label: string;
  s_description?: string;
};

function get_panel_style(): React.CSSProperties {
  return {
    display: "flex",
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

function get_card_header_style(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_card_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "14px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_card_text_style(): React.CSSProperties {
  return {
    margin: "4px 0 0 0",
    fontSize: "12px",
    lineHeight: 1.45,
    color: "var(--color_text_muted)",
  };
}

function get_status_box_style(
  s_workflow_run_state: TWorkflowRunState,
): React.CSSProperties {
  let s_border = "1px solid var(--color_border)";
  let s_background = "var(--color_panel)";
  let s_color = "var(--color_text)";

  if (s_workflow_run_state === "starting") {
    s_border = "1px solid #f59e0b";
    s_background = "rgba(245, 158, 11, 0.10)";
    s_color = "#b45309";
  } else if (s_workflow_run_state === "running") {
    s_border = "1px solid #22c55e";
    s_background = "rgba(34, 197, 94, 0.10)";
    s_color = "#15803d";
  } else if (s_workflow_run_state === "finished") {
    s_border = "1px solid #10b981";
    s_background = "rgba(16, 185, 129, 0.10)";
    s_color = "#047857";
  } else if (s_workflow_run_state === "error") {
    s_border = "1px solid #ef4444";
    s_background = "rgba(239, 68, 68, 0.10)";
    s_color = "#b91c1c";
  } else if (s_workflow_run_state === "stopped") {
    s_border = "1px solid #6b7280";
    s_background = "rgba(107, 114, 128, 0.10)";
    s_color = "#4b5563";
  }

  return {
    border: s_border,
    background: s_background,
    color: s_color,
    borderRadius: "12px",
    padding: "12px",
  };
}

function get_status_row_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  };
}

function get_status_label_style(): React.CSSProperties {
  return {
    fontSize: "13px",
    fontWeight: 800,
  };
}

function get_status_text_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    lineHeight: 1.45,
  };
}

function get_button_row_style(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  };
}

function get_button_style(
  s_variant: "primary" | "secondary",
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    border:
      s_variant === "primary"
        ? "1px solid var(--color_accent)"
        : "1px solid var(--color_border)",
    background:
      s_variant === "primary"
        ? "var(--color_accent)"
        : "var(--color_panel)",
    color: s_variant === "primary" ? "#ffffff" : "var(--color_text)",
  };
}

function get_logs_style(): React.CSSProperties {
  return {
    maxHeight: "280px",
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };
}

function get_log_item_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "10px",
    background: "var(--color_panel)",
    padding: "10px",
    fontSize: "12px",
    lineHeight: 1.45,
    color: "var(--color_text)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  };
}

function get_empty_state_style(): React.CSSProperties {
  return {
    padding: "12px",
    fontSize: "12px",
    color: "var(--color_text_muted)",
  };
}

function get_status_icon(
  s_workflow_run_state: TWorkflowRunState,
): JSX.Element {
  if (s_workflow_run_state === "finished") {
    return <FiCheckCircle />;
  }

  if (s_workflow_run_state === "error") {
    return <FiXCircle />;
  }

  if (s_workflow_run_state === "stopped") {
    return <FiShield />;
  }

  if (
    s_workflow_run_state === "starting" ||
    s_workflow_run_state === "running"
  ) {
    return <FiActivity />;
  }

  return <FiTerminal />;
}

function get_default_input_handles_for_node_type(
  s_node_type: string,
): THandleDefinition[] {
  const d_defaults: Record<string, THandleDefinition[]> = {
    start: [],
    http: [
      {
        s_key: "input_main",
        s_label: "Anfrage",
        s_description: "Hauptdaten fuer den HTTP Aufruf",
      },
    ],
    condition: [
      {
        s_key: "input_main",
        s_label: "Pruefdaten",
        s_description: "Daten fuer die Bedingung",
      },
    ],
    switch: [
      {
        s_key: "input_main",
        s_label: "Pruefdaten",
        s_description: "Daten fuer die Auswahl",
      },
    ],
    loop: [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Daten fuer die Schleife",
      },
    ],
    loop_for: [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Daten fuer die Schleife",
      },
    ],
    llm: [
      {
        s_key: "input_main",
        s_label: "Prompt Daten",
        s_description: "Hauptdaten fuer den Prompt",
      },
      {
        s_key: "input_context",
        s_label: "Kontext",
        s_description: "Zusaetzlicher Kontext",
      },
    ],
    code: [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Hauptdaten fuer den Code",
      },
      {
        s_key: "input_config",
        s_label: "Konfiguration",
        s_description: "Optionale Einstellungen",
      },
    ],
    end: [
      {
        s_key: "input_main",
        s_label: "Endergebnis",
        s_description: "Abschlussdaten des Workflows",
      },
    ],
    group: [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Hauptdaten",
      },
    ],
    comment: [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Optionaler Eingang",
      },
    ],
  };

  return d_defaults[s_node_type] ?? [
    {
      s_key: "input_main",
      s_label: "Eingabe",
      s_description: "Haupteingang",
    },
  ];
}

function get_default_output_handles_for_node_type(
  s_node_type: string,
): THandleDefinition[] {
  const d_defaults: Record<string, THandleDefinition[]> = {
    start: [
      {
        s_key: "output_main",
        s_label: "Startdaten",
        s_description: "Daten des Start Nodes",
      },
    ],
    http: [
      {
        s_key: "output_main",
        s_label: "Antwort",
        s_description: "Ergebnis des HTTP Aufrufs",
      },
    ],
    condition: [
      {
        s_key: "then",
        s_label: "then",
        s_description: "Pfad fuer wahr",
      },
      {
        s_key: "else",
        s_label: "else",
        s_description: "Pfad fuer falsch",
      },
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Auswertung der Bedingung",
      },
    ],
    switch: [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Standard Ergebnis",
      },
    ],
    loop: [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Ergebnis der Schleife",
      },
    ],
    loop_for: [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Ergebnis der Schleife",
      },
    ],
    llm: [
      {
        s_key: "output_main",
        s_label: "Antwort",
        s_description: "Antwort des Modells",
      },
      {
        s_key: "tools",
        s_label: "Tools",
        s_description: "Tool Aufrufe des Modells",
      },
    ],
    code: [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Ergebnis des Codes",
      },
      {
        s_key: "output_error",
        s_label: "Fehler",
        s_description: "Fehlerausgang",
      },
    ],
    end: [
      {
        s_key: "output_main",
        s_label: "Frontend Ergebnis",
        s_description: "Ergebnis fuer das Frontend",
      },
    ],
    group: [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Gruppen Ergebnis",
      },
    ],
    comment: [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Kommentar Ergebnis",
      },
    ],
  };

  return d_defaults[s_node_type] ?? [
    {
      s_key: "output_main",
      s_label: "Ergebnis",
      s_description: "Standard Ausgang",
    },
  ];
}

function normalize_workflow_for_run(o_workflow: unknown): unknown {
  if (!o_workflow || typeof o_workflow !== "object") {
    return o_workflow;
  }

  const o_safe_workflow = o_workflow as {
    nodes?: unknown[];
    edges?: unknown[];
    name?: string;
    s_name?: string;
  };

  const a_nodes = Array.isArray(o_safe_workflow.nodes)
    ? o_safe_workflow.nodes.map((o_node) => normalize_node_for_run(o_node))
    : [];

  return {
    ...o_safe_workflow,
    nodes: a_nodes,
    edges: Array.isArray(o_safe_workflow.edges) ? o_safe_workflow.edges : [],
    name:
      typeof o_safe_workflow.name === "string" &&
      o_safe_workflow.name.trim() !== ""
        ? o_safe_workflow.name
        : o_safe_workflow.s_name,
  };
}

function normalize_node_for_run(o_node: unknown): unknown {
  if (!o_node || typeof o_node !== "object") {
    return o_node;
  }

  const o_safe_node = o_node as {
    type?: string;
    data?: Record<string, unknown>;
  };

  const s_node_type =
    typeof o_safe_node.type === "string" ? o_safe_node.type : "unknown";

  const o_data =
    o_safe_node.data && typeof o_safe_node.data === "object"
      ? { ...o_safe_node.data }
      : {};

  const a_existing_input_handles = Array.isArray(o_data.input_handles)
    ? (o_data.input_handles as THandleDefinition[])
    : [];

  const a_existing_output_handles = Array.isArray(o_data.output_handles)
    ? (o_data.output_handles as THandleDefinition[])
    : [];

  const a_input_handles =
    a_existing_input_handles.length > 0
      ? a_existing_input_handles
      : get_default_input_handles_for_node_type(s_node_type);

  const a_output_handles =
    a_existing_output_handles.length > 0
      ? a_existing_output_handles
      : get_default_output_handles_for_node_type(s_node_type);

  return {
    ...o_safe_node,
    data: {
      ...o_data,
      input_handles: a_input_handles,
      output_handles: a_output_handles,
      b_show_on_begin: o_data.b_show_on_begin === true,
      b_show_on_change: o_data.b_show_on_change === true,
      b_show_on_end: o_data.b_show_on_end === true,
      b_show_on_error: o_data.b_show_on_error === true,
      b_show_use_tool: o_data.b_show_use_tool === true,
      b_show_use_memory: o_data.b_show_use_memory === true,
      s_provider:
        typeof o_data.s_provider === "string" && o_data.s_provider.trim() !== ""
          ? o_data.s_provider
          : "openai",
    },
  };
}

export const RunnerPanel = forwardRef<TRunnerPanelHandle, TRunnerPanelProps>(
  function RunnerPanel(
    o_props: TRunnerPanelProps,
    o_ref,
  ): JSX.Element {
    const {
      s_workflow_run_state,
      s_workflow_status_text,
      on_run_result,
    } = o_props;

    const { export_workflow } = use_workflow_store() as {
      export_workflow: () => string;
    };

    const [a_logs, set_logs] = useState<string[]>([]);

    const s_status_title = useMemo((): string => {
      if (s_workflow_run_state === "starting") {
        return "Workflow startet";
      }
      if (s_workflow_run_state === "running") {
        return "Workflow laeuft";
      }
      if (s_workflow_run_state === "finished") {
        return "Workflow beendet";
      }
      if (s_workflow_run_state === "error") {
        return "Workflow Fehler";
      }
      if (s_workflow_run_state === "stopped") {
        return "Workflow gestoppt";
      }
      return "Workflow bereit";
    }, [s_workflow_run_state]);

    async function on_validate(): Promise<void> {
      try {
        const o_exported_workflow = JSON.parse(export_workflow());
        const o_normalized_workflow = normalize_workflow_for_run(
          o_exported_workflow,
        );
        const o_result = await validate_workflow(o_normalized_workflow);

        set_logs((a_prev) => [
          `validate: ${JSON.stringify(o_result, null, 2)}`,
          ...a_prev,
        ]);
      } catch (o_error) {
        const s_message =
          o_error instanceof Error ? o_error.message : "unknown_validate_error";

        set_logs((a_prev) => [`validate_error: ${s_message}`, ...a_prev]);
      }
    }

    async function on_run(): Promise<void> {
      try {
        const o_exported_workflow = JSON.parse(export_workflow());
        const o_normalized_workflow = normalize_workflow_for_run(
          o_exported_workflow,
        );

        const o_result = (await run_workflow(
          o_normalized_workflow,
        )) as TRunWorkflowResult;

        set_logs((a_prev) => [
          `run_backend: ${JSON.stringify(o_result, null, 2)}`,
          ...a_prev,
        ]);

        if (typeof on_run_result === "function") {
          on_run_result(o_result);
        }
      } catch (o_error) {
        const s_message =
          o_error instanceof Error ? o_error.message : "unknown_run_error";

        set_logs((a_prev) => [`run_error: ${s_message}`, ...a_prev]);

        if (typeof on_run_result === "function") {
          on_run_result({
            success: false,
            error: s_message,
            results: [],
          });
        }

        throw o_error;
      }
    }

    useImperativeHandle(
      o_ref,
      () => ({
        on_run,
        on_validate,
      }),
      [on_run, on_validate],
    );

    return (
      <div style={get_panel_style()}>
        <div style={get_card_style()}>
          <div style={get_card_header_style()}>
            <h3 style={get_card_title_style()}>Runner</h3>
            <p style={get_card_text_style()}>
              Dieses Panel zeigt Validierung, Test Run und den aktuellen Workflow
              Status aus dem Designer.
            </p>
          </div>

          <div style={{ padding: "12px" }}>
            <div style={get_status_box_style(s_workflow_run_state)}>
              <div style={get_status_row_style()}>
                {get_status_icon(s_workflow_run_state)}
                <span style={get_status_label_style()}>{s_status_title}</span>
              </div>
              <div style={get_status_text_style()}>{s_workflow_status_text}</div>
            </div>
          </div>
        </div>

        <div style={get_card_style()}>
          <div style={get_card_header_style()}>
            <h3 style={get_card_title_style()}>Aktionen</h3>
            <p style={get_card_text_style()}>
              Validierung prueft die Struktur. Test Run sendet den Workflow an das
              Backend oder nutzt Demo Daten.
            </p>
          </div>

          <div style={{ padding: "12px" }}>
            <div style={get_button_row_style()}>
              <button
                onClick={() => {
                  void on_validate();
                }}
                style={get_button_style("secondary")}
                type="button"
              >
                <FiShield />
                Validate
              </button>

              <button
                onClick={() => {
                  void on_run();
                }}
                style={get_button_style("primary")}
                type="button"
              >
                <FiPlay />
                Test Run
              </button>
            </div>
          </div>
        </div>

        <div style={get_card_style()}>
          <div style={get_card_header_style()}>
            <h3 style={get_card_title_style()}>Logs</h3>
            <p style={get_card_text_style()}>
              Die letzten Ergebnisse aus Validate und Test Run erscheinen hier.
            </p>
          </div>

          {a_logs.length === 0 ? (
            <div style={get_empty_state_style()}>No logs</div>
          ) : (
            <div style={get_logs_style()}>
              {a_logs.map((s_log, i_index) => (
                <div key={`runner_log_${i_index}`} style={get_log_item_style()}>
                  {s_log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);
