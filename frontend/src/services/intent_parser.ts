/* file: src/services/intent_parser.ts
description: Einfacher Mock Intent Parser fuer Chat to Flow.
history:
- 2026-03-29: Erstellt fuer regelbasierte Erkennung ohne echte KI. author Marcus Schlieper
author Marcus Schlieper
*/
import { IToolNodeSchema } from "../types/tool_registry";
import { WorkflowCommand } from "../types/chat_flow";

function create_id(s_prefix: string): string {
  return `${s_prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function get_contains_any_keyword(
  s_input: string,
  a_keywords: string[]
): boolean {
  return a_keywords.some((s_keyword) => s_input.includes(s_keyword));
}

export function parse_chat_to_commands(
  s_input: string,
  a_tool_schemas: IToolNodeSchema[]
): WorkflowCommand[] {
  const s_text = s_input.toLowerCase().trim();
  const a_commands: WorkflowCommand[] = [];

  const s_start_id = create_id("node");
  a_commands.push({
    s_type: "ADD_NODE",
    s_node_type: "start",
    s_node_id: s_start_id,
    s_label: "Start",
    data: {
      s_label: "Start",
      s_query: s_input,
      b_enable: true,
      s_array_obj_variable: "",
      inputs: [],
    },
  });

  let s_previous_node_id = s_start_id;

  if (get_contains_any_keyword(s_text, ["email", "mail", "posteingang"])) {
    const s_http_id = create_id("node");
    a_commands.push({
      s_type: "ADD_NODE",
      s_node_type: "http",
      s_node_id: s_http_id,
      s_label: "Email Input",
      data: {
        s_label: "Email Input",
        s_api: "/api/email/inbox",
        s_method: "GET",
        i_timeout: 10000,
      },
    });
    a_commands.push({
      s_type: "ADD_EDGE",
      s_edge_id: create_id("edge"),
      s_source: s_previous_node_id,
      s_target: s_http_id,
    });
    s_previous_node_id = s_http_id;
  }

  if (
    get_contains_any_keyword(s_text, [
      "pruefe",
      "prufen",
      "check",
      "betrag",
      "bedingung",
      "wenn",
      "score",
    ])
  ) {
    const s_condition_id = create_id("node");
    a_commands.push({
      s_type: "ADD_NODE",
      s_node_type: "condition",
      s_node_id: s_condition_id,
      s_label: "Condition",
      data: {
        s_label: "Condition",
        rules: [
          {
            s_id: create_id("rule"),
            s_if_left: "value",
            s_operator: s_text.includes("5000") ? "greater_than" : "equals",
            s_if_right: s_text.includes("5000") ? "5000" : "true",
            s_then: "continue",
            s_else: "stop",
          },
        ],
      },
    });
    a_commands.push({
      s_type: "ADD_EDGE",
      s_edge_id: create_id("edge"),
      s_source: s_previous_node_id,
      s_target: s_condition_id,
    });
    s_previous_node_id = s_condition_id;
  }

  if (
    get_contains_any_keyword(s_text, [
      "ki",
      "llm",
      "zusammenfassen",
      "klassifizieren",
      "analysieren",
      "agent",
    ])
  ) {
    const s_llm_id = create_id("node");
    a_commands.push({
      s_type: "ADD_NODE",
      s_node_type: "llm",
      s_node_id: s_llm_id,
      s_label: "LLM",
      data: {
        s_label: "LLM",
        s_model_name: "gpt-4o-mini",
        s_api_key: "",
        s_api_host: "",
        d_temperature: 0.2,
        s_system_prompt: "Assist with workflow task",
        s_prompt: s_input,
        s_result_variable: "llm_result",
      },
    });
    a_commands.push({
      s_type: "ADD_EDGE",
      s_edge_id: create_id("edge"),
      s_source: s_previous_node_id,
      s_target: s_llm_id,
    });
    s_previous_node_id = s_llm_id;
  }

  const o_matching_tool = a_tool_schemas.find((o_tool) => {
    const s_label = String(o_tool.s_label || "").toLowerCase();
    const s_type = String(o_tool.s_type || "").toLowerCase();
    return s_text.includes(s_label) || s_text.includes(s_type.replace("tool_", ""));
  });

  if (o_matching_tool) {
    const s_tool_id = create_id("node");
    a_commands.push({
      s_type: "ADD_NODE",
      s_node_type: o_matching_tool.s_type,
      s_node_id: s_tool_id,
      s_label: o_matching_tool.s_label,
      data: {
        s_label: o_matching_tool.s_label,
        s_tool_type: o_matching_tool.s_type,
      },
    });
    a_commands.push({
      s_type: "ADD_EDGE",
      s_edge_id: create_id("edge"),
      s_source: s_previous_node_id,
      s_target: s_tool_id,
    });
    s_previous_node_id = s_tool_id;
  }

  if (
    get_contains_any_keyword(s_text, [
      "sende",
      "send",
      "benachrichtige",
      "slack",
      "hubspot",
      "finance",
      "freigabe",
    ])
  ) {
    const s_http_id = create_id("node");
    a_commands.push({
      s_type: "ADD_NODE",
      s_node_type: "http",
      s_node_id: s_http_id,
      s_label: "Action",
      data: {
        s_label: "Action",
        s_api: "/api/action",
        s_method: "POST",
        i_timeout: 10000,
      },
    });
    a_commands.push({
      s_type: "ADD_EDGE",
      s_edge_id: create_id("edge"),
      s_source: s_previous_node_id,
      s_target: s_http_id,
    });
    s_previous_node_id = s_http_id;
  }

  const s_end_id = create_id("node");
  a_commands.push({
    s_type: "ADD_NODE",
    s_node_type: "end",
    s_node_id: s_end_id,
    s_label: "End",
    data: {
      s_label: "End",
      outputs: [],
      b_success: true,
      s_query: "done",
    },
  });
  a_commands.push({
    s_type: "ADD_EDGE",
    s_edge_id: create_id("edge"),
    s_source: s_previous_node_id,
    s_target: s_end_id,
  });

  return a_commands;
}
