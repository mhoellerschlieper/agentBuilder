/* file: frontend/src/components/tool_tree_panel.tsx
description: Tool Tree Panel mit Anzeige der gleichen SVG Node Icons wie im Canvas.
history:
- 2026-03-29: Erstellt fuer professionelle Tool Baumansicht im rechten Tools Reiter. author Marcus Schlieper
- 2026-03-29: Filtersuche, aufklappbare Zweige und Add to Canvas Aktion ergaenzt. author Marcus Schlieper
- 2026-03-29: Farbchips fuer Gruppen und Tools sowie einklappbare Langbeschreibung ergaenzt. author Marcus Schlieper
- 2026-03-29: Anzeige fuer Tool Farbe und Beschreibung im Canvas Kontext verbessert. author Marcus Schlieper
- 2026-04-11: Kompakteres Layout fuer Workspace Tools Panel umgesetzt. author Marcus Schlieper
- 2026-04-11: Eigener Scroll Container fuer Tool Liste ergaenzt. author Marcus Schlieper
- 2026-04-11: Hoehe so erweitert, dass das Panel bis maximal 100px vor den unteren Rand reicht. author Marcus Schlieper
- 2026-04-11: Anzeige von Group, Subgroup und Type in Tool Karten entfernt. author Marcus Schlieper
- 2026-04-11: Standard Nodes direkt im Panel ergaenzt und gleiche SVG Node Icons wie im Canvas verwendet. author Marcus Schlieper
author Marcus Schlieper
*/
import { useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties, JSX } from "react";
import {
  Activity,
  AlignLeft,
  Archive,
  ArrowDownToLine,
  ArrowUpToLine,
  AtSign,
  AudioLines,
  AudioWaveform,
  BadgeCheck,
  BadgeEuro,
  Barcode,
  BarChart3,
  Bell,
  Binary,
  BookOpenCheck,
  Bot,
  Braces,
  Briefcase,
  BriefcaseBusiness,
  Building,
  Calendar,
  CalendarRange,
  CalendarSearch,
  CalendarSync,
  CalendarX,
  CheckCheck,
  CheckCircle,
  CheckSquare,
  Clapperboard,
  ClipboardList,
  Cloud,
  Code2,
  CodeXml,
  ContactRound,
  Copy,
  CopyPlus,
  Cylinder,
  Database,
  Download,
  Expand,
  File,
  FileCode,
  FileInput,
  FileJson,
  FileOutput,
  FilePlus,
  FileSearch,
  FileText,
  Flag,
  Folder,
  FolderPlus,
  Forward,
  GitBranch,
  Globe,
  Globe2,
  Hash,
  HeartPulse,
  Image,
  ImagePlus,
  Inbox,
  Key,
  KeyRound,
  KeySquare,
  Languages,
  Layers,
  Link,
  List,
  ListChecks,
  Lock,
  Logs,
  Mail,
  MailOpen,
  MemoryStick,
  MessageCircle,
  MessageSquare,
  Mic,
  Minimize,
  Move,
  Newspaper,
  NotebookPen,
  PackageOpen,
  PenTool,
  PhoneCall,
  PhoneOff,
  Play,
  Plus,
  PlusSquare,
  Presentation,
  Printer,
  QrCode,
  Radar,
  Receipt,
  RefreshCcw,
  Repeat,
  Reply,
  Replace,
  Rss,
  Save,
  Scan,
  ScanFace,
  ScanText,
  Scissors,
  Search,
  SearchCheck,
  Send,
  SendHorizontal,
  Server,
  ServerCog,
  ServerCrash,
  Sheet,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Shuffle,
  Smile,
  Smartphone,
  Sparkles,
  Split,
  Star,
  StickyNote,
  Table,
  TableProperties,
  Tag,
  Tags,
  Trash,
  Trash2,
  TriangleAlert,
  Unlock,
  Upload,
  UserCog,
  UserPlus,
  Users,
  Video,
  Volume2,
  Wand2,
  Webhook,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { use_tool_registry_store } from "../store/tool_registry_store";
import { use_workflow_store } from "../store/workflow_store";
import type { TNodeType } from "../types/workflow";
import type { IToolNodeSchema } from "../types/tool_registry";
import { NodeTypeIcon } from "./nodes/node_runtime_helpers";

type TToolSource = "standard" | "dynamic";

interface IAvailableToolItem {
  s_id: string;
  s_label: string;
  s_type: TNodeType | string;
  s_description: string;
  s_long_description: string;
  s_group: string;
  s_subgroup: string;
  s_icon: string;
  s_source: TToolSource;
  s_color: string;
  o_tool_schema?: IToolNodeSchema;
}

interface IToolTreePanelProps {
  a_standard_tools: {
    s_type: TNodeType;
    s_label: string;
    s_description: string;
    s_group: string;
    s_subgroup: string;
    s_icon: string;
  }[];
}

interface IToolGroupNode {
  s_group: string;
  o_subgroups: Record<string, IAvailableToolItem[]>;
}

interface IColorPalette {
  s_border: string;
  s_background: string;
  s_background_soft: string;
  s_text: string;
  s_badge_background: string;
  s_badge_text: string;
}

type TNodeKind =
  | "start"
  | "end"
  | "show"
  | "llm"
  | "classifier"
  | "http"
  | "code"
  | "condition"
  | "switch"
  | "loop"
  | "group"
  | "comment"
  | "tool";

function get_wrapper_style(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    height: "calc(100vh - 300px)",
    maxHeight: "calc(100vh - 300px)",
    minHeight: 0,
    overflow: "auto",
  };
}

