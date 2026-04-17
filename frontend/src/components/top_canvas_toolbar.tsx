/* file: frontend/src/components/top_canvas_toolbar.tsx
description: Moderne Toolbar fuer Export, Import, Undo, Redo, Grid, Snap und Lock
history:
- 2026-03-27: Erstellt fuer Canvas Funktionen. author Marcus Schlieper
- 2026-03-29: Visuell komplett ueberarbeitet fuer High End SaaS Dashboard Stil. author Marcus Schlieper
author Marcus Schlieper
*/

import { useRef, useState } from "react";
import { use_workflow_store } from "../store/workflow_store";

function get_toolbar_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    border: "1px solid var(--color_border)",
    borderRadius: "16px",
    background: "var(--color_panel_elevated)",
    boxShadow: "var(--shadow_sm)",
    flexWrap: "wrap",
  };
}

function get_group_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  };
}

function get_button_style(
  b_active = false,
  b_primary = false
): React.CSSProperties {
  if (b_primary) {
    return {
      border: "1px solid var(--color_accent)",
      background: "var(--color_accent)",
      color: "#ffffff",
      borderRadius: "12px",
      padding: "9px 12px",
      fontSize: "12px",
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "var(--shadow_sm)",
      transition: "all 0.2s ease",
      whiteSpace: "nowrap",
    };
  }

  return {
    border: b_active
      ? "1px solid var(--color_accent)"
      : "1px solid var(--color_border)",
    background: b_active
      ? "var(--color_accent_soft)"
      : "var(--color_panel)",
    color: b_active
      ? "var(--color_accent_text)"
      : "var(--color_text)",
    borderRadius: "12px",
    padding: "9px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "var(--shadow_sm)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  };
}

function get_status_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "var(--color_text_muted)",
    paddingLeft: "4px",
    whiteSpace: "nowrap",
  };
}

function get_divider_style(): React.CSSProperties {
  return {
    width: "1px",
    height: "28px",
    background: "var(--color_border)",
    margin: "0 2px",
  };
}

export function TopCanvasToolbar(): JSX.Element {
  const {
    export_workflow,
    import_workflow,
    undo,
    redo,
    can_undo,
    can_redo,
    canvas_settings,
    toggle_show_grid,
    toggle_snap_to_grid,
    toggle_lock_canvas,
  } = use_workflow_store();

  const o_file_input_ref = useRef<HTMLInputElement | null>(null);
  const [s_status, set_status] = useState("");

  function on_export(): void {
    try {
      const s_content = export_workflow();
      const o_blob = new Blob([s_content], { type: "application/json" });
      const s_url = URL.createObjectURL(o_blob);
      const o_link = document.createElement("a");

      o_link.href = s_url;
      o_link.download = "workflow_export.json";
      document.body.appendChild(o_link);
      o_link.click();
      document.body.removeChild(o_link);
      URL.revokeObjectURL(s_url);

      set_status("export_ok");
    } catch (_o_error) {
      set_status("export_error");
    }
  }

  function on_import_click(): void {
    o_file_input_ref.current?.click();
  }

  async function on_file_change(
    o_event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const o_file = o_event.target.files?.[0];
    if (!o_file) {
      return;
    }

    try {
      const s_text = await o_file.text();
      const o_result = import_workflow(s_text);
      set_status(o_result.success ? "import_ok" : `import_error_${o_result.error}`);
    } catch (_o_error) {
      set_status("import_error_file_read_failed");
    }

    o_event.target.value = "";
  }

  return (
    <div className="top_canvas_toolbar" style={get_toolbar_style()}>
      <div style={get_group_style()}>
        <button
          type="button"
          onClick={undo}
          disabled={!can_undo}
          style={get_button_style(false, false)}
          title="Undo"
        >
          Undo
        </button>

        <button
          type="button"
          onClick={redo}
          disabled={!can_redo}
          style={get_button_style(false, false)}
          title="Redo"
        >
          Redo
        </button>

        <div style={get_divider_style()} />

        <button
          type="button"
          onClick={toggle_show_grid}
          style={get_button_style(canvas_settings.b_show_grid, false)}
          title="Grid umschalten"
        >
          {canvas_settings.b_show_grid ? "Grid On" : "Grid Off"}
        </button>

        <button
          type="button"
          onClick={toggle_snap_to_grid}
          style={get_button_style(canvas_settings.b_snap_to_grid, false)}
          title="Snap umschalten"
        >
          {canvas_settings.b_snap_to_grid ? "Snap On" : "Snap Off"}
        </button>

        <button
          type="button"
          onClick={toggle_lock_canvas}
          style={get_button_style(canvas_settings.b_lock_canvas, false)}
          title="Canvas sperren oder entsperren"
        >
          {canvas_settings.b_lock_canvas ? "Locked" : "Unlocked"}
        </button>

      </div>

      <div style={get_group_style()}>
        <input
          ref={o_file_input_ref}
          type="file"
          accept=".json,application/json"
          onChange={on_file_change}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={on_import_click}
          style={get_button_style(false, false)}
          title="Workflow importieren"
        >
          Import
        </button>

        <button
          type="button"
          onClick={on_export}
          style={get_button_style(false, true)}
          title="Workflow exportieren"
        >
          Export
        </button>

        <div className="toolbar_status" style={get_status_style()}>
          {s_status}
        </div>
      </div>
    </div>
  );
}
