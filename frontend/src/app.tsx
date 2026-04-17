/* file: src/app.tsx
description: Sicherer App Einstieg mit allen Providern, damit Tool Registry Daten im Designer verfuegbar sind.
history:
- 2026-03-25: Erstellt fuer erweitertes Lowcode Frontend. author Marcus Schlieper
- 2026-03-29: High end Dashboard Layout mit Theme Support integriert. author Marcus Schlieper
- 2026-03-29: Provider Reihenfolge geprueft fuer Tools Reiter und Tool Registry. author Marcus Schlieper
author Marcus Schlieper
*/
import { AgentDesigner } from "./components/agent_designer";
import { WorkflowProvider } from "./store/workflow_store";
import { ToolRegistryProvider } from "./store/tool_registry_store";
import { ThemeProvider } from "./store/theme_store";

export default function App(): JSX.Element {
  return (
    <ThemeProvider>
      <ToolRegistryProvider>
        <WorkflowProvider>
          <AgentDesigner />
        </WorkflowProvider>
      </ToolRegistryProvider>
    </ThemeProvider>
  );
}
