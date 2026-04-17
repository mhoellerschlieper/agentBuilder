/* file: frontend/src/components/nodes/tool_node.tsx
description: Generische Darstellung fuer JSON basierte Tool Nodes mit
kompaktem Design, sichtbaren Handles und Anzeige des gleichen Icons
wie im tool_tree_panel fuer nicht Standard Workflow Nodes.
history:
- 2026-03-28: Erstellt fuer dynamische Tool Node Anzeige und Inline Bearbeitung. author Marcus Schlieper
- 2026-03-28: Komplett ueberarbeitet fuer saubere Node Box und geordnetes Formular Layout. author Marcus Schlieper
- 2026-03-29: Header Farbe wird direkt aus tool.s_color uebernommen. author Marcus Schlieper
- 2026-04-06: Benannte Handle Definitionen mit Rueckwaertskompatibilitaet zu String Listen erweitert. author Marcus Schlieper
- 2026-04-06: Runtime Ergebnisanzeige und sichtbare Handle Labels ergaenzt. author Marcus Schlieper
- 2026-04-06: Bottom Outputs und Event Handles ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon Design an neues Node Layout angepasst. author Marcus Schlieper
- 2026-04-11: Nicht Standard Workflow Nodes nutzen jetzt dasselbe Icon wie im tool_tree_panel. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Handles integriert. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import type { CSSProperties, JSX } from "react";
import { type NodeProps } from "@xyflow/react";
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
import { NodeDeleteButton } from "../node_delete_button";
import { use_workflow_store } from "../../store/workflow_store";
import { use_tool_registry_store } from "../../store/tool_registry_store";
import type {
  IToolNodeData,
  IToolFieldDefinition,
} from "../../types/tool_registry";
import { ToolVariableSelector } from "../tool_variable_selector";
import {
  THandleDefinition,
  NodeDetailsSection,
  RenderEventHandles,
  RenderNamedHandles,
  RenderRuntimeResult,
  get_meta_style,
  get_input_style as get_shared_input_style,
} from "./node_runtime_helpers";

function get_string_value(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return "";
}

function get_safe_text(value: unknown, s_fallback = ""): string {
  if (typeof value === "string") {
    const s_trimmed = value.trim();
    return s_trimmed !== "" ? s_trimmed : s_fallback;
  }
  return s_fallback;
}

function get_boolean_value(value: unknown): boolean {
  return value === true;
}

function get_safe_color(s_color: unknown, s_fallback = "#2563eb"): string {
  if (typeof s_color !== "string") {
    return s_fallback;
  }
  const s_trimmed = s_color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s_trimmed) || /^#[0-9a-fA-F]{3}$/.test(s_trimmed)) {
    return s_trimmed;
  }
  return s_fallback;
}

function hex_to_rgba(s_hex_color: string, d_alpha: number): string {
  const s_safe_hex_color = get_safe_color(s_hex_color);
  let s_normalized = s_safe_hex_color.replace("#", "");
  if (s_normalized.length === 3) {
    s_normalized =
      s_normalized[0] +
      s_normalized[0] +
      s_normalized[1] +
      s_normalized[1] +
      s_normalized[2] +
      s_normalized[2];
  }
  const i_red = parseInt(s_normalized.slice(0, 2), 16);
  const i_green = parseInt(s_normalized.slice(2, 4), 16);
  const i_blue = parseInt(s_normalized.slice(4, 6), 16);
  if (!Number.isFinite(i_red) || !Number.isFinite(i_green) || !Number.isFinite(i_blue)) {
    return "rgba(37, 99, 235, 0.12)";
  }
  return "rgba(" + i_red + ", " + i_green + ", " + i_blue + ", " + d_alpha + ")";
}

function get_node_wrapper_style(s_tool_color: string, b_selected: boolean): CSSProperties {
  return {
    width: "320px",
    border: "1px solid " + (b_selected ? s_tool_color : "#dbe2ea"),
    borderRadius: "18px",
    backgroundColor: "#ffffff",
    boxShadow: b_selected
      ? "0 0 0 3px " + hex_to_rgba(s_tool_color, 0.18)
      : "0 14px 32px rgba(17, 24, 39, 0.08)",
    overflow: "visible",
    position: "relative",
    paddingBottom: "46px",
  };
}

function get_header_style(s_tool_color: string): CSSProperties {
  return {
    padding: "12px 14px",
    background:
      "linear-gradient(180deg, " +
      hex_to_rgba(s_tool_color, 0.18) +
      " 0%, rgba(255,255,255,0.98) 100%)",
    borderBottom: "1px solid " + hex_to_rgba(s_tool_color, 0.28),
    borderRadius: "18px 18px 0 0",
  };
}

function get_header_top_row_style(): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  };
}

function get_header_title_row_style(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  };
}

function get_color_chip_style(s_tool_color: string): CSSProperties {
  return {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    backgroundColor: s_tool_color,
    border: "1px solid rgba(0, 0, 0, 0.15)",
    flexShrink: 0,
    marginTop: "3px",
  };
}

function get_header_text_wrap_style(): CSSProperties {
  return {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  };
}

function get_title_style(): CSSProperties {
  return {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.3,
    wordBreak: "break-word",
  };
}

function get_type_style(): CSSProperties {
  return {
    margin: 0,
    fontSize: "11px",
    color: "#4b5563",
    wordBreak: "break-word",
  };
}

function get_description_style(): CSSProperties {
  return {
    margin: "8px 0 0 0",
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#374151",
    wordBreak: "break-word",
  };
}

function get_body_style(): CSSProperties {
  return {
    padding: "12px 14px 10px 14px",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };
}

function get_field_wrapper_style(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "10px",
  };
}

function get_label_style(): CSSProperties {
  return {
    fontSize: "12px",
    fontWeight: 700,
    color: "#374151",
  };
}

function get_input_style(): CSSProperties {
  return get_shared_input_style();
}

function get_tool_panel_icon_box_style(s_tool_color: string): CSSProperties {
  return {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, " +
      hex_to_rgba(s_tool_color, 0.18) +
      " 0%, rgba(255,255,255,0.98) 100%)",
    border: "1px solid " + hex_to_rgba(s_tool_color, 0.28),
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    color: s_tool_color,
    flexShrink: 0,
  };
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

function render_schema_icon(s_icon: string, s_tool_color: string): JSX.Element {
  const IconComponent = get_icon_component_by_name(s_icon);
  return (
    <div style={get_tool_panel_icon_box_style(s_tool_color)}>
      <IconComponent size={18} />
    </div>
  );
}

function normalize_handle_list(
  a_handles: unknown,
  s_prefix: "input" | "output",
  s_default_label: string,
): THandleDefinition[] {
  if (!Array.isArray(a_handles) || a_handles.length === 0) {
    return [
      {
        s_key: s_prefix + "_main",
        s_label: s_default_label,
        s_description: "",
      },
    ];
  }

  return a_handles
    .map((o_item, i_index) => {
      if (typeof o_item === "string") {
        return {
          s_key: o_item,
          s_label: o_item,
          s_description: "",
        };
      }

      if (typeof o_item === "object" && o_item !== null) {
        const o_handle = o_item as THandleDefinition;
        return {
          s_key:
            typeof o_handle.s_key === "string" && o_handle.s_key.trim() !== ""
              ? o_handle.s_key.trim()
              : s_prefix + "_" + String(i_index + 1),
          s_label:
            typeof o_handle.s_label === "string" && o_handle.s_label.trim() !== ""
              ? o_handle.s_label.trim()
              : typeof o_handle.s_key === "string" && o_handle.s_key.trim() !== ""
                ? o_handle.s_key.trim()
                : s_prefix + "_" + String(i_index + 1),
          s_description:
            typeof o_handle.s_description === "string" ? o_handle.s_description : "",
        };
      }

      return {
        s_key: s_prefix + "_" + String(i_index + 1),
        s_label: s_prefix + "_" + String(i_index + 1),
        s_description: "",
      };
    })
    .filter(
      (o_item) =>
        typeof o_item.s_key === "string" && o_item.s_key.trim() !== "",
    );
}

function render_input_field(
  o_field: IToolFieldDefinition,
  value: unknown,
  update_value: (s_key: string, value: unknown) => void,
): JSX.Element {
  if (o_field.s_field_type === "textarea") {
    return (
      <textarea
        value={get_string_value(value)}
        onChange={(o_event) => update_value(o_field.s_key, o_event.target.value)}
        rows={4}
        style={{
          ...get_input_style(),
          resize: "vertical",
          minHeight: "72px",
          fontFamily: "inherit",
        }}
      />
    );
  }

  if (o_field.s_field_type === "number") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : o_field.d_default ?? 0}
        onChange={(o_event) => {
          const d_value = Number(o_event.target.value);
          const d_safe_value = Number.isFinite(d_value)
            ? d_value
            : o_field.d_default ?? 0;
          update_value(o_field.s_key, d_safe_value);
        }}
        style={get_input_style()}
      />
    );
  }

  if (o_field.s_field_type === "select") {
    return (
      <select
        value={get_string_value(value)}
        onChange={(o_event) => update_value(o_field.s_key, o_event.target.value)}
        style={get_input_style()}
      >
        <option value="">not_set</option>
        {(o_field.a_options ?? []).map((o_option) => (
          <option key={o_option.s_value} value={o_option.s_value}>
            {o_option.s_label}
          </option>
        ))}
      </select>
    );
  }

  if (o_field.s_field_type === "checkbox") {
    return (
      <select
        value={get_boolean_value(value) ? "true" : "false"}
        onChange={(o_event) => update_value(o_field.s_key, o_event.target.value === "true")}
        style={get_input_style()}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (o_field.s_field_type === "variable_select") {
    return (
      <ToolVariableSelector
        value={get_string_value(value)}
        on_change={(s_value: string) => update_value(o_field.s_key, s_value)}
      />
    );
  }

  return (
    <input
      value={get_string_value(value)}
      onChange={(o_event) => update_value(o_field.s_key, o_event.target.value)}
      style={get_input_style()}
    />
  );
}

export function ToolNode({ id, data, type, selected }: NodeProps): JSX.Element {
  const o_data = data as IToolNodeData;
  const { update_node_data } = use_workflow_store();
  const { get_tool_schema_by_type } = use_tool_registry_store();

  const s_tool_type =
    typeof o_data.s_tool_type === "string" && o_data.s_tool_type.trim() !== ""
      ? o_data.s_tool_type
      : typeof type === "string"
        ? type
        : "";

  const o_schema = get_tool_schema_by_type(s_tool_type);

  const s_tool_color = get_safe_color(
    o_data.tool?.s_color ?? o_schema?.tool?.s_color ?? o_data.s_color ?? "#2563eb",
    "#2563eb",
  );

  const s_tool_label = get_safe_text(
    o_schema?.s_label ?? o_data.s_label ?? "Tool",
    "Tool",
  );

  const s_tool_icon = get_safe_text(
    o_schema?.s_icon ?? o_data.s_icon ?? o_data.tool?.s_icon ?? "layers",
    "layers",
  );

  function update_value(s_key: string, value: unknown): void {
    update_node_data(
      id,
      {
        [s_key]: value,
      } as Partial<IToolNodeData>,
    );
  }

  const a_input_handles = normalize_handle_list(
    o_schema?.a_input_handles ?? (o_data as Record<string, unknown>).input_handles ?? ["input_main"],
    "input",
    "Eingabe",
  );

  const a_output_handles = normalize_handle_list(
    o_schema?.a_output_handles ?? (o_data as Record<string, unknown>).output_handles ?? ["output_main"],
    "output",
    "Ergebnis",
  );

  return (
    <div style={get_node_wrapper_style(s_tool_color, selected === true)}>
      <RenderNamedHandles
        a_handles={a_input_handles}
        s_type="target"
        o_data={(o_data as Record<string, unknown>) || {}}
      />
      <RenderNamedHandles
        a_handles={a_output_handles}
        s_type="source"
        o_data={(o_data as Record<string, unknown>) || {}}
      />
      <RenderEventHandles o_data={(o_data as Record<string, unknown>) || {}} />

      <div style={get_header_style(s_tool_color)}>
        <div style={get_header_top_row_style()}>
          <div style={get_header_title_row_style()}>
            {render_schema_icon(s_tool_icon, s_tool_color)}
            <div style={get_header_text_wrap_style()}>
              <p style={get_title_style()}>{s_tool_label}</p>
              <p style={get_type_style()}>{get_safe_text(s_tool_type, "tool")}</p>
            </div>
          </div>

          <NodeDeleteButton node_id={id} />
        </div>

        {o_schema?.s_description ? (
          <p style={get_description_style()}>{o_schema.s_description}</p>
        ) : null}
      </div>

      <div style={get_body_style()}>
        <div style={get_meta_style()}>
          Inputs {a_input_handles.length} - Outputs {a_output_handles.length}
        </div>

        <NodeDetailsSection s_title="Tool settings" s_meta="fields" b_default_open={false}>
          <div style={get_field_wrapper_style()}>
            <label style={get_label_style()}>Label</label>
            <input
              value={get_string_value(o_data.s_label)}
              onChange={(o_event) => update_value("s_label", o_event.target.value)}
              style={get_input_style()}
            />
          </div>

          {o_schema ? (
            o_schema.a_fields.map((o_field) => (
              <div key={o_field.s_key} style={get_field_wrapper_style()}>
                <label style={get_label_style()}>
                  {o_field.s_label}
                  {o_field.b_required ? " *" : ""}
                </label>
                {render_input_field(o_field, o_data[o_field.s_key], update_value)}
              </div>
            ))
          ) : (
            <div style={get_meta_style()}>tool_schema_missing</div>
          )}
        </NodeDetailsSection>

        <RenderRuntimeResult o_data={(o_data as Record<string, unknown>) || {}} />
      </div>
    </div>
  );
}