function get_header_card_style(): CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    padding: "12px",
    background:
      "linear-gradient(180deg, var(--color_panel_elevated) 0%, var(--color_panel) 100%)",
    boxShadow: "var(--shadow_sm)",
    flexShrink: 0,
  };
}

function get_title_style(): CSSProperties {
  return {
    margin: "0 0 4px 0",
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_text_style(): CSSProperties {
  return {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.45,
    color: "var(--color_text_muted)",
  };
}

function get_search_input_style(): CSSProperties {
  return {
    width: "100%",
    border: "1px solid var(--color_border_strong)",
    borderRadius: "10px",
    padding: "9px 10px",
    background: "var(--color_panel)",
    color: "var(--color_text)",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "12px",
  };
}

function get_stats_style(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  };
}

function get_stat_badge_style(): CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 700,
    background: "var(--color_panel_elevated)",
    color: "var(--color_text_muted)",
  };
}

function get_tree_container_style(): CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    border: "1px solid var(--color_border)",
    borderRadius: "14px",
    padding: "8px",
    background: "var(--color_panel_elevated)",
    boxShadow: "var(--shadow_sm)",
  };
}

function get_group_details_style(o_palette: IColorPalette): CSSProperties {
  return {
    border: "1px solid " + o_palette.s_border,
    borderRadius: "10px",
    background: o_palette.s_background_soft,
    marginBottom: "8px",
    overflow: "hidden",
    boxShadow: "var(--shadow_sm)",
  };
}

function get_summary_style(o_palette: IColorPalette): CSSProperties {
  return {
    listStyle: "none",
    cursor: "pointer",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    background:
      "linear-gradient(180deg, " +
      o_palette.s_background +
      " 0%, " +
      o_palette.s_background_soft +
      " 100%)",
    userSelect: "none",
  };
}

function get_summary_left_style(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  };
}

function get_branch_icon_style(o_palette: IColorPalette): CSSProperties {
  return {
    width: "22px",
    height: "22px",
    borderRadius: "8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: o_palette.s_badge_background,
    color: o_palette.s_badge_text,
    fontSize: "11px",
    fontWeight: 800,
    flexShrink: 0,
    border: "1px solid " + o_palette.s_border,
  };
}

function get_color_chip_style(s_color: string): CSSProperties {
  return {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: s_color,
    border: "1px solid rgba(0, 0, 0, 0.18)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.25)",
    flexShrink: 0,
  };
}

function get_summary_title_style(o_palette: IColorPalette): CSSProperties {
  return {
    margin: 0,
    fontSize: "12px",
    fontWeight: 800,
    color: o_palette.s_text,
  };
}

function get_summary_meta_style(): CSSProperties {
  return {
    margin: "1px 0 0 0",
    fontSize: "11px",
    color: "var(--color_text_muted)",
  };
}

function get_subgroup_container_style(): CSSProperties {
  return {
    padding: "0 8px 8px 18px",
  };
}

function get_tool_list_style(): CSSProperties {
  return {
    display: "grid",
    gap: "6px",
    padding: "6px 0 0 0",
  };
}

function get_tool_card_style(o_palette: IColorPalette): CSSProperties {
  return {
    border: "1px solid " + o_palette.s_border,
    borderRadius: "10px",
    padding: "10px",
    background:
      "linear-gradient(180deg, " +
      o_palette.s_background +
      " 0%, " +
      o_palette.s_background_soft +
      " 100%)",
    boxShadow: "var(--shadow_sm)",
    display: "grid",
    gap: "8px",
  };
}

function get_tool_header_style(): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  };
}

function get_tool_title_row_style(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  };
}

