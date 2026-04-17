/* file: src/store/theme_store.tsx
description: Einfacher Theme Store fuer Light und Dark Mode im SaaS Dashboard Stil.
history:
- 2026-03-29: Erstellt fuer Light und Dark Mode Umschalter. author Marcus Schlieper
author Marcus Schlieper
*/
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type TThemeMode = "light" | "dark";

interface IThemeContext {
  s_theme_mode: TThemeMode;
  toggle_theme: () => void;
  set_theme: (s_mode: TThemeMode) => void;
}

const ThemeContext = createContext<IThemeContext | undefined>(undefined);

function apply_theme_to_document(s_mode: TThemeMode): void {
  const o_root = document.documentElement;
  o_root.setAttribute("data-theme", s_mode);
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [s_theme_mode, set_theme_mode] = useState<TThemeMode>("light");

  useEffect(() => {
    apply_theme_to_document(s_theme_mode);
  }, [s_theme_mode]);

  function toggle_theme(): void {
    set_theme_mode((s_prev) => (s_prev === "light" ? "dark" : "light"));
  }

  function set_theme(s_mode: TThemeMode): void {
    set_theme_mode(s_mode);
  }

  const o_value = useMemo(
    () => ({
      s_theme_mode,
      toggle_theme,
      set_theme,
    }),
    [s_theme_mode]
  );

  return <ThemeContext.Provider value={o_value}>{children}</ThemeContext.Provider>;
}

export function use_theme_store(): IThemeContext {
  const o_context = useContext(ThemeContext);
  if (!o_context) {
    throw new Error("theme_store_context_missing");
  }
  return o_context;
}
