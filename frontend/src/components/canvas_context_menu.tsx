import { useEffect, useRef, useState } from "react";

import {
  FiCheckSquare,
  FiCopy,
  FiDownload,
  FiLayers,
  FiScissors,
  FiTrash2,
  FiUpload,
  FiXCircle,
  FiClipboard,
} from "react-icons/fi";
import { use_workflow_store } from "../store/workflow_store";

function get_menu_wrapper_style(d_x: number, d_y: number): React.CSSProperties {
  return {
    position: "fixed",
    top: `${d_y}px`,
    left: `${d_x}px`,
    minWidth: "220px",
    border: "1px solid var(--color_border)",
    borderRadius: "12px",
    background: "var(--color_panel)",
    boxShadow: "var(--shadow_md)",
    overflow: "hidden",
    zIndex: 3000,
  };
}

function get_menu_item_style(b_danger: boolean = false): React.CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    border: "none",
    borderBottom: "1px solid var(--color_border)",
    background: "transparent",
    color: b_danger ? "var(--color_danger, #dc2626)" : "var(--color_text)",
    fontSize: "13px",
    textAlign: "left",
    cursor: "pointer",
  };
}

function get_status_style(): React.CSSProperties {
  return {
    padding: "10px 14px",
    fontSize: "12px",
    color: "var(--color_text_muted)",
    background: "var(--color_panel_elevated)",
  };
}

export function CanvasContextMenu(): JSX.Element | null {
  const {
    o_context_menu,
    nodes,
    a_selected_node_ids,
    close_context_menu,
    copy_selected_to_json,
    copy_all_to_json,
    cut_selected_to_json,
    paste_from_json,
    delete_selected_nodes,
    clear_selection,
    select_node,
  } = use_workflow_store();

  const [s_status, set_status] = useState("");
  const o_menu_ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function on_pointer_down(o_event: MouseEvent): void {
      if (!o_menu_ref.current) {
        return;
      }

      if (!o_menu_ref.current.contains(o_event.target as Node)) {
        close_context_menu();
      }
    }

    document.addEventListener("mousedown", on_pointer_down);

    return () => {
      document.removeEventListener("mousedown", on_pointer_down);
    };
  }, [close_context_menu]);

  if (!o_context_menu?.b_open) {
    return null;
  }

  async function on_copy_selected(): Promise<void> {
    try {
      await navigator.clipboard.writeText(copy_selected_to_json());
      set_status("copy_selected_ok");
    } catch (_o_error) {
      set_status("copy_selected_error");
    }
    close_context_menu();
  }

  async function on_copy_all(): Promise<void> {
    try {
      await navigator.clipboard.writeText(copy_all_to_json());
      set_status("copy_all_ok");
    } catch (_o_error) {
      set_status("copy_all_error");
    }
    close_context_menu();
  }

  async function on_cut_selected(): Promise<void> {
    try {
      await navigator.clipboard.writeText(cut_selected_to_json());
      set_status("cut_selected_ok");
    } catch (_o_error) {
      set_status("cut_selected_error");
    }
    close_context_menu();
  }

  async function on_paste(): Promise<void> {
    try {
      const s_json = await navigator.clipboard.readText();
      const o_result = paste_from_json(s_json);
      set_status(o_result?.success ? "paste_ok" : "paste_error");
    } catch (_o_error) {
      set_status("paste_error");
    }
    close_context_menu();
  }

  async function on_duplicate_selected(): Promise<void> {
    try {
      const s_json = copy_selected_to_json();
      const o_result = paste_from_json(s_json);
      set_status(
        o_result?.success ? "duplicate_selected_ok" : "duplicate_selected_error"
      );
    } catch (_o_error) {
      set_status("duplicate_selected_error");
    }
    close_context_menu();
  }

  function on_select_all(): void {
    clear_selection();
    for (const o_node of nodes) {
      select_node(o_node.id, true);
    }
    set_status("select_all_ok");
    close_context_menu();
  }

  function on_clear_selection(): void {
    clear_selection();
    set_status("clear_selection_ok");
    close_context_menu();
  }

  function on_delete(): void {
    delete_selected_nodes();
    set_status("delete_ok");
    close_context_menu();
  }

  async function on_export(): Promise<void> {
    try {
      await navigator.clipboard.writeText(copy_all_to_json());
      set_status("export_ok");
    } catch (_o_error) {
      set_status("export_error");
    }
    close_context_menu();
  }

  return (
    <div
      ref={o_menu_ref}
      style={get_menu_wrapper_style(o_context_menu.x, o_context_menu.y)}
      onContextMenu={(o_event) => o_event.preventDefault()}
    >
      <button
        style={get_menu_item_style()}
        onClick={() => void on_select_all()}
      >
        <FiCheckSquare />
        Select All
      </button>

      <button style={get_menu_item_style()} onClick={on_clear_selection}>
        <FiXCircle />
        Clear Selection
      </button>

      <button
        style={get_menu_item_style()}
        onClick={() => void on_copy_selected()}
      >
        <FiCopy />
        Copy
      </button>

      <button
        style={get_menu_item_style()}
        onClick={() => void on_cut_selected()}
      >
        <FiScissors />
        Cut
      </button>

      <button
        style={get_menu_item_style()}
        onClick={() => void on_duplicate_selected()}
      >
        <FiLayers />
        Duplicate
      </button>

      <button style={get_menu_item_style()} onClick={() => void on_copy_all()}>
        <FiClipboard />
        Copy All
      </button>

      <button style={get_menu_item_style()} onClick={() => void on_paste()}>
        <FiUpload />
        Paste JSON
      </button>

      <button style={get_menu_item_style()} onClick={() => void on_export()}>
        <FiDownload />
        Export
      </button>

      <button style={get_menu_item_style(true)} onClick={on_delete}>
        <FiTrash2 />
        Delete
      </button>

      <div style={get_status_style()}>
        {s_status || `${a_selected_node_ids.length} ausgewählt`}
      </div>
    </div>
  );
}