function get_tool_icon_style(_o_palette: IColorPalette): CSSProperties {
  return {
    width: "26px",
    height: "26px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

function get_tool_name_style(): CSSProperties {
  return {
    margin: 0,
    fontSize: "12px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_description_box_style(): CSSProperties {
  return {
    fontSize: "11px",
    lineHeight: 1.45,
    color: "var(--color_text_muted)",
  };
}

function get_long_description_box_style(): CSSProperties {
  return {
    fontSize: "11px",
    lineHeight: 1.5,
    color: "var(--color_text)",
    background: "rgba(255, 255, 255, 0.5)",
    border: "1px solid var(--color_border)",
    borderRadius: "10px",
    padding: "8px 10px",
    whiteSpace: "pre-wrap",
  };
}

function get_action_row_style(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap",
  };
}

function get_add_button_style(o_palette: IColorPalette): CSSProperties {
  return {
    border: "1px solid " + o_palette.s_border,
    background: o_palette.s_badge_background,
    color: o_palette.s_badge_text,
    borderRadius: "10px",
    padding: "7px 10px",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "var(--shadow_sm)",
  };
}

function get_empty_style(): CSSProperties {
  return {
    border: "1px dashed var(--color_border_strong)",
    borderRadius: "12px",
    padding: "14px",
    background: "var(--color_panel)",
    color: "var(--color_text_muted)",
    fontSize: "12px",
  };
}

function get_safe_text(value: unknown, s_fallback = "-"): string {
  if (typeof value === "string") {
    const s_trimmed = value.trim();
    return s_trimmed !== "" ? s_trimmed : s_fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return s_fallback;
}

function get_summary_chevron_style(b_open: boolean = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    height: "18px",
    borderRadius: "999px",
    border: "1px solid var(--color_border)",
    background: "var(--color_panel)",
    color: "var(--color_text_muted)",
    fontSize: "11px",
    fontWeight: 800,
    lineHeight: 1,
    transform: b_open ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.18s ease",
    flexShrink: 0,
  };
}


function normalize_search_text(s_value: string): string {
  return s_value.trim().toLowerCase();
}

function build_description_extension(s_label: string, s_description: string): string {
  const s_safe_label = get_safe_text(s_label, "Dieses Tool");
  const s_safe_description = get_safe_text(
    s_description,
    "Keine Beschreibung vorhanden.",
  );
  return (
    s_safe_label +
    " ist ein Tool fuer einen einzelnen Arbeitsschritt in einem KI Workflow. " +
    s_safe_description +
    " Dadurch eignet sich das Tool, um Daten gezielt zu uebernehmen, zu verarbeiten oder an den naechsten Schritt im Workflow zu uebergeben."
  );
}

function build_use_cases_text(
  s_type: string,
  s_label: string,
  s_description: string,
  s_group: string,
  s_subgroup: string,
): string {
  const s_type_lower = s_type.toLowerCase();
  const s_label_lower = s_label.toLowerCase();
  const s_description_lower = s_description.toLowerCase();

  if (
    s_type_lower.includes("mail") ||
    s_type_lower.includes("email") ||
    s_label_lower.includes("mail") ||
    s_description_lower.includes("mail")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "E Mails einlesen und Inhalte von einer KI klassifizieren lassen, " +
      "Antwortentwuerfe fuer Anfragen erzeugen, " +
      "Benachrichtigungen oder Ergebnisse nach einem automatisierten Prozess versenden."
    );
  }

  if (
    s_type_lower.includes("file") ||
    s_type_lower.includes("document") ||
    s_type_lower.includes("pdf") ||
    s_description_lower.includes("datei") ||
    s_description_lower.includes("dokument")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "Dateien aus einem Verzeichnis laden, " +
      "Dokumente fuer OCR oder Inhaltsanalyse vorbereiten, " +
      "Ergebnisse aus einem KI Agenten als Datei speichern oder exportieren."
    );
  }

  if (
    s_type_lower.includes("api") ||
    s_type_lower.includes("http") ||
    s_type_lower.includes("web") ||
    s_description_lower.includes("api") ||
    s_description_lower.includes("schnittstelle")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "Daten aus einem CRM oder ERP fuer einen KI Agenten abrufen, " +
      "Analyse Ergebnisse an externe Systeme senden, " +
      "Web Dienste in einen automatisierten RPA oder Agenten Ablauf einbinden."
    );
  }

  if (
    s_type_lower.includes("database") ||
    s_type_lower.includes("sql") ||
    s_type_lower.includes("table") ||
    s_description_lower.includes("datenbank") ||
    s_description_lower.includes("tabelle")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "Kontextdaten fuer Prompts aus einer Datenbank laden, " +
      "Ergebnisse einer KI Analyse strukturiert speichern, " +
      "Datensaetze fuer nachfolgende RPA Schritte aktualisieren."
    );
  }

  if (
    s_type_lower.includes("image") ||
    s_type_lower.includes("vision") ||
    s_type_lower.includes("scan") ||
    s_description_lower.includes("bild") ||
    s_description_lower.includes("ocr")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "Scans oder Belege fuer Texterkennung vorbereiten, " +
      "Bildinhalte durch eine KI pruefen lassen, " +
      "visuelle Daten fuer einen Agenten oder Folgeprozess bereitstellen."
    );
  }

  if (
    s_type_lower.includes("audio") ||
    s_type_lower.includes("speech") ||
    s_type_lower.includes("voice") ||
    s_description_lower.includes("audio") ||
    s_description_lower.includes("sprache")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "Audio in Text umwandeln, " +
      "Gespraeche analysieren und zusammenfassen, " +
      "Sprachdaten als Eingabe fuer weitere KI oder RPA Schritte verwenden."
    );
  }

  if (
    s_type_lower.includes("calendar") ||
    s_description_lower.includes("termin") ||
    s_description_lower.includes("kalender")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "Termine automatisch anlegen, " +
      "Verfuegbarkeiten in einem Assistenz Agenten pruefen, " +
      "zeitgesteuerte Aktionen oder Erinnerungen ausloesen."
    );
  }

  if (
    s_type_lower.includes("ai") ||
    s_type_lower.includes("llm") ||
    s_type_lower.includes("prompt") ||
    s_description_lower.includes("ki") ||
    s_description_lower.includes("analyse") ||
    s_description_lower.includes("klassifikation")
  ) {
    return (
      "Beispiele fuer die Anwendung im KI Workflow: " +
      "Texte klassifizieren, " +
      "Informationen aus unstrukturierten Daten extrahieren, " +
      "Zusammenfassungen, Empfehlungen oder Antworten fuer einen KI Agenten erzeugen."
    );
  }

  return (
    "Beispiele fuer die Anwendung im KI Workflow: " +
    "Daten aus vorherigen Nodes uebernehmen und weiterverarbeiten, " +
    "einen RPA Ablauf mit einem KI Agenten verbinden, " +
    "Arbeitsschritte aus der Gruppe " +
    s_group +
    " und der Untergruppe " +
    s_subgroup +
    " sauber in einen automatisierten Gesamtprozess einbauen."
  );
}

function build_long_description(o_item: {
  s_label: string;
  s_type: TNodeType | string;
  s_description: string;
  s_group: string;
  s_subgroup: string;
  s_source: TToolSource;
}): string {
  /*
  history:
  - 2026-03-29: Einheitliche Langbeschreibung fuer Standard und Registry Tools erstellt. author Marcus Schlieper
  - 2026-03-29: Langbeschreibung neu aufgebaut. author Marcus Schlieper
  */
  const s_label = get_safe_text(o_item.s_label, "Unknown Tool");
  const s_type = get_safe_text(o_item.s_type, "unknown_type");
  const s_description = get_safe_text(
    o_item.s_description,
    "Keine Beschreibung vorhanden.",
  );
  const s_group = get_safe_text(o_item.s_group, "Other");
  const s_subgroup = get_safe_text(o_item.s_subgroup, "General");
  const s_description_extension = build_description_extension(
    s_label,
    s_description,
  );
  const s_use_cases = build_use_cases_text(
    s_type,
    s_label,
    s_description,
    s_group,
    s_subgroup,
  );
  return [s_description_extension, s_use_cases].join(" ");
}

