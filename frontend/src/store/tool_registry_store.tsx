/* file: frontend/src/store/tool_registry_store.tsx
description: Registry fuer dynamische Tool Nodes aus Backend und JSON mit Initialdaten, Gruppen, Untergruppen und Icons.
history:
- 2026-03-28: Erstellt fuer Registrierung und Zugriff auf Tool Node Schemata. author Marcus Schlieper
- 2026-03-29: Gruppe, Untergruppe und Icon in Default Tools und Registry Tools ergaenzt. author Marcus Schlieper
- 2026-03-29: Zwanzig weitere Registry Tools initialisiert. author Marcus Schlieper
- 2026-03-29: Um 100 weitere Registry Tools erweitert. author Marcus Schlieper
- 2026-04-11: Default Tool Schemata aus Python Backend laden ergaenzt. author Marcus Schlieper
author Marcus Schlieper
*/
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  IToolNodeSchema,
  IToolRegistryPayload,
  sanitize_tool_node_schema,
  is_record,
} from "../types/tool_registry";
import { fetch_tool_schemas } from "../services/api";

interface IToolRegistryStoreContext {
  a_tool_schemas: IToolNodeSchema[];
  register_tool_schemas_from_json: (s_json: string) => {
    success: boolean;
    error?: string;
    i_count?: number;
  };
  set_tool_schemas: (a_schemas: IToolNodeSchema[]) => void;
  get_tool_schema_by_type: (s_type: string) => IToolNodeSchema | undefined;
  load_tool_schemas_from_backend: () => Promise<{
    success: boolean;
    error?: string;
    i_count?: number;
  }>;
}

const ToolRegistryStoreContext = createContext<
  IToolRegistryStoreContext | undefined
>(undefined);

const a_default_tool_schemas: IToolNodeSchema[] = [];

export function ToolRegistryProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [a_tool_schemas, set_tool_schemas_state] = useState<IToolNodeSchema[]>(
    a_default_tool_schemas
  );

  function set_tool_schemas(a_schemas: IToolNodeSchema[]): void {
    const a_safe = a_schemas.filter((o_item) => Boolean(o_item?.s_type));
    set_tool_schemas_state(a_safe);
  }

  function get_tool_schema_by_type(
    s_type: string
  ): IToolNodeSchema | undefined {
    return a_tool_schemas.find((o_item) => o_item.s_type === s_type);
  }

  function merge_tool_schemas(
    a_existing: IToolNodeSchema[],
    a_incoming: IToolNodeSchema[]
  ): IToolNodeSchema[] {
    const o_map = new Map<string, IToolNodeSchema>();

    for (const o_item of a_existing) {
      if (o_item?.s_type) {
        o_map.set(o_item.s_type, o_item);
      }
    }

    for (const o_item of a_incoming) {
      if (o_item?.s_type) {
        o_map.set(o_item.s_type, o_item);
      }
    }

    return Array.from(o_map.values());
  }

  async function load_tool_schemas_from_backend(): Promise<{
    success: boolean;
    error?: string;
    i_count?: number;
  }> {
    try {
      const o_payload = await fetch_tool_schemas();
      let a_raw_tools: unknown[] = [];

      if (Array.isArray(o_payload)) {
        a_raw_tools = o_payload;
      } else if (is_record(o_payload) && Array.isArray(o_payload.a_tools)) {
        a_raw_tools = (o_payload as IToolRegistryPayload).a_tools;
      } else {
        return { success: false, error: "invalid_tool_registry_payload" };
      }

      const a_schemas = a_raw_tools
        .map((o_item) => sanitize_tool_node_schema(o_item))
        .filter((o_item): o_item is IToolNodeSchema => Boolean(o_item));

      if (a_schemas.length === 0) {
        return { success: false, error: "no_valid_tool_schemas" };
      }

      set_tool_schemas_state((a_prev) => merge_tool_schemas(a_prev, a_schemas));

      return {
        success: true,
        i_count: a_schemas.length,
      };
    } catch (_o_error) {
      return { success: false, error: "tool_registry_load_failed" };
    }
  }

  function register_tool_schemas_from_json(s_json: string): {
    success: boolean;
    error?: string;
    i_count?: number;
  } {
    try {
      const o_parsed = JSON.parse(s_json) as unknown;
      let a_raw_tools: unknown[] = [];

      if (Array.isArray(o_parsed)) {
        a_raw_tools = o_parsed;
      } else if (is_record(o_parsed) && Array.isArray(o_parsed.a_tools)) {
        a_raw_tools = (o_parsed as IToolRegistryPayload).a_tools;
      } else {
        return { success: false, error: "invalid_tool_registry_payload" };
      }

      const a_schemas = a_raw_tools
        .map((o_item) => sanitize_tool_node_schema(o_item))
        .filter((o_item): o_item is IToolNodeSchema => Boolean(o_item));

      if (a_schemas.length === 0) {
        return { success: false, error: "no_valid_tool_schemas" };
      }

      set_tool_schemas_state((a_prev) => merge_tool_schemas(a_prev, a_schemas));

      return {
        success: true,
        i_count: a_schemas.length,
      };
    } catch (_o_error) {
      return { success: false, error: "invalid_json" };
    }
  }

  useEffect(() => {
    void load_tool_schemas_from_backend();
  }, []);

  const o_value = useMemo(
    () => ({
      a_tool_schemas,
      register_tool_schemas_from_json,
      set_tool_schemas,
      get_tool_schema_by_type,
      load_tool_schemas_from_backend,
    }),
    [a_tool_schemas]
  );

  return (
    <ToolRegistryStoreContext.Provider value={o_value}>
      {children}
    </ToolRegistryStoreContext.Provider>
  );
}

export function use_tool_registry_store(): IToolRegistryStoreContext {
  const o_context = useContext(ToolRegistryStoreContext);
  if (!o_context) {
    throw new Error("tool_registry_store_context_missing");
  }
  return o_context;
}
