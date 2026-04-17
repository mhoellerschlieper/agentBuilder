/* file: frontend/src/components/right_sidebar_tabs.tsx
 * description: Rechte Sidebar Tabs mit begrenzter Hoehe und scrollbarem Inhalt.
 * history:
 * - 2026-03-29: Finale bereinigte Version. author Marcus Schlieper
 * - 2026-04-03: Tab Buttons auf Icon Layout mit Text darunter umgestellt. author Marcus Schlieper
 * - 2026-04-04: Runner Panel als eigener Tab mit eigenem Icon und neuem Design ergaenzt. author Marcus Schlieper
 * - 2026-04-04: Tools Tab auf ToolTreePanel umgestellt. author Marcus Schlieper
 * - 2026-04-04: Runner Ref nach aussen freigegeben, damit Agent Designer on_run ausloesen kann. author Marcus Schlieper
 * - 2026-04-04: Run Result Callback an Agent Designer durchgereicht. author Marcus Schlieper
 * - 2026-04-11: Workspace Panel kompakter gestaltet. author Marcus Schlieper
 * - 2026-04-11: Scroll Verhalten fuer Tools Tab mit stabiler Flex Hoehenlogik korrigiert. author Marcus Schlieper
 * - 2026-04-11: Hoehe der rechten Sidebar unten um 100px begrenzt. author Marcus Schlieper
 * author Marcus Schlieper
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiBookOpen,
  FiBox,
  FiCode,
  FiCpu,
  FiDatabase,
  FiFileText,
  FiFlag,
  FiFolder,
  FiGitBranch,
  FiGlobe,
  FiLayers,
  FiMessageCircle,
  FiPlay,
  FiPlayCircle,
  FiRepeat,
  FiSettings,
  FiSliders,
  FiTool,
} from "react-icons/fi";
import type { IconType } from "react-icons";

import { PropertiesPanel } from "./properties_panel";
import { TemplateSelector } from "./template_selector";
import { ToolRegistryPanel } from "./tool_registry_panel";
import { GlobalVariablesPanel } from "./global_variables_panel";
import {
  RunnerPanel,
  TRunnerPanelHandle,
  TWorkflowRunState,
  TRunWorkflowResult,
} from "./runner_panel";
import { ToolTreePanel } from "./tool_tree_panel";
import { use_tool_registry_store } from "../store/tool_registry_store";
import { use_workflow_store } from "../store/workflow_store";
import type { TNodeType } from "../types/workflow";

type TRightTab =
  | "properties"
  | "settings"
  | "docs"
  | "templates"
  | "tools"
  | "tool_registry"
  | "global_variables"
  | "runner";

type TAvailableToolItem = {
  s_id: string;
  s_label: string;
  s_type: TNodeType | string;
  s_description: string;
  s_group: string;
  s_subgroup: string;
  s_icon: string;
  s_source: "standard" | "dynamic";
};

type TTabConfig = {
  s_key: TRightTab;
  s_label: string;
  Icon: IconType;
  s_badge?: string;
};

type TRightSidebarTabsProps = {
  s_workflow_run_state: TWorkflowRunState;
  s_workflow_status_text: string;
  on_run_result?: (o_result: TRunWorkflowResult) => void;
};

export type TRightSidebarTabsHandle = {
  on_runner_run: () => Promise<void>;
};

const a_standard_tools: {
  s_type: TNodeType;
  s_label: string;
  s_description: string;
  s_group: string;
  s_subgroup: string;
  s_icon: string;
}[] = [
  {
    s_type: "start",
    s_label: "Start",
    s_description: "Startpunkt fuer einen Workflow.",
    s_group: "Flow",
    s_subgroup: "Core",
    s_icon: "play",
  },
  {
    s_type: "http",
    s_label: "HTTP",
    s_description: "API Calls und Requests.",
    s_group: "Integration",
    s_subgroup: "API",
    s_icon: "globe",
  },
  {
    s_type: "condition",
    s_label: "Condition",
    s_description: "Regeln und Entscheidungen.",
    s_group: "Flow",
    s_subgroup: "Logic",
    s_icon: "git-branch",
  },
  {
    s_type: "loop_for",
    s_label: "Loop For",
    s_description: "Schleifen ueber Arrays.",
    s_group: "Flow",
    s_subgroup: "Logic",
    s_icon: "repeat",
  },
  {
    s_type: "llm",
    s_label: "LLM",
    s_description: "KI Modell und Prompt Logik.",
    s_group: "AI",
    s_subgroup: "Language",
    s_icon: "sparkles",
  },
  {
    s_type: "group",
    s_label: "Group",
    s_description: "Gruppiert mehrere Nodes.",
    s_group: "Flow",
    s_subgroup: "Layout",
    s_icon: "layers",
  },
  {
    s_type: "end",
    s_label: "End",
    s_description: "Endpunkt des Workflows.",
    s_group: "Flow",
    s_subgroup: "Core",
    s_icon: "flag",
  },
  {
    s_type: "comment",
    s_label: "Comment",
    s_description: "Kommentar auf dem Canvas.",
    s_group: "Flow",
    s_subgroup: "Layout",
    s_icon: "message-circle",
  },
];

function get_shell_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    height: "calc(100% - 100px)",
    minHeight: 0,
    maxHeight: "calc(100% - 100px)",
    background: "var(--color_panel)",
    overflow: "hidden",
  };
}

function get_header_style(): React.CSSProperties {
  return {
    padding: "10px 12px 8px 12px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
    flexShrink: 0,
  };
}

function get_header_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "13px",
    fontWeight: 800,
    color: "var(--color_text)",
    lineHeight: 1.2,
  };
}

function get_header_subtitle_style(): React.CSSProperties {
  return {
    margin: "3px 0 0 0",
    fontSize: "11px",
    color: "var(--color_text_muted)",
    lineHeight: 1.35,
  };
}

function get_tabs_wrapper_style(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "6px",
    padding: "8px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel_elevated, var(--color_panel))",
    flexShrink: 0,
  };
}

function get_tab_button_style(b_active: boolean): React.CSSProperties {
  return {
    position: "relative",
    minHeight: "56px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "8px 4px",
    border: b_active
      ? "1px solid var(--color_accent)"
      : "1px solid var(--color_border)",
    background: b_active
      ? "var(--color_accent_soft, rgba(59,130,246,0.12))"
      : "var(--color_panel)",
    color: b_active
      ? "var(--color_accent_text, var(--color_text))"
      : "var(--color_text)",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.18s ease",
    boxShadow: b_active ? "0 0 0 2px rgba(59,130,246,0.08)" : "none",
  };
}

function get_tab_icon_style(
  b_active: boolean,
  s_label: string,
): React.CSSProperties {
  const b_is_runner = s_label === "Runner";

  return {
    fontSize: "1rem",
    lineHeight: 1,
    color: b_is_runner
      ? b_active
        ? "#2563eb"
        : "#4b5563"
      : b_active
        ? "var(--color_accent_text, var(--color_text))"
        : "var(--color_text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function get_tab_label_style(b_active: boolean): React.CSSProperties {
  return {
    fontSize: "0.56rem",
    lineHeight: 1.1,
    fontWeight: 700,
    textAlign: "center",
    color: b_active
      ? "var(--color_accent_text, var(--color_text))"
      : "var(--color_text_muted, var(--color_text))",
    whiteSpace: "normal",
    wordBreak: "break-word",
  };
}

function get_tab_badge_style(): React.CSSProperties {
  return {
    position: "absolute",
    top: "4px",
    right: "4px",
    minWidth: "16px",
    height: "16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
    borderRadius: "999px",
    fontSize: "0.52rem",
    fontWeight: 800,
    color: "#ffffff",
    background: "var(--color_accent, #2563eb)",
  };
}

function get_content_style(): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    padding: "10px",
    background: "var(--color_panel)",
    display: "flex",
    flexDirection: "column",
  };
}

function get_scroll_panel_style(): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
  };
}

function get_tools_tab_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  };
}

function get_card_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    background: "var(--color_panel_elevated)",
    overflow: "hidden",
  };
}

function get_card_header_style(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_card_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "13px",
    fontWeight: 800,
    color: "var(--color_text)",
    lineHeight: 1.2,
  };
}

function get_card_text_style(): React.CSSProperties {
  return {
    margin: "3px 0 0 0",
    fontSize: "11px",
    lineHeight: 1.4,
    color: "var(--color_text_muted)",
  };
}

function get_runner_badge_style(
  s_workflow_run_state: TWorkflowRunState,
): React.CSSProperties {
  let s_background = "#6b7280";

  if (s_workflow_run_state === "starting") {
    s_background = "#f59e0b";
  } else if (s_workflow_run_state === "running") {
    s_background = "#22c55e";
  } else if (s_workflow_run_state === "finished") {
    s_background = "#10b981";
  } else if (s_workflow_run_state === "error") {
    s_background = "#ef4444";
  }

  return {
    ...get_tab_badge_style(),
    background: s_background,
  };
}

function get_tool_icon_component(s_icon: string): IconType {
  switch (s_icon) {
    case "play":
      return FiPlay;
    case "globe":
      return FiGlobe;
    case "git_branch":
    case "git-branch":
      return FiGitBranch;
    case "repeat":
      return FiRepeat;
    case "sparkles":
      return FiCpu;
    case "layers":
      return FiLayers;
    case "flag":
      return FiFlag;
    case "message_circle":
    case "message-circle":
      return FiMessageCircle;
    case "file-code":
      return FiCode;
    default:
      return FiBox;
  }
}

function TabButton(o_props: {
  s_label: string;
  Icon: IconType;
  b_active: boolean;
  s_badge?: string;
  b_is_runner?: boolean;
  s_workflow_run_state?: TWorkflowRunState;
  on_click: () => void;
}): JSX.Element {
  const {
    s_label,
    Icon,
    b_active,
    s_badge,
    b_is_runner = false,
    s_workflow_run_state = "idle",
    on_click,
  } = o_props;

  const o_badge_style = b_is_runner
    ? get_runner_badge_style(s_workflow_run_state)
    : get_tab_badge_style();

  return (
    <button
      type="button"
      onClick={on_click}
      style={get_tab_button_style(b_active)}
    >
      {s_badge ? <span style={o_badge_style}>{s_badge}</span> : null}
      <span style={get_tab_icon_style(b_active, s_label)}>
        <Icon />
      </span>
      <span style={get_tab_label_style(b_active)}>{s_label}</span>
    </button>
  );
}

export const RightSidebarTabs = forwardRef<
  TRightSidebarTabsHandle,
  TRightSidebarTabsProps
>(function RightSidebarTabs(o_props, o_ref): JSX.Element {
  const { s_workflow_run_state, s_workflow_status_text, on_run_result } = o_props;

  const [s_active_tab, set_active_tab] = useState<TRightTab>("properties");
  const { a_tool_schemas } = use_tool_registry_store();
  const {
    global_variables,
    nodes,
    edges,
    s_workflow_name,
  } = use_workflow_store();

  const o_runner_panel_ref = useRef<TRunnerPanelHandle | null>(null);

  useImperativeHandle(
    o_ref,
    () => ({
      async on_runner_run(): Promise<void> {
        /* history:
         * - 2026-04-04: Runner Tab wird vor externem Run geoeffnet. author Marcus Schlieper
         * - 2026-04-11: Typisierung und sichere Null Pruefung verbessert. author Marcus Schlieper
         */
        set_active_tab("runner");

        if (o_runner_panel_ref.current) {
          await o_runner_panel_ref.current.on_run();
        }
      },
    }),
    [],
  );

  const a_available_tools = useMemo((): TAvailableToolItem[] => {
    const a_standard_items: TAvailableToolItem[] = a_standard_tools.map(
      (o_item) => ({
        s_id: `standard_${o_item.s_type}`,
        s_label: o_item.s_label,
        s_type: o_item.s_type,
        s_description: o_item.s_description,
        s_group: o_item.s_group,
        s_subgroup: o_item.s_subgroup,
        s_icon: o_item.s_icon,
        s_source: "standard",
      }),
    );

    const a_dynamic_items: TAvailableToolItem[] = a_tool_schemas
      .filter(
        (o_tool_schema) =>
          typeof o_tool_schema?.s_type === "string" &&
          o_tool_schema.s_type.trim() !== "",
      )
      .map((o_tool_schema) => ({
        s_id: `dynamic_${o_tool_schema.s_type}`,
        s_label:
          typeof o_tool_schema.s_label === "string" &&
          o_tool_schema.s_label.trim() !== ""
            ? o_tool_schema.s_label
            : o_tool_schema.s_type,
        s_type: o_tool_schema.s_type,
        s_description:
          typeof o_tool_schema.s_description === "string" &&
          o_tool_schema.s_description.trim() !== ""
            ? o_tool_schema.s_description
            : "Keine Beschreibung vorhanden.",
        s_group:
          typeof o_tool_schema.s_group === "string" &&
          o_tool_schema.s_group.trim() !== ""
            ? o_tool_schema.s_group
            : typeof o_tool_schema.s_category === "string" &&
                o_tool_schema.s_category.trim() !== ""
              ? o_tool_schema.s_category
              : "Other",
        s_subgroup:
          typeof o_tool_schema.s_subgroup === "string" &&
          o_tool_schema.s_subgroup.trim() !== ""
            ? o_tool_schema.s_subgroup
            : "General",
        s_icon:
          typeof o_tool_schema.s_icon === "string" &&
          o_tool_schema.s_icon.trim() !== ""
            ? o_tool_schema.s_icon
            : "tool",
        s_source: "dynamic" as const,
      }));

    return [...a_standard_items, ...a_dynamic_items].sort((o_left, o_right) => {
      const s_left = `${o_left.s_group} ${o_left.s_subgroup} ${o_left.s_label}`;
      const s_right = `${o_right.s_group} ${o_right.s_subgroup} ${o_right.s_label}`;
      return s_left.localeCompare(s_right);
    });
  }, [a_tool_schemas]);

  const i_tool_count = a_available_tools.length;
  const i_variable_count = global_variables.length;
  const i_node_count = nodes.length;
  const i_edge_count = edges.length;

  const s_runner_badge = useMemo((): string => {
    if (
      s_workflow_run_state === "running" ||
      s_workflow_run_state === "starting"
    ) {
      return "Live";
    }

    if (s_workflow_run_state === "finished") {
      return "Ok";
    }

    if (s_workflow_run_state === "error") {
      return "Err";
    }

    return "";
  }, [s_workflow_run_state]);

  const a_tabs: TTabConfig[] = [
    {
      s_key: "properties",
      s_label: "Properties",
      Icon: FiSliders,
    },
    {
      s_key: "settings",
      s_label: "Settings",
      Icon: FiSettings,
    },
    {
      s_key: "docs",
      s_label: "Docs",
      Icon: FiBookOpen,
    },
    {
      s_key: "templates",
      s_label: "Templates",
      Icon: FiFolder,
    },
    {
      s_key: "tools",
      s_label: "Tools",
      Icon: FiTool,
      s_badge: String(i_tool_count),
    },
    {
      s_key: "tool_registry",
      s_label: "Registry",
      Icon: FiDatabase,
    },
    {
      s_key: "global_variables",
      s_label: "Variables",
      Icon: FiFileText,
      s_badge: String(i_variable_count),
    },
    {
      s_key: "runner",
      s_label: "Runner",
      Icon: FiPlayCircle,
      s_badge: s_runner_badge || undefined,
    },
  ];

  function render_tools_card(): JSX.Element {
    return (
      <div style={{ ...get_card_style(), display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={get_card_header_style()}>
          <h3 style={get_card_title_style()}>Tools</h3>
          
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ToolTreePanel />
        </div>
      </div>
    );
  }

  function render_active_tab(): JSX.Element {
    if (s_active_tab === "properties") {
      return (
        <div style={get_content_style()}>
          <div style={get_scroll_panel_style()}>
            <PropertiesPanel />
          </div>
        </div>
      );
    }

    if (s_active_tab === "settings") {
      return (
        <div style={get_content_style()}>
          <div style={get_card_style()}>
            <div style={get_card_header_style()}>
              <h3 style={get_card_title_style()}>Settings</h3>
              <p style={get_card_text_style()}>
                Workflow: {s_workflow_name}
                <br />
                Nodes: {i_node_count}
                <br />
                Edges: {i_edge_count}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (s_active_tab === "docs") {
      return (
        <div style={get_content_style()}>
          <div style={get_card_style()}>
            <div style={get_card_header_style()}>
              <h3 style={get_card_title_style()}>Docs</h3>
              <p style={get_card_text_style()}>
                Der Designer verbindet Chat, Canvas, Runner und Tool Registry.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (s_active_tab === "templates") {
      return (
        <div style={get_content_style()}>
          <div style={get_scroll_panel_style()}>
            <TemplateSelector />
          </div>
        </div>
      );
    }

    if (s_active_tab === "tools") {
      return (
        <div style={get_content_style()}>
          <div style={get_tools_tab_style()}>{render_tools_card()}</div>
        </div>
      );
    }

    if (s_active_tab === "tool_registry") {
      return (
        <div style={get_content_style()}>
          <div style={get_scroll_panel_style()}>
            <ToolRegistryPanel />
          </div>
        </div>
      );
    }

    if (s_active_tab === "global_variables") {
      return (
        <div style={get_content_style()}>
          <div style={get_scroll_panel_style()}>
            <GlobalVariablesPanel />
          </div>
        </div>
      );
    }

    return (
      <div style={get_content_style()}>
        <div style={get_scroll_panel_style()}>
          <RunnerPanel
            ref={o_runner_panel_ref}
            s_workflow_run_state={s_workflow_run_state}
            s_workflow_status_text={s_workflow_status_text}
            on_run_result={on_run_result}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={get_shell_style()}>
      <div style={get_tabs_wrapper_style()}>
        {a_tabs.map((o_tab) => (
          <TabButton
            key={o_tab.s_key}
            s_label={o_tab.s_label}
            Icon={o_tab.Icon}
            b_active={s_active_tab === o_tab.s_key}
            s_badge={o_tab.s_badge}
            b_is_runner={o_tab.s_key === "runner"}
            s_workflow_run_state={s_workflow_run_state}
            on_click={() => {
              set_active_tab(o_tab.s_key);
            }}
          />
        ))}
      </div>

      {render_active_tab()}
    </div>
  );
});