function matches_search(o_item: IAvailableToolItem, s_query: string): boolean {
  if (s_query === "") {
    return true;
  }
  const a_search_parts: string[] = [
    o_item.s_label,
    String(o_item.s_type),
    o_item.s_description,
    o_item.s_long_description,
    o_item.s_group,
    o_item.s_subgroup,
    o_item.s_icon,
    o_item.s_source,
    o_item.s_color,
  ];
  return a_search_parts.join(" ").toLowerCase().includes(s_query);
}

function build_tool_tree(a_items: IAvailableToolItem[]): IToolGroupNode[] {
  const o_group_map: Record<string, IToolGroupNode> = {};
  for (const o_item of a_items) {
    const s_group = o_item.s_group || "Other";
    const s_subgroup = o_item.s_subgroup || "General";
    if (!o_group_map[s_group]) {
      o_group_map[s_group] = {
        s_group,
        o_subgroups: {},
      };
    }
    if (!o_group_map[s_group].o_subgroups[s_subgroup]) {
      o_group_map[s_group].o_subgroups[s_subgroup] = [];
    }
    o_group_map[s_group].o_subgroups[s_subgroup].push(o_item);
  }

  return Object.values(o_group_map)
    .sort((o_left, o_right) => o_left.s_group.localeCompare(o_right.s_group))
    .map((o_group_node) => {
      const o_sorted_subgroups: Record<string, IAvailableToolItem[]> = {};
      const a_subgroup_entries = Object.entries(o_group_node.o_subgroups).sort(
        (o_left, o_right) => o_left[0].localeCompare(o_right[0]),
      );
      for (const [s_subgroup, a_tools] of a_subgroup_entries) {
        o_sorted_subgroups[s_subgroup] = [...a_tools].sort((o_left, o_right) =>
          o_left.s_label.localeCompare(o_right.s_label),
        );
      }
      return {
        s_group: o_group_node.s_group,
        o_subgroups: o_sorted_subgroups,
      };
    });
}

function get_color_palette_by_key(s_key: string): IColorPalette {
  const a_palettes: IColorPalette[] = [
    {
      s_border: "#2563eb",
      s_background: "#eff6ff",
      s_background_soft: "#dbeafe",
      s_text: "#1e3a8a",
      s_badge_background: "#2563eb",
      s_badge_text: "#ffffff",
    },
    {
      s_border: "#7c3aed",
      s_background: "#f5f3ff",
      s_background_soft: "#ede9fe",
      s_text: "#5b21b6",
      s_badge_background: "#7c3aed",
      s_badge_text: "#ffffff",
    },
    {
      s_border: "#059669",
      s_background: "#ecfdf5",
      s_background_soft: "#d1fae5",
      s_text: "#065f46",
      s_badge_background: "#059669",
      s_badge_text: "#ffffff",
    },
    {
      s_border: "#ea580c",
      s_background: "#fff7ed",
      s_background_soft: "#ffedd5",
      s_text: "#9a3412",
      s_badge_background: "#ea580c",
      s_badge_text: "#ffffff",
    },
    {
      s_border: "#db2777",
      s_background: "#fdf2f8",
      s_background_soft: "#fce7f3",
      s_text: "#9d174d",
      s_badge_background: "#db2777",
      s_badge_text: "#ffffff",
    },
    {
      s_border: "#0891b2",
      s_background: "#ecfeff",
      s_background_soft: "#cffafe",
      s_text: "#155e75",
      s_badge_background: "#0891b2",
      s_badge_text: "#ffffff",
    },
    {
      s_border: "#65a30d",
      s_background: "#f7fee7",
      s_background_soft: "#ecfccb",
      s_text: "#3f6212",
      s_badge_background: "#65a30d",
      s_badge_text: "#ffffff",
    },
    {
      s_border: "#dc2626",
      s_background: "#fef2f2",
      s_background_soft: "#fee2e2",
      s_text: "#991b1b",
      s_badge_background: "#dc2626",
      s_badge_text: "#ffffff",
    },
  ];

  const s_safe_key = s_key.trim().toLowerCase();
  let i_hash = 0;
  for (let i_index = 0; i_index < s_safe_key.length; i_index += 1) {
    i_hash = (i_hash * 31 + s_safe_key.charCodeAt(i_index)) >>> 0;
  }
  return a_palettes[i_hash % a_palettes.length];
}

