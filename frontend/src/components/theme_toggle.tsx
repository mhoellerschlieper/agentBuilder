/* file: src/components/theme_toggle.tsx
description: Umschalter fuer Light und Dark Mode im Header.
history:
- 2026-03-29: Erstellt fuer modernes Dashboard Header Theme Switching. author Marcus Schlieper
author Marcus Schlieper
*/
import { use_theme_store } from "../store/theme_store";

function get_button_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    background: "var(--color_panel)",
    color: "var(--color_text)",
    borderRadius: "12px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "var(--shadow_sm)",
  };
}

export function ThemeToggle(): JSX.Element {
  const { s_theme_mode, toggle_theme } = use_theme_store();

  return (
    <button onClick={toggle_theme} style={get_button_style()} title="toggle_theme">
      {s_theme_mode === "light" ? "Dark Mode" : "Light Mode"}
    </button>
  );
}
