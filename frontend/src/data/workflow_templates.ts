/* file: frontend/src/data/workflow_templates.ts
description: Zehn Beispiel JSON Vorlagen fuer sinnvolle Lowcode Aufgaben.
history:
- 2026-03-27: Erstellt fuer Template Auswahl und Canvas Befuellung. author Marcus Schlieper
- 2026-03-27: Erweitert um 10 produktive Beispiel Workflows. author Marcus Schlieper
*/
import {
  ICanvasSettings,
  IGlobalVariable,
  IWorkflowDefinition,
  IWorkflowTemplate,
  TWorkflowEdge,
  TWorkflowNode,
} from "../types/workflow";

function create_canvas_settings(): ICanvasSettings {
  return {
    b_show_grid: true,
    b_snap_to_grid: true,
    b_lock_canvas: false,
    i_snap_grid_x: 20,
    i_snap_grid_y: 20,
  };
}

function create_node(
  s_id: string,
  s_type: TWorkflowNode["type"],
  x: number,
  y: number,
  data: Record<string, unknown>,
  class_name: string
): TWorkflowNode {
  return {
    id: s_id,
    type: s_type,
    position: { x, y },
    data,
    className: class_name,
  };
}

function create_edge(
  s_id: string,
  s_source: string,
  s_target: string
): TWorkflowEdge {
  return {
    id: s_id,
    source: s_source,
    target: s_target,
    type: "custom_edge",
    markerEnd: {
      type: "arrowclosed",
    },
  };
}

function create_common_globals(): IGlobalVariable[] {
  return [
    {
      s_id: "var_query",
      s_name: "input_query",
      s_type: "string",
      value: "",
    },
    {
      s_id: "var_text",
      s_name: "input_text",
      s_type: "string",
      value: "",
    },
    {
      s_id: "var_result",
      s_name: "result_text",
      s_type: "string",
      value: "",
    },
    {
      s_id: "var_json",
      s_name: "result_json",
      s_type: "object",
      value: {},
    },
    {
      s_id: "var_list",
      s_name: "work_items",
      s_type: "array",
      value: [],
    },
    {
      s_id: "var_status_code",
      s_name: "status_code",
      s_type: "integer",
      value: 200,
    },
    {
      s_id: "var_score",
      s_name: "score_value",
      s_type: "float",
      value: 0.0,
    },
  ];
}

function build_template(
  s_id: string,
  s_name: string,
  s_description: string,
  nodes: TWorkflowNode[],
  edges: TWorkflowEdge[],
  global_variables: IGlobalVariable[]
): IWorkflowTemplate {
  const workflow: IWorkflowDefinition = {
    s_name,
    nodes,
    edges,
    global_variables,
    canvas_settings: create_canvas_settings(),
  };

  return {
    s_id,
    s_name,
    s_description,
    workflow,
  };
}