function get_icon_component_by_name(s_icon: string): LucideIcon {
  const o_icon_map: Record<string, LucideIcon> = {
    activity: Activity,
    align_left: AlignLeft,
    "align-left": AlignLeft,
    archive: Archive,
    arrow_down_to_line: ArrowDownToLine,
    "arrow-down-to-line": ArrowDownToLine,
    arrow_up_to_line: ArrowUpToLine,
    "arrow-up-to-line": ArrowUpToLine,
    at_sign: AtSign,
    "at-sign": AtSign,
    audio_lines: AudioLines,
    "audio-lines": AudioLines,
    audio_waveform: AudioWaveform,
    "audio-waveform": AudioWaveform,
    badge_check: BadgeCheck,
    "badge-check": BadgeCheck,
    badge_euro: BadgeEuro,
    "badge-euro": BadgeEuro,
    barcode: Barcode,
    bar_chart_3: BarChart3,
    "bar-chart-3": BarChart3,
    bell: Bell,
    binary: Binary,
    book_open_check: BookOpenCheck,
    "book-open-check": BookOpenCheck,
    bot: Bot,
    braces: Braces,
    briefcase: Briefcase,
    briefcase_business: BriefcaseBusiness,
    "briefcase-business": BriefcaseBusiness,
    building: Building,
    calendar: Calendar,
    calendar_range: CalendarRange,
    "calendar-range": CalendarRange,
    calendar_search: CalendarSearch,
    "calendar-search": CalendarSearch,
    calendar_sync: CalendarSync,
    "calendar-sync": CalendarSync,
    calendar_x: CalendarX,
    "calendar-x": CalendarX,
    check_check: CheckCheck,
    "check-check": CheckCheck,
    check_circle: CheckCircle,
    "check-circle": CheckCircle,
    check_square: CheckSquare,
    "check-square": CheckSquare,
    clapperboard: Clapperboard,
    clipboard_list: ClipboardList,
    "clipboard-list": ClipboardList,
    cloud: Cloud,
    code_2: Code2,
    "code-2": Code2,
    code_xml: CodeXml,
    "code-xml": CodeXml,
    comment: MessageSquare,
    message_square: MessageSquare,
    "message-square": MessageSquare,
    contact: ContactRound,
    contact_round: ContactRound,
    "contact-round": ContactRound,
    copy: Copy,
    copy_plus: CopyPlus,
    "copy-plus": CopyPlus,
    cylinder: Cylinder,
    database: Database,
    download: Download,
    expand: Expand,
    file: File,
    file_code: FileCode,
    "file-code": FileCode,
    file_input: FileInput,
    "file-input": FileInput,
    file_json: FileJson,
    "file-json": FileJson,
    file_output: FileOutput,
    "file-output": FileOutput,
    file_plus: FilePlus,
    "file-plus": FilePlus,
    file_search: FileSearch,
    "file-search": FileSearch,
    file_text: FileText,
    "file-text": FileText,
    flag: Flag,
    folder: Folder,
    folder_plus: FolderPlus,
    "folder-plus": FolderPlus,
    forward: Forward,
    git_branch: GitBranch,
    "git-branch": GitBranch,
    globe: Globe,
    globe_2: Globe2,
    "globe-2": Globe2,
    hash: Hash,
    heart_pulse: HeartPulse,
    "heart-pulse": HeartPulse,
    image: Image,
    image_plus: ImagePlus,
    "image-plus": ImagePlus,
    inbox: Inbox,
    key: Key,
    key_round: KeyRound,
    "key-round": KeyRound,
    key_square: KeySquare,
    "key-square": KeySquare,
    languages: Languages,
    layers: Layers,
    link: Link,
    list: List,
    list_checks: ListChecks,
    "list-checks": ListChecks,
    lock: Lock,
    logs: Logs,
    mail: Mail,
    mail_open: MailOpen,
    "mail-open": MailOpen,
    memory_stick: MemoryStick,
    "memory-stick": MemoryStick,
    message_circle: MessageCircle,
    "message-circle": MessageCircle,
    mic: Mic,
    minimize: Minimize,
    move: Move,
    newspaper: Newspaper,
    notebook_pen: NotebookPen,
    "notebook-pen": NotebookPen,
    package_open: PackageOpen,
    "package-open": PackageOpen,
    pen_tool: PenTool,
    "pen-tool": PenTool,
    phone_call: PhoneCall,
    "phone-call": PhoneCall,
    phone_off: PhoneOff,
    "phone-off": PhoneOff,
    play: Play,
    plus: Plus,
    plus_square: PlusSquare,
    "plus-square": PlusSquare,
    presentation: Presentation,
    printer: Printer,
    qr_code: QrCode,
    "qr-code": QrCode,
    radar: Radar,
    receipt: Receipt,
    refresh_ccw: RefreshCcw,
    "refresh-ccw": RefreshCcw,
    repeat: Repeat,
    reply: Reply,
    replace: Replace,
    rss: Rss,
    save: Save,
    scan: Scan,
    scan_face: ScanFace,
    "scan-face": ScanFace,
    scan_text: ScanText,
    "scan-text": ScanText,
    scissors: Scissors,
    search: Search,
    search_check: SearchCheck,
    "search-check": SearchCheck,
    send: Send,
    send_horizontal: SendHorizontal,
    "send-horizontal": SendHorizontal,
    server: Server,
    server_cog: ServerCog,
    "server-cog": ServerCog,
    server_crash: ServerCrash,
    "server-crash": ServerCrash,
    sheet: Sheet,
    shield: Shield,
    shield_check: ShieldCheck,
    "shield-check": ShieldCheck,
    shopping_cart: ShoppingCart,
    "shopping-cart": ShoppingCart,
    shuffle: Shuffle,
    smile: Smile,
    smartphone: Smartphone,
    sparkles: Sparkles,
    split: Split,
    star: Star,
    sticky_note: StickyNote,
    "sticky-note": StickyNote,
    table: Table,
    table_properties: TableProperties,
    "table-properties": TableProperties,
    tag: Tag,
    tags: Tags,
    trash: Trash,
    trash_2: Trash2,
    "trash-2": Trash2,
    triangle_alert: TriangleAlert,
    "triangle-alert": TriangleAlert,
    unlock: Unlock,
    upload: Upload,
    user_cog: UserCog,
    "user-cog": UserCog,
    user_plus: UserPlus,
    "user-plus": UserPlus,
    users: Users,
    video: Video,
    volume_2: Volume2,
    "volume-2": Volume2,
    wand_2: Wand2,
    "wand-2": Wand2,
    webhook: Webhook,
    workflow: Workflow,
    x_circle: XCircle,
    "x-circle": XCircle,
  };

  const s_safe_icon = s_icon.trim().toLowerCase();
  return o_icon_map[s_safe_icon] ?? Layers;
}

