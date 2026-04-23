/* file: frontend/src/components/nodes/base_node_status_badge.tsx
description: Kleine Status Anzeige fuer Nodes waehrend der Simulation.
Zeigt Status Icon und optionale Laufzeit links neben dem Status an.
history:
- 2026-04-23: Erstellt fuer running, finished_ok und finished_error Anzeige rechts oben. author Marcus Schlieper
- 2026-04-23: Laufzeit Anzeige links neben dem Status Badge ergaenzt. author Marcus Schlieper
author Marcus Schlieper */

import React from "react";
import { FiCheck, FiLoader, FiStopCircle } from "react-icons/fi";

type TBaseNodeStatusBadgeProps = {
  s_runtime_status?: string;
  i_runtime_ms?: number;
};

function get_badge_container_style(): React.CSSProperties {
  return {
    position: "absolute",
    top: "8px",
    right: "32px",
    zIndex: 20,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    pointerEvents: "none",
  };
}

function get_runtime_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "56px",
    height: "22px",
    padding: "0 8px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.96)",
    border: "1px solid rgba(0, 0, 0, 0.08)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
    color: "#374151",
    fontSize: "11px",
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

function get_badge_wrapper_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.96)",
    border: "1px solid rgba(0, 0, 0, 0.08)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
  };
}

function get_spinner_style(): React.CSSProperties {
  return {
    color: "#16a34a",
    fontSize: "14px",
    animation: "node_status_spin 1s linear infinite",
  };
}

function get_ok_style(): React.CSSProperties {
  return {
    color: "#16a34a",
    fontSize: "14px",
  };
}

function get_error_style(): React.CSSProperties {
  return {
    color: "#dc2626",
    fontSize: "14px",
  };
}

function format_runtime_text(i_runtime_ms?: number): string {
  if (typeof i_runtime_ms !== "number" || !Number.isFinite(i_runtime_ms)) {
    return "";
  }

  if (i_runtime_ms < 0) {
    return "";
  }

  if (i_runtime_ms < 1000) {
    return `${Math.round(i_runtime_ms)} ms`;
  }

  return `${(i_runtime_ms / 1000).toFixed(2)} s`;
}

export function BaseNodeStatusBadge(
  o_props: TBaseNodeStatusBadgeProps
): JSX.Element | null {
  const { s_runtime_status = "", i_runtime_ms } = o_props;

  if (
    s_runtime_status !== "running" &&
    s_runtime_status !== "finished_ok" &&
    s_runtime_status !== "finished_error"
  ) {
    return null;
  }

  const s_runtime_text = format_runtime_text(i_runtime_ms);

  return (
    <>
      <style>
        {`
          @keyframes node_status_spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={get_badge_container_style()}>
        {s_runtime_text !== "" && (
          <div style={get_runtime_style()} title={`runtime ${s_runtime_text}`}>
            {s_runtime_text}
          </div>
        )}

        <div style={get_badge_wrapper_style()}>
          {s_runtime_status === "running" && <FiLoader style={get_spinner_style()} />}
          {s_runtime_status === "finished_ok" && <FiCheck style={get_ok_style()} />}
          {s_runtime_status === "finished_error" && (
            <FiStopCircle style={get_error_style()} />
          )}
        </div>
      </div>
    </>
  );
}