export const a_workflow_templates: IWorkflowTemplate[] = [
  build_template(
    "template_llm_ask",
    "LLM befragen",
    "Einfache Anfrage an ein LLM mit Ausgabe des Ergebnisses.",
    [
      create_node(
        "start_1",
        "start",
        80,
        140,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "query",
              s_type: "string",
              s_bind_variable: "input_query",
            },
          ],
          s_query: "Erklaere die Vorteile von Lowcode fuer den Mittelstand.",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "llm_1",
        "llm",
        360,
        140,
        {
          s_label: "LLM",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.2,
          s_system_prompt: "Du bist ein sachlicher Assistent fuer Unternehmen.",
          s_prompt: "Beantworte die Benutzerfrage klar und kurz: {{input_query}}",
          s_result_variable: "result_text",
        },
        "node_llm"
      ),
      create_node(
        "end_1",
        "end",
        660,
        140,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "answer",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Antwort ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "llm_1"),
      create_edge("edge_2", "llm_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_weather_news_summary",
    "Wetter und News laden und mit LLM zusammenfassen",
    "Wetter API und News API laden, dann mit LLM zusammenfassen.",
    [
      create_node(
        "start_1",
        "start",
        60,
        220,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "city",
              s_type: "string",
              s_bind_variable: "input_query",
            },
          ],
          s_query: "Breckerfeld",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "http_1",
        "http",
        320,
        80,
        {
          s_label: "Weather API",
          s_api: "https://api.example.com/weather",
          s_method: "GET",
          headers: [],
          params: [
            {
              s_id: "param_1",
              s_key: "city",
              s_value: "{{input_query}}",
            },
          ],
          s_body: "",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "result_json",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "http_2",
        "http",
        320,
        320,
        {
          s_label: "News API",
          s_api: "https://api.example.com/news",
          s_method: "GET",
          headers: [],
          params: [
            {
              s_id: "param_2",
              s_key: "topic",
              s_value: "{{input_query}}",
            },
          ],
          s_body: "",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "work_items",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "llm_1",
        "llm",
        620,
        200,
        {
          s_label: "LLM Summary",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.3,
          s_system_prompt: "Du fasst Wetter und Nachrichten fuer Geschaeftsleitungen zusammen.",
          s_prompt:
            "Erstelle eine kurze Management Zusammenfassung fuer Wetterdaten {{result_json}} und News {{work_items}}.",
          s_result_variable: "result_text",
        },
        "node_llm"
      ),
      create_node(
        "end_1",
        "end",
        900,
        200,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "summary",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Summary ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "http_1"),
      create_edge("edge_2", "start_1", "http_2"),
      create_edge("edge_3", "http_1", "llm_1"),
      create_edge("edge_4", "http_2", "llm_1"),
      create_edge("edge_5", "llm_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_text_classification",
    "Text klassifizieren",
    "Klassifiziert einen Text in Kategorien wie Anfrage, Beschwerde oder Lob.",
    [
      create_node(
        "start_1",
        "start",
        80,
        140,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "text",
              s_type: "string",
              s_bind_variable: "input_text",
            },
          ],
          s_query: "Bitte pruefen Sie meine Rechnung, der Betrag scheint falsch zu sein.",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "llm_1",
        "llm",
        380,
        140,
        {
          s_label: "Classifier",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.0,
          s_system_prompt: "Du gibst nur eine Klasse zurueck.",
          s_prompt:
            "Klassifiziere den Text in Anfrage, Beschwerde, Lob oder Sonstiges: {{input_text}}",
          s_result_variable: "result_text",
        },
        "node_llm"
      ),
      create_node(
        "end_1",
        "end",
        680,
        140,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "class",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Klasse ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "llm_1"),
      create_edge("edge_2", "llm_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_website_sentiment",
    "Webseite Sentiment",
    "Liest Webseiteninhalt und bewertet das Sentiment.",
    [
      create_node(
        "start_1",
        "start",
        60,
        160,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "url",
              s_type: "string",
              s_bind_variable: "input_query",
            },
          ],
          s_query: "https://example.com/blog",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "http_1",
        "http",
        340,
        160,
        {
          s_label: "Load Page",
          s_api: "https://api.example.com/fetch_page",
          s_method: "GET",
          headers: [],
          params: [
            {
              s_id: "param_1",
              s_key: "url",
              s_value: "{{input_query}}",
            },
          ],
          s_body: "",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "result_text",
          s_result_headers_variable: "result_json",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "llm_1",
        "llm",
        620,
        160,
        {
          s_label: "Sentiment",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.1,
          s_system_prompt: "Du analysierst Stimmungen von Webseiteninhalten.",
          s_prompt:
            "Analysiere das Sentiment und gib positiv, neutral oder negativ mit kurzer Begruendung aus: {{result_text}}",
          s_result_variable: "result_text",
        },
        "node_llm"
      ),
      create_node(
        "end_1",
        "end",
        900,
        160,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "sentiment",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Sentiment ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "http_1"),
      create_edge("edge_2", "http_1", "llm_1"),
      create_edge("edge_3", "llm_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_mail_routing",
    "Mail klassifizieren und weiterleiten",
    "Klassifiziert eingehende Mail und leitet an passende Empfaenger weiter, danach Protokoll.",
    [
      create_node(
        "start_1",
        "start",
        40,
        220,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "mail_text",
              s_type: "string",
              s_bind_variable: "input_text",
            },
          ],
          s_query: "Kunde meldet Stoerung und moechte schnellen Rueckruf.",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "llm_1",
        "llm",
        300,
        220,
        {
          s_label: "Mail Classifier",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.0,
          s_system_prompt: "Klassifiziere Mails in support, sales, billing oder other.",
          s_prompt: "Klassifiziere diese Mail: {{input_text}}",
          s_result_variable: "result_text",
        },
        "node_llm"
      ),
      create_node(
        "condition_1",
        "condition",
        560,
        220,
        {
          s_label: "Route Decision",
          rules: [
            {
              s_id: "rule_1",
              s_if_left: "result_text",
              s_operator: "equals",
              s_if_right: "support",
              s_then: "support@company.tld",
              s_else: "other",
            },
            {
              s_id: "rule_2",
              s_if_left: "result_text",
              s_operator: "equals",
              s_if_right: "sales",
              s_then: "sales@company.tld",
              s_else: "other",
            },
          ],
        },
        "node_condition"
      ),
      create_node(
        "http_1",
        "http",
        840,
        220,
        {
          s_label: "Send Mail",
          s_api: "https://api.example.com/send_mail",
          s_method: "POST",
          headers: [],
          params: [],
          s_body: "{\"class\":\"{{result_text}}\",\"mail\":\"{{input_text}}\"}",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "result_json",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "http_2",
        "http",
        1120,
        220,
        {
          s_label: "Write Log",
          s_api: "https://api.example.com/audit_log",
          s_method: "POST",
          headers: [],
          params: [],
          s_body: "{\"event\":\"mail_routed\",\"class\":\"{{result_text}}\"}",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "result_json",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "end_1",
        "end",
        1380,
        220,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "route_result",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Routing abgeschlossen",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "llm_1"),
      create_edge("edge_2", "llm_1", "condition_1"),
      create_edge("edge_3", "condition_1", "http_1"),
      create_edge("edge_4", "http_1", "http_2"),
      create_edge("edge_5", "http_2", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_meeting_summary_tasks",
    "Meeting zusammenfassen und Aufgaben erzeugen",
    "Erstellt aus Meeting Notizen eine Zusammenfassung und Aufgabenliste.",
    [
      create_node(
        "start_1",
        "start",
        80,
        180,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "meeting_notes",
              s_type: "string",
              s_bind_variable: "input_text",
            },
          ],
          s_query: "Vertrieb will neue Leads. IT plant CRM Anbindung. Marketing braucht Landingpage.",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "llm_1",
        "llm",
        400,
        180,
        {
          s_label: "Summarize Meeting",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.2,
          s_system_prompt: "Erstelle Meeting Zusammenfassungen mit Aufgaben.",
          s_prompt:
            "Fasse die Notizen zusammen und extrahiere Aufgaben als JSON Liste: {{input_text}}",
          s_result_variable: "result_json",
        },
        "node_llm"
      ),
      create_node(
        "loop_1",
        "loop_for",
        720,
        180,
        {
          s_label: "Loop Tasks",
          s_source_array_variable: "work_items",
          s_item_variable: "result_json",
          s_index_variable: "status_code",
        },
        "node_loop"
      ),
      create_node(
        "end_1",
        "end",
        1000,
        180,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "meeting_result",
              s_type: "object",
              s_bind_variable: "result_json",
            },
          ],
          b_success: true,
          s_query: "Meeting Ergebnis ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "llm_1"),
      create_edge("edge_2", "llm_1", "loop_1"),
      create_edge("edge_3", "loop_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_lead_enrichment_scoring",
    "Lead Enrichment und Scoring",
    "Leads anreichern, bewerten und priorisieren.",
    [
      create_node(
        "start_1",
        "start",
        60,
        220,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "company_name",
              s_type: "string",
              s_bind_variable: "input_query",
            },
          ],
          s_query: "Muster GmbH",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "http_1",
        "http",
        300,
        220,
        {
          s_label: "CRM Lookup",
          s_api: "https://api.example.com/crm_lookup",
          s_method: "GET",
          headers: [],
          params: [
            {
              s_id: "param_1",
              s_key: "company",
              s_value: "{{input_query}}",
            },
          ],
          s_body: "",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "result_json",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "http_2",
        "http",
        560,
        220,
        {
          s_label: "Web Enrichment",
          s_api: "https://api.example.com/company_enrichment",
          s_method: "GET",
          headers: [],
          params: [
            {
              s_id: "param_2",
              s_key: "company",
              s_value: "{{input_query}}",
            },
          ],
          s_body: "",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "work_items",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "llm_1",
        "llm",
        840,
        220,
        {
          s_label: "Lead Score",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.1,
          s_system_prompt: "Bewerte Leads nach Potenzial und Fit.",
          s_prompt:
            "Erzeuge eine Scoring Einschaetzung und Prioritaet aus CRM Daten {{result_json}} und Web Daten {{work_items}}.",
          s_result_variable: "result_text",
        },
        "node_llm"
      ),
      create_node(
        "end_1",
        "end",
        1120,
        220,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "lead_score",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Lead Score ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "http_1"),
      create_edge("edge_2", "http_1", "http_2"),
      create_edge("edge_3", "http_2", "llm_1"),
      create_edge("edge_4", "llm_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_invoice_check",
    "Rechnung pruefen und Auffaelligkeiten markieren",
    "Extrahiert Rechnungsdaten und prueft Plausibilitaet mit KI.",
    [
      create_node(
        "start_1",
        "start",
        80,
        180,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "invoice_text",
              s_type: "string",
              s_bind_variable: "input_text",
            },
          ],
          s_query: "Rechnung ueber 12999 EUR fuer Beratungsleistungen vom 03.03.2026.",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "llm_1",
        "llm",
        380,
        180,
        {
          s_label: "Invoice Parser",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.0,
          s_system_prompt: "Extrahiere Rechnungsdaten strukturiert.",
          s_prompt: "Extrahiere Betrag, Datum, Lieferant und Positionen aus: {{input_text}}",
          s_result_variable: "result_json",
        },
        "node_llm"
      ),
      create_node(
        "condition_1",
        "condition",
        680,
        180,
        {
          s_label: "Check Rules",
          rules: [
            {
              s_id: "rule_1",
              s_if_left: "status_code",
              s_operator: "greater_than",
              s_if_right: "10000",
              s_then: "high_amount",
              s_else: "ok",
            },
          ],
        },
        "node_condition"
      ),
      create_node(
        "end_1",
        "end",
        980,
        180,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "invoice_result",
              s_type: "object",
              s_bind_variable: "result_json",
            },
            {
              s_id: "out_2",
              s_name: "invoice_flag",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Rechnungspruefung ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "llm_1"),
      create_edge("edge_2", "llm_1", "condition_1"),
      create_edge("edge_3", "condition_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_support_ticket_triage",
    "Support Ticket Triage",
    "Tickets priorisieren, zusammenfassen und Team zuweisen.",
    [
      create_node(
        "start_1",
        "start",
        60,
        200,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "ticket_text",
              s_type: "string",
              s_bind_variable: "input_text",
            },
          ],
          s_query: "ERP Anmeldung nicht moeglich. Fehler seit heute Morgen bei mehreren Usern.",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "llm_1",
        "llm",
        340,
        200,
        {
          s_label: "Ticket Analyze",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.1,
          s_system_prompt: "Analysiere Support Tickets nach Prioritaet, Thema und Team.",
          s_prompt:
            "Liefere Prioritaet, Kategorie, Team und Kurzbeschreibung fuer: {{input_text}}",
          s_result_variable: "result_json",
        },
        "node_llm"
      ),
      create_node(
        "http_1",
        "http",
        640,
        200,
        {
          s_label: "Create Ticket",
          s_api: "https://api.example.com/support_ticket",
          s_method: "POST",
          headers: [],
          params: [],
          s_body: "{\"ticket\":{{result_json}}}",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "result_json",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "end_1",
        "end",
        920,
        200,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "ticket_payload",
              s_type: "object",
              s_bind_variable: "result_json",
            },
          ],
          b_success: true,
          s_query: "Ticket Ergebnis ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "llm_1"),
      create_edge("edge_2", "llm_1", "http_1"),
      create_edge("edge_3", "http_1", "end_1"),
    ],
    create_common_globals()
  ),
  build_template(
    "template_competitor_monitoring",
    "Wettbewerber Monitoring mit Report",
    "Mehrere Quellen laden, analysieren und als Report ausgeben.",
    [
      create_node(
        "start_1",
        "start",
        40,
        220,
        {
          s_label: "Start",
          inputs: [
            {
              s_id: "input_1",
              s_name: "competitor_name",
              s_type: "string",
              s_bind_variable: "input_query",
            },
          ],
          s_query: "Wettbewerber AG",
          b_enable: true,
          s_array_obj_variable: "",
        },
        "node_start"
      ),
      create_node(
        "http_1",
        "http",
        280,
        100,
        {
          s_label: "Website Crawl",
          s_api: "https://api.example.com/site_monitor",
          s_method: "GET",
          headers: [],
          params: [
            {
              s_id: "param_1",
              s_key: "company",
              s_value: "{{input_query}}",
            },
          ],
          s_body: "",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "result_json",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "http_2",
        "http",
        280,
        340,
        {
          s_label: "News Crawl",
          s_api: "https://api.example.com/news_monitor",
          s_method: "GET",
          headers: [],
          params: [
            {
              s_id: "param_2",
              s_key: "company",
              s_value: "{{input_query}}",
            },
          ],
          s_body: "",
          i_timeout: 10000,
          i_retry_times: 1,
          s_result_body_variable: "work_items",
          s_result_headers_variable: "result_text",
          s_result_status_code_variable: "status_code",
        },
        "node_http"
      ),
      create_node(
        "llm_1",
        "llm",
        600,
        220,
        {
          s_label: "Strategic Report",
          s_model_name: "gpt-4o-mini",
          s_api_key: "",
          s_api_host: "https://api.openai.com/v1",
          d_temperature: 0.3,
          s_system_prompt: "Erstelle Wettbewerbsreports fuer Geschaeftsleitungen.",
          s_prompt:
            "Erstelle einen Report mit Chancen, Risiken und Handlungsoptionen aus Website Daten {{result_json}} und News {{work_items}}.",
          s_result_variable: "result_text",
        },
        "node_llm"
      ),
      create_node(
        "end_1",
        "end",
        920,
        220,
        {
          s_label: "End",
          outputs: [
            {
              s_id: "out_1",
              s_name: "competitor_report",
              s_type: "string",
              s_bind_variable: "result_text",
            },
          ],
          b_success: true,
          s_query: "Report ausgeben",
        },
        "node_end"
      ),
    ],
    [
      create_edge("edge_1", "start_1", "http_1"),
      create_edge("edge_2", "start_1", "http_2"),
      create_edge("edge_3", "http_1", "llm_1"),
      create_edge("edge_4", "http_2", "llm_1"),
      create_edge("edge_5", "llm_1", "end_1"),
    ],
    create_common_globals()
  ),
];