function render_named_icon(s_icon: string, o_style?: CSSProperties): JSX.Element {
  const IconComponent = get_icon_component_by_name(s_icon);
  return <IconComponent size={14} style={o_style} />;
}

function get_node_kind_by_type(s_type: string): TNodeKind | null {
  const s_safe_type = s_type.trim().toLowerCase();

  if (s_safe_type === "start") {
    return "start";
  }
  if (s_safe_type === "end") {
    return "end";
  }
    if (s_safe_type === "show") {
    return "show";
  }
  if (s_safe_type === "llm") {
    return "llm";
  }

  if (s_safe_type === "classifier" || s_safe_type === "classifier_node") {
    return "classifier";
  }

  if (s_safe_type === "http") {
    return "http";
  }
  if (s_safe_type === "code") {
    return "code";
  }
  if (s_safe_type === "condition") {
    return "condition";
  }
  if (s_safe_type === "switch") {
    return "switch";
  }
  if (s_safe_type === "loop_for" || s_safe_type === "loop") {
    return "loop";
  }
  if (s_safe_type === "group") {
    return "group";
  }
  if (s_safe_type === "comment") {
    return "comment";
  }
  return null;
}

function render_tool_visual(
  s_type: string,
  s_icon: string,
  o_palette: IColorPalette,
): JSX.Element {
  const s_node_kind = get_node_kind_by_type(s_type);

  if (s_node_kind !== null) {
    return (
      <div style={get_tool_icon_style(o_palette)}>
        <NodeTypeIcon
          s_kind={s_node_kind === "classifier" ? "tool" : s_node_kind}
        />
      </div>
    );
  }

  return (
    <div style={get_tool_icon_style(o_palette)}>
      {render_named_icon(s_icon, {
        width: "14px",
        height: "14px",
      })}
    </div>
  );
}


function get_builtin_standard_nodes(): IToolTreePanelProps["a_standard_tools"] {
  return [
    {
      s_type: "start" as TNodeType,
      s_label: "Start",
      s_description: "Startpunkt fuer einen Workflow mit definierten Ausgaengen.",
      s_group: "Workflow",
      s_subgroup: "Control",
      s_icon: "play",
    },
    {
      s_type: "end" as TNodeType,
      s_label: "End",
      s_description: "Endpunkt fuer das finale Ergebnis oder den Abschlussstatus.",
      s_group: "Workflow",
      s_subgroup: "Control",
      s_icon: "check-circle",
    },
    {
      s_type: "show" as TNodeType,
      s_label: "Show",
      s_description: "Endpunkt fuer ein finale Ergebnis",
      s_group: "Workflow",
      s_subgroup: "Control",
      s_icon: "check-circle",
    },
    {
      s_type: "llm" as TNodeType,
      s_label: "LLM",
      s_description: "KI Modell Node fuer Prompt Verarbeitung und Antworten.",
      s_group: "AI",
      s_subgroup: "Models",
      s_icon: "sparkles",
    },
    {
      s_type: "http" as TNodeType,
      s_label: "HTTP",
      s_description: "HTTP Request Node fuer externe APIs und Web Services.",
      s_group: "Integration",
      s_subgroup: "Network",
      s_icon: "globe",
    },
    {
      s_type: "code" as TNodeType,
      s_label: "Code",
      s_description: "Code Node fuer benutzerdefinierte Logik und Verarbeitung.",
      s_group: "Logic",
      s_subgroup: "Execution",
      s_icon: "code-2",
    },
    {
      s_type: "condition" as TNodeType,
      s_label: "Condition",
      s_description: "Bedingungspruefung mit true und false Ausgaengen.",
      s_group: "Logic",
      s_subgroup: "Control",
      s_icon: "git-branch",
    },
    {
      s_type: "switch" as TNodeType,
      s_label: "Switch",
      s_description: "Auswahl mehrerer Pfade anhand von Cases und Default.",
      s_group: "Logic",
      s_subgroup: "Control",
      s_icon: "split",
    },
    {
      s_type: "classifier" as TNodeType,
      s_label: "Classifier",
      s_description: "Klassifiziert Inhalte in definierte Kategorien fuer weitere Workflow Pfade.",
      s_group: "AI",
      s_subgroup: "Classification",
      s_icon: "badge-check",
    },
    {
      s_type: "loop_for" as TNodeType,
      s_label: "Loop For",
      s_description: "Schleife fuer Listen oder wiederholte Verarbeitung.",
      s_group: "Logic",
      s_subgroup: "Iteration",
      s_icon: "repeat",
    },
    {
      s_type: "group" as TNodeType,
      s_label: "Group",
      s_description: "Logische Gruppierung mehrerer Nodes innerhalb eines Bereichs.",
      s_group: "Workflow",
      s_subgroup: "Structure",
      s_icon: "layers",
    },
    {
      s_type: "comment" as TNodeType,
      s_label: "Comment",
      s_description: "Kommentar Node fuer Hinweise und Dokumentation im Canvas.",
      s_group: "Workflow",
      s_subgroup: "Documentation",
      s_icon: "message-square",
    },
  ];
}

