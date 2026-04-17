import React from "react";

export function get_input_handle_style(
  i_top?: number | string
): React.CSSProperties {
  return {
    top: i_top ?? "50%",
    left: "-8px",
    width: "14px",
    height: "14px",
    backgroundColor: "#6366f1",
    border: "2px solid #ffffff",
    borderRadius: "999px",
  };
}

export function get_output_handle_style(
  i_top?: number | string
): React.CSSProperties {
  return {
    top: i_top ?? "50%",
    right: "-8px",
    width: "14px",
    height: "14px",
    backgroundColor: "#10b981",
    border: "2px solid #ffffff",
    borderRadius: "999px",
  };
}

export function get_top_handle_style(): React.CSSProperties {
  return {
    top: "-8px",
    width: "14px",
    height: "14px",
    backgroundColor: "#6366f1",
    border: "2px solid #ffffff",
    borderRadius: "999px",
  };
}

export function get_bottom_handle_style(): React.CSSProperties {
  return {
    bottom: "-8px",
    width: "14px",
    height: "14px",
    backgroundColor: "#10b981",
    border: "2px solid #ffffff",
    borderRadius: "999px",
  };
}