function merge_standard_tools(
  a_input_standard_tools: IToolTreePanelProps["a_standard_tools"],
): IToolTreePanelProps["a_standard_tools"] {
  const a_builtin_standard_nodes = get_builtin_standard_nodes();
  const a_safe_input_standard_tools = Array.isArray(a_input_standard_tools)
    ? a_input_standard_tools
    : [];
  const o_seen_by_type: Record<string, boolean> = {};
  const a_result: IToolTreePanelProps["a_standard_tools"] = [];

  for (const o_item of [...a_builtin_standard_nodes, ...a_safe_input_standard_tools]) {
    if (!o_item || typeof o_item !== "object") {
      continue;
    }

    const s_type =
      typeof o_item.s_type === "string" && o_item.s_type.trim() !== ""
        ? o_item.s_type.trim()
        : "";

    if (s_type === "" || o_seen_by_type[s_type] === true) {
      continue;
    }

    o_seen_by_type[s_type] = true;

    a_result.push({
      s_type: o_item.s_type,
      s_label: get_safe_text(o_item.s_label, s_type),
      s_description: get_safe_text(
        o_item.s_description,
        "Keine Beschreibung vorhanden.",
      ),
      s_group: get_safe_text(o_item.s_group, "Other"),
      s_subgroup: get_safe_text(o_item.s_subgroup, "General"),
      s_icon: get_safe_text(o_item.s_icon, "layers"),
    });
  }

  return a_result;
}

export function ToolTreePanel({
  a_standard_tools,
}: IToolTreePanelProps): JSX.Element {
  const { a_tool_schemas } = use_tool_registry_store();
  const { add_node } = use_workflow_store();
  const [s_search, set_search] = useState("");

  const a_merged_standard_tools = useMemo(() => {
    return merge_standard_tools(a_standard_tools);
  }, [a_standard_tools]);

  const a_available_tools = useMemo((): IAvailableToolItem[] => {
    const a_standard_items: IAvailableToolItem[] = a_merged_standard_tools.map(
      (o_item) => {
        const s_description = get_safe_text(
          o_item.s_description,
          "Keine Beschreibung vorhanden.",
        );
        const o_palette = get_color_palette_by_key(
          "tool_" +
            o_item.s_group +
            "_" +
            o_item.s_subgroup +
            "_" +
            o_item.s_label,
        );
        return {
          s_id: "standard_" + o_item.s_type,
          s_label: o_item.s_label,
          s_type: o_item.s_type,
          s_description,
          s_long_description: build_long_description({
            s_label: o_item.s_label,
            s_type: o_item.s_type,
            s_description,
            s_group: o_item.s_group,
            s_subgroup: o_item.s_subgroup,
            s_source: "standard",
          }),
          s_group: o_item.s_group,
          s_subgroup: o_item.s_subgroup,
          s_icon: o_item.s_icon,
          s_source: "standard",
          s_color: o_palette.s_border,
        };
      },
    );

    const a_dynamic_items: IAvailableToolItem[] = a_tool_schemas.map(
      (o_tool_schema) => {
        const s_label =
          typeof o_tool_schema.s_label === "string" &&
          o_tool_schema.s_label.trim() !== ""
            ? o_tool_schema.s_label
            : o_tool_schema.s_type;
        const s_description =
          typeof o_tool_schema.s_description === "string" &&
          o_tool_schema.s_description.trim() !== ""
            ? o_tool_schema.s_description
            : "Keine Beschreibung vorhanden.";
        const s_group =
          typeof o_tool_schema.s_group === "string" &&
          o_tool_schema.s_group.trim() !== ""
            ? o_tool_schema.s_group
            : typeof o_tool_schema.s_category === "string" &&
                o_tool_schema.s_category.trim() !== ""
              ? o_tool_schema.s_category
              : "Other";
        const s_subgroup =
          typeof o_tool_schema.s_subgroup === "string" &&
          o_tool_schema.s_subgroup.trim() !== ""
            ? o_tool_schema.s_subgroup
            : "General";
        const o_palette = get_color_palette_by_key(
          "tool_" + s_group + "_" + s_subgroup + "_" + s_label,
        );
        return {
          s_id: "dynamic_" + o_tool_schema.s_type,
          s_label,
          s_type: o_tool_schema.s_type,
          s_description,
          s_long_description: build_long_description({
            s_label,
            s_type: o_tool_schema.s_type,
            s_description,
            s_group,
            s_subgroup,
            s_source: "dynamic",
          }),
          s_group,
          s_subgroup,
          s_icon:
            typeof o_tool_schema.s_icon === "string" &&
            o_tool_schema.s_icon.trim() !== ""
              ? o_tool_schema.s_icon
              : "layers",
          s_source: "dynamic",
          s_color: o_palette.s_border,
          o_tool_schema,
        };
      },
    );

    const a_safe_standard_items = Array.isArray(a_standard_items)
      ? a_standard_items
      : [];
    const a_safe_dynamic_items = Array.isArray(a_dynamic_items)
      ? a_dynamic_items
      : [];

    return [...a_safe_standard_items, ...a_safe_dynamic_items].sort(
      (o_left, o_right) => {
        const s_left =
          o_left.s_group + " " + o_left.s_subgroup + " " + o_left.s_label;
        const s_right =
          o_right.s_group + " " + o_right.s_subgroup + " " + o_right.s_label;
        return s_left.localeCompare(s_right);
      },
    );
  }, [a_merged_standard_tools, a_tool_schemas]);

  const s_normalized_search = useMemo(
    () => normalize_search_text(s_search),
    [s_search],
  );

  const a_filtered_tools = useMemo(() => {
    return a_available_tools.filter((o_item) =>
      matches_search(o_item, s_normalized_search),
    );
  }, [a_available_tools, s_normalized_search]);

  const a_tree = useMemo(() => build_tool_tree(a_filtered_tools), [a_filtered_tools]);

  const i_group_count = a_tree.length;
  const i_subgroup_count = a_tree.reduce(
    (i_total, o_group) => i_total + Object.keys(o_group.o_subgroups).length,
    0,
  );
  const i_tool_count = a_filtered_tools.length;

  function on_add_tool(o_item: IAvailableToolItem): void {
    /*
    history:
    - 2026-03-29: Sichere Behandlung fuer Standard und Registry Tools. author Marcus Schlieper
    - 2026-04-11: Ergaenzte Standard Nodes werden wie normale Standard Tools behandelt. author Marcus Schlieper
    - 2026-04-12: classifier_node wird wie Standard Node behandelt. author Marcus Schlieper
    */
    if (o_item.s_source === "dynamic" && o_item.o_tool_schema) {
      add_node(o_item.s_type as TNodeType, o_item.o_tool_schema);
      return;
    }
    add_node(o_item.s_type as TNodeType);
  }

  function on_search_change(o_event: ChangeEvent<HTMLInputElement>): void {
    const s_value =
      typeof o_event.target.value === "string" ? o_event.target.value : "";
    set_search(s_value);
  }

  return (
    <div style={get_wrapper_style()}>
      <div style={get_header_card_style()}>
        <h3 style={get_title_style()}>Tools</h3>
        <p style={get_text_style()}>
          Tools koennen gesucht, aufgeklappt und direkt zum Canvas hinzugefuegt werden.
        </p>
        <input
          value={s_search}
          onChange={on_search_change}
          placeholder="Tools suchen"
          style={get_search_input_style()}
        />
        <div style={get_stats_style()}>
          <span style={get_stat_badge_style()}>Groups: {i_group_count}</span>
          <span style={get_stat_badge_style()}>Subgroups: {i_subgroup_count}</span>
          <span style={get_stat_badge_style()}>Tools: {i_tool_count}</span>
        </div>
      </div>

      <div style={get_tree_container_style()}>
        {a_tree.length === 0 ? (
          <div style={get_empty_style()}>
            Keine Tools zur aktuellen Suche gefunden.
          </div>
        ) : (
          <>
            {a_tree.map((o_group) => {
              const o_group_palette = get_color_palette_by_key(
                "group_" + o_group.s_group,
              );
              const i_group_tool_count = Object.values(o_group.o_subgroups).reduce(
                (i_total, a_tools) => i_total + a_tools.length,
                0,
              );

              return (
                <details key={o_group.s_group} style={get_group_details_style(o_group_palette)}>
                  <summary style={get_summary_style(o_group_palette)}>
                    <div style={get_summary_left_style()}>
                      <span style={get_branch_icon_style(o_group_palette)}>G</span>
                      <div>
                        <p style={get_summary_title_style(o_group_palette)}>
                          {o_group.s_group}
                        </p>
                        <p style={get_summary_meta_style()}>
                          {Object.keys(o_group.o_subgroups).length} Subgroups und{" "}
                          {i_group_tool_count} Tools
                        </p>
                      </div>
                    </div>
                    <div style={get_summary_chevron_style(false)}>v</div>
                  </summary>

                  <div style={get_subgroup_container_style()}>
                    {Object.entries(o_group.o_subgroups).map(([s_subgroup, a_tools]) => {
                      const o_subgroup_palette = get_color_palette_by_key(
                        "subgroup_" + o_group.s_group + "_" + s_subgroup,
                      );

                      return (
                        <details
                          key={s_subgroup}
                          style={get_group_details_style(o_subgroup_palette)}
                        >
                          <summary style={get_summary_style(o_subgroup_palette)}>
                            <div style={get_summary_left_style()}>
                              <span style={get_branch_icon_style(o_subgroup_palette)}>S</span>
                              <div>
                                <p style={get_summary_title_style(o_subgroup_palette)}>
                                  {s_subgroup}
                                </p>
                                <p style={get_summary_meta_style()}>{a_tools.length} Tools</p>
                              </div>
                            </div>
                            <div style={get_summary_chevron_style(false)}>v</div>
                          </summary>

                          <div style={get_tool_list_style()}>
                            {a_tools.map((o_tool) => {
                              const o_tool_palette = get_color_palette_by_key(
                                "tool_" +
                                  o_tool.s_group +
                                  "_" +
                                  o_tool.s_subgroup +
                                  "_" +
                                  o_tool.s_label,
                              );

                              return (
                                <div key={o_tool.s_id} style={get_tool_card_style(o_tool_palette)}>
                                  <div style={get_tool_header_style()}>
                                    <div style={get_tool_title_row_style()}>
                                      {render_tool_visual(
                                        String(o_tool.s_type),
                                        o_tool.s_icon,
                                        o_tool_palette,
                                      )}
                                      <p style={get_tool_name_style()}>{o_tool.s_label}</p>
                                    </div>
                                    <div style={get_color_chip_style(o_tool.s_color)} />
                                  </div>

                                  <div style={get_description_box_style()}>
                                    {get_safe_text(
                                      o_tool.s_description,
                                      "Keine Beschreibung vorhanden.",
                                    )}
                                  </div>

                                  <details>
                                    <summary style={get_text_style()}>
                                      Langbeschreibung anzeigen
                                    </summary>
                                    <div style={get_long_description_box_style()}>
                                      {get_safe_text(
                                        o_tool.s_long_description,
                                        "Keine Langbeschreibung vorhanden.",
                                      )}
                                    </div>
                                  </details>

                                  <div style={get_action_row_style()}>
                                    <span style={get_stat_badge_style()}>
                                      Quelle: {get_safe_text(o_tool.s_source, "unknown")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => on_add_tool(o_tool)}
                                      style={get_add_button_style(o_tool_palette)}
                                    >
                                      Add to Canvas
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

