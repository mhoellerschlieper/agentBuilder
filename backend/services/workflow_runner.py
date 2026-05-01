# file: backend/services/workflow_runner.py
# description: Sichere Workflow Ausfuehrung mit Node Repository, dynamischem Node Reload
# und ausgelagerten Node Implementierungen.
# history:
# - 2026-03-25: Erste Version fuer Start, HTTP, Condition, Loop, LLM und End Nodes. author Marcus Schlieper
# - 2026-04-04: Frontend Live Node Status fuer running, success und error ergaenzt. author Marcus Schlieper
# - 2026-04-05: Graph Aufbau aus nodes und edges, NextNodes Erzeugung und parallele Level Ausfuehrung ergaenzt. author Marcus Schlieper
# - 2026-04-05: Vorgaenger Ergebnisse als Input Kontext und Platzhalter Ersetzung ergaenzt. author Marcus Schlieper
# - 2026-04-05: Condition Auswertung und true false Routing ueber source handles ergaenzt. author Marcus Schlieper
# - 2026-04-05: End Node uebergibt Ergebnisse des vorherigen Nodes an das Frontend. author Marcus Schlieper
# - 2026-04-06: Benannte Inputs und Handle Definitionen fuer anwenderfreundliche Ein und Ausgaenge ergaenzt. author Marcus Schlieper
# - 2026-04-06: Vollstaendige Node Simulation fuer HTTP, Switch, Loop, Loop For, LLM, Code, Group und Comment erweitert. author Marcus Schlieper
# - 2026-04-07: End Node unterstuetzt Result Platzhalter und gibt je nach Verzweigung den konkreten Start Output zurueck. author Marcus Schlieper
# - 2026-04-08: Echte Backend Implementierung fuer HTTP Node und LLM Node mit sicherer Validierung ergaenzt. author Marcus Schlieper
# - 2026-04-12: Classifier Node und verbessertes Switch Routing mit case Werten ergaenzt. author Marcus Schlieper
# - 2026-04-14: Node Implementierungen in eigenes Repository und dynamischen Loader ausgelagert. author Marcus Schlieper
# - 2026-04-18: Mehrere aktive Output-Handles fuer switch und classifier Routing ergaenzt. author ChatGPT
# - 2026-04-23: Live Status Payload auf running, finished_ok und finished_error fuer Frontend Anzeige umgestellt. author Marcus Schlieper
# - 2026-04-23: Node Laufzeitmessung in Millisekunden fuer Frontend Anzeige ergaenzt. author Marcus Schlieper
# - 2026-05-01: Template Resolver fuer input, output, node, global und workflow integriert. author Marcus Schlieper

import copy
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_loader import NodeLoader
from services.template_variable_resolver import resolve_template_text


class WorkflowRunner:
    # Fuehrt einen Workflow sicher anhand eines Graphen aus.

    def __init__(self, websocket_manager) -> None:
        self.websocket_manager = websocket_manager
        self.node_loader = NodeLoader()

    # file: backend/services/workflow_runner.py
# description: Integration der Template Aufloesung in die Node Ausfuehrung.
# history:
# - 2026-05-01: Node Daten werden vor der Ausfuehrung mit der neuen Syntax aufgeloest. author Marcus Schlieper
# author Marcus Schlieper

    def run_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        a_nodes: List[Dict[str, Any]] = payload.get("nodes", [])
        a_edges: List[Dict[str, Any]] = payload.get("edges", [])
        s_name = str(payload.get("name", "workflow"))
        d_global_values = self._build_global_value_map(payload)
        d_workflow_values = self._build_workflow_value_map(payload, s_name)
        if not isinstance(a_nodes, list):
            raise ValueError("invalid_nodes")
        if not isinstance(a_edges, list):
            raise ValueError("invalid_edges")
        self.node_loader.reload_if_repository_changed()
        self.websocket_manager.emit_status(
            "workflow_status",
            {"status": "started", "workflow_name": s_name},
        )
        try:
            a_workflow = self._build_workflow(a_nodes, a_edges)
            a_levels = self._build_execution_levels(a_workflow)
        except Exception as o_exc:
            s_error = str(o_exc)
            self.websocket_manager.emit_status(
                "workflow_status",
                {
                    "status": "error",
                    "workflow_name": s_name,
                    "error": s_error,
                },
            )
            return {
                "success": False,
                "workflow_name": s_name,
                "error": s_error,
                "results": [],
            }
        a_results: List[Dict[str, Any]] = []
        d_results_by_node_id: Dict[str, Dict[str, Any]] = {}
        d_workflow_map = self._build_workflow_map(a_workflow)
        d_node_enabled: Dict[str, bool] = self._build_initial_enabled_map(a_workflow)
        b_failed = False
        s_error = ""
        for a_level in a_levels:
            if b_failed:
                break
            self.node_loader.reload_if_repository_changed()
            a_level_to_run = self._filter_enabled_level(a_level, d_node_enabled)
            a_skipped_results = self._build_skipped_results_for_disabled_nodes(
                a_level,
                d_node_enabled,
            )
            for o_skipped_result in a_skipped_results:
                a_results.append(o_skipped_result)
                s_skipped_node_id = str(o_skipped_result.get("node_id", "")).strip()
                if s_skipped_node_id != "":
                    d_results_by_node_id[s_skipped_node_id] = o_skipped_result
            if not a_level_to_run:
                time.sleep(0.05)
                continue
            a_level_results = self._run_level_parallel(
                a_level_to_run,
                d_results_by_node_id,
                d_global_values,
                d_workflow_values,
            )
            for o_result in a_level_results:
                a_results.append(o_result)
                s_node_id = str(o_result.get("node_id", "")).strip()
                if s_node_id != "":
                    d_results_by_node_id[s_node_id] = o_result
                if o_result.get("status") == "error":
                    b_failed = True
                    s_error = str(o_result.get("error", "workflow_node_error"))
                    break
                self._apply_node_routing_result(
                    o_result,
                    d_workflow_map,
                    d_node_enabled,
                )
            time.sleep(0.1)
        if b_failed:
            self.websocket_manager.emit_status(
                "workflow_status",
                {
                    "status": "error",
                    "workflow_name": s_name,
                    "error": s_error,
                },
            )
            return {
                "success": False,
                "workflow_name": s_name,
                "error": s_error,
                "workflow": a_workflow,
                "results": a_results,
            }
        self.websocket_manager.emit_status(
            "workflow_status",
            {"status": "finished", "workflow_name": s_name},
        )
        return {
            "success": True,
            "workflow_name": s_name,
            "workflow": a_workflow,
            "results": a_results,
        }


    def _build_workflow(
        self,
        a_nodes: List[Dict[str, Any]],
        a_edges: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        d_node_map: Dict[str, Dict[str, Any]] = {}
        a_workflow: List[Dict[str, Any]] = []

        for o_node in a_nodes:
            if not isinstance(o_node, dict):
                raise ValueError("invalid_node_entry")

            s_node_id = str(o_node.get("id", "")).strip()
            s_node_type = str(o_node.get("type", "unknown")).strip()

            if s_node_id == "":
                raise ValueError("node_id_required")

            if s_node_id in d_node_map:
                raise ValueError("duplicate_node_id")

            d_handles = self._extract_node_handles(o_node)
            d_node_map[s_node_id] = {
                "Node": o_node,
                "id": s_node_id,
                "type": s_node_type,
                "NextNodes": [],
                "PrevNodes": [],
                "source_handles": {},
                "target_handles": {},
                "handle_definitions": d_handles,
            }

        for o_edge in a_edges:
            if not isinstance(o_edge, dict):
                raise ValueError("invalid_edge_entry")

            s_source = str(o_edge.get("source", "")).strip()
            s_target = str(o_edge.get("target", "")).strip()
            s_source_handle = str(o_edge.get("sourceHandle", "")).strip()
            s_target_handle = str(o_edge.get("targetHandle", "")).strip()

            if s_source == "" or s_target == "":
                raise ValueError("edge_source_target_required")

            if s_source not in d_node_map or s_target not in d_node_map:
                raise ValueError("edge_references_unknown_node")

            if s_target not in d_node_map[s_source]["NextNodes"]:
                d_node_map[s_source]["NextNodes"].append(s_target)

            if s_source not in d_node_map[s_target]["PrevNodes"]:
                d_node_map[s_target]["PrevNodes"].append(s_source)

            if s_source_handle != "":
                if s_source_handle not in d_node_map[s_source]["source_handles"]:
                    d_node_map[s_source]["source_handles"][s_source_handle] = []
                if s_target not in d_node_map[s_source]["source_handles"][s_source_handle]:
                    d_node_map[s_source]["source_handles"][s_source_handle].append(s_target)

            if s_target_handle != "":
                if s_target_handle not in d_node_map[s_target]["target_handles"]:
                    d_node_map[s_target]["target_handles"][s_target_handle] = []
                d_node_map[s_target]["target_handles"][s_target_handle].append(
                    {
                        "source_node_id": s_source,
                        "source_handle": s_source_handle,
                    }
                )

        for s_node_id in d_node_map:
            a_workflow.append(d_node_map[s_node_id])

        return a_workflow

    def _extract_node_handles(self, o_node: Dict[str, Any]) -> Dict[str, Any]:
        s_node_type = str(o_node.get("type", "unknown")).strip()
        o_data = o_node.get("data", {})
        d_data = o_data if isinstance(o_data, dict) else {}

        a_input_handles = d_data.get("input_handles", [])
        a_output_handles = d_data.get("output_handles", [])

        if not isinstance(a_input_handles, list) or len(a_input_handles) == 0:
            a_input_handles = self.node_loader.get_default_input_handles_for_node_type(s_node_type)

        if not isinstance(a_output_handles, list) or len(a_output_handles) == 0:
            a_output_handles = self.node_loader.get_default_output_handles_for_node_type(s_node_type)

        return {
            "input_handles": self._normalize_handle_definitions(a_input_handles, "input"),
            "output_handles": self._normalize_handle_definitions(a_output_handles, "output"),
        }

    def _normalize_handle_definitions(
        self,
        a_handles: List[Any],
        s_kind: str,
    ) -> List[Dict[str, str]]:
        a_result: List[Dict[str, str]] = []
        d_seen: Dict[str, bool] = {}

        for i_index, o_item in enumerate(a_handles):
            if not isinstance(o_item, dict):
                continue

            s_key = str(o_item.get("s_key", "")).strip()
            s_label = str(o_item.get("s_label", "")).strip()
            s_description = str(o_item.get("s_description", "")).strip()

            if s_key == "":
                s_key = f"{s_kind}_{i_index + 1}"

            s_key = self._sanitize_handle_key(s_key)

            if s_key == "":
                s_key = f"{s_kind}_{i_index + 1}"

            if s_key in d_seen:
                continue

            if s_label == "":
                s_label = s_key

            a_result.append(
                {
                    "s_key": s_key,
                    "s_label": s_label,
                    "s_description": s_description,
                }
            )
            d_seen[s_key] = True

        if len(a_result) == 0:
            s_default_key = f"{s_kind}_main"
            a_result.append(
                {
                    "s_key": s_default_key,
                    "s_label": "main" if s_kind == "input" else "result",
                    "s_description": "",
                }
            )

        return a_result

    def _sanitize_handle_key(self, s_value: str) -> str:
        s_value = str(s_value).strip().lower()
        s_value = re.sub(r"[^a-z0-9_]+", "_", s_value)
        s_value = re.sub(r"_+", "_", s_value)
        s_value = s_value.strip("_")
        return s_value

    def _build_workflow_map(
        self,
        a_workflow: List[Dict[str, Any]],
    ) -> Dict[str, Dict[str, Any]]:
        d_workflow_map: Dict[str, Dict[str, Any]] = {}
        for o_item in a_workflow:
            s_node_id = str(o_item.get("id", "")).strip()
            if s_node_id == "":
                raise ValueError("workflow_node_id_required")
            d_workflow_map[s_node_id] = o_item
        return d_workflow_map

    def _build_initial_enabled_map(
        self,
        a_workflow: List[Dict[str, Any]],
    ) -> Dict[str, bool]:
        d_node_enabled: Dict[str, bool] = {}
        for o_item in a_workflow:
            s_node_id = str(o_item.get("id", "")).strip()
            a_prev_nodes = o_item.get("PrevNodes", [])
            d_node_enabled[s_node_id] = len(a_prev_nodes) == 0
        return d_node_enabled

    def _build_execution_levels(
        self,
        a_workflow: List[Dict[str, Any]],
    ) -> List[List[Dict[str, Any]]]:
        d_workflow_map: Dict[str, Dict[str, Any]] = {}
        d_in_degree: Dict[str, int] = {}

        for o_item in a_workflow:
            s_node_id = str(o_item.get("id", "")).strip()
            if s_node_id == "":
                raise ValueError("workflow_node_id_required")
            d_workflow_map[s_node_id] = o_item
            d_in_degree[s_node_id] = len(o_item.get("PrevNodes", []))

        a_levels: List[List[Dict[str, Any]]] = []
        a_current_ids: List[str] = [
            s_node_id for s_node_id, i_count in d_in_degree.items() if i_count == 0
        ]

        if not a_current_ids:
            raise ValueError("workflow_has_no_entry_node")

        i_processed = 0
        while a_current_ids:
            a_level: List[Dict[str, Any]] = []
            a_next_ids: List[str] = []

            for s_node_id in a_current_ids:
                a_level.append(d_workflow_map[s_node_id])
                i_processed += 1

            a_levels.append(a_level)

            for s_node_id in a_current_ids:
                a_next_nodes = d_workflow_map[s_node_id].get("NextNodes", [])
                for s_next_id in a_next_nodes:
                    d_in_degree[s_next_id] -= 1
                    if d_in_degree[s_next_id] == 0:
                        a_next_ids.append(s_next_id)

            a_current_ids = a_next_ids

        if i_processed != len(a_workflow):
            raise ValueError("workflow_contains_cycle_or_unreachable_nodes")

        return a_levels

    def _filter_enabled_level(
        self,
        a_level: List[Dict[str, Any]],
        d_node_enabled: Dict[str, bool],
    ) -> List[Dict[str, Any]]:
        a_enabled_level: List[Dict[str, Any]] = []
        for o_item in a_level:
            s_node_id = str(o_item.get("id", "")).strip()
            if d_node_enabled.get(s_node_id, False):
                a_enabled_level.append(o_item)
        return a_enabled_level

    def _build_skipped_results_for_disabled_nodes(
        self,
        a_level: List[Dict[str, Any]],
        d_node_enabled: Dict[str, bool],
    ) -> List[Dict[str, Any]]:
        a_results: List[Dict[str, Any]] = []
        for o_item in a_level:
            s_node_id = str(o_item.get("id", "")).strip()
            s_node_type = str(o_item.get("type", "unknown")).strip()

            if d_node_enabled.get(s_node_id, False):
                continue

            o_result = {
                "node_id": s_node_id,
                "node_type": s_node_type,
                "status": "skipped",
                "reason": "node_disabled_by_routing",
                "i_runtime_ms": 0,
            }

            self.websocket_manager.emit_status(
                "node_status",
                {
                    "node_id": s_node_id,
                    "node_type": s_node_type,
                    "status": "skipped",
                    "reason": "node_disabled_by_routing",
                    "i_runtime_ms": 0,
                },
            )
            a_results.append(o_result)

        return a_results

# file: backend/services/workflow_runner.py
# description: Erweiterte parallele Ausfuehrung mit Template Kontext.
# history:
# - 2026-05-01: Globale Werte und Workflow Werte an Node Ausfuehrung uebergeben. author Marcus Schlieper
# author Marcus Schlieper

    def _run_level_parallel(
        self,
        a_level: List[Dict[str, Any]],
        d_results_by_node_id: Dict[str, Dict[str, Any]],
        d_global_values: Dict[str, Any],
        d_workflow_values: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        a_results: List[Dict[str, Any]] = []
        if not a_level:
            return a_results
        i_max_workers = max(1, min(8, len(a_level)))
        with ThreadPoolExecutor(max_workers=i_max_workers) as o_executor:
            d_future_map = {
                o_executor.submit(
                    self._run_single_workflow_node,
                    o_item,
                    d_results_by_node_id,
                    d_global_values,
                    d_workflow_values,
                ): o_item
                for o_item in a_level
            }
            for o_future in as_completed(d_future_map):
                o_result = o_future.result()
                a_results.append(o_result)
        return a_results


# file: backend/services/workflow_runner.py
# description: Einzelne Node Ausfuehrung mit Template Syntax Aufloesung.
# history:
# - 2026-05-01: Neue Template Syntax vor der Node Ausfuehrung integriert. author Marcus Schlieper
# author Marcus Schlieper

    def _run_single_workflow_node(
        self,
        o_item: Dict[str, Any],
        d_results_by_node_id: Dict[str, Dict[str, Any]],
        d_global_values: Dict[str, Any],
        d_workflow_values: Dict[str, Any],
    ) -> Dict[str, Any]:
        o_node = o_item.get("Node", {})
        s_node_id = str(o_item.get("id", "unknown"))
        s_node_type = str(o_item.get("type", "unknown"))
        a_prev_nodes = o_item.get("PrevNodes", [])
        d_target_handles = o_item.get("target_handles", {})
        o_input_context = self._build_node_input_context(
            a_prev_nodes,
            d_target_handles,
            d_results_by_node_id,
        )
        d_started_at = time.perf_counter()
        self.websocket_manager.emit_status(
            "node_status",
            {
                "node_id": s_node_id,
                "node_type": s_node_type,
                "status": "running",
                "i_runtime_ms": 0,
            },
        )
        try:
            o_current_node_context = {
                "named_inputs": copy.deepcopy(o_input_context.get("named_inputs", {})),
                "current_result": {},
            }
            o_resolved_node = self._resolve_node_templates_in_data(
                o_node=o_node,
                o_current_node_context=o_current_node_context,
                d_results_by_node_id=d_results_by_node_id,
                d_global_values=d_global_values,
                d_workflow_values=d_workflow_values,
            )
            o_context = NodeExecutionContext(
                node=o_resolved_node,
                node_item=o_item,
                input_context=o_input_context,
            )
            o_result = self.node_loader.execute_node(
                s_node_type=s_node_type,
                o_context=o_context,
            )
            o_result = self._normalize_node_result(o_result, o_item)
            i_runtime_ms = max(0, int(round((time.perf_counter() - d_started_at) * 1000)))
            self.websocket_manager.emit_status(
                "node_status",
                {
                    "node_id": s_node_id,
                    "node_type": s_node_type,
                    "status": "finished_ok",
                    "i_runtime_ms": i_runtime_ms,
                    "result": o_result,
                },
            )
            if s_node_type == "end":
                self.websocket_manager.emit_status(
                    "workflow_end_result",
                    {
                        "node_id": s_node_id,
                        "node_type": s_node_type,
                        "status": "finished_ok",
                        "i_runtime_ms": i_runtime_ms,
                        "result": o_result,
                    },
                )
            return {
                "node_id": s_node_id,
                "node_type": s_node_type,
                "status": "success",
                "i_runtime_ms": i_runtime_ms,
                "result": o_result,
                "inputs": o_input_context,
            }
        except Exception as o_exc:
            s_error = str(o_exc)
            i_runtime_ms = max(0, int(round((time.perf_counter() - d_started_at) * 1000)))
            self.websocket_manager.emit_status(
                "node_status",
                {
                    "node_id": s_node_id,
                    "node_type": s_node_type,
                    "status": "finished_error",
                    "i_runtime_ms": i_runtime_ms,
                    "error": s_error,
                },
            )
            return {
                "node_id": s_node_id,
                "node_type": s_node_type,
                "status": "error",
                "i_runtime_ms": i_runtime_ms,
                "error": s_error,
                "inputs": o_input_context,
            }

    def _normalize_node_result(
        self,
        o_result: Any,
        o_item: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        d_handle_definitions = {}
        if isinstance(o_item, dict):
            d_handle_definitions = o_item.get("handle_definitions", {})

        a_output_handles = d_handle_definitions.get("output_handles", [])
        s_default_output_key = "output_main"
        s_default_output_label = "result"

        if isinstance(a_output_handles, list) and len(a_output_handles) > 0:
            o_first = a_output_handles[0]
            if isinstance(o_first, dict):
                s_default_output_key = str(o_first.get("s_key", "output_main")).strip() or "output_main"
                s_default_output_label = str(o_first.get("s_label", "result")).strip() or "result"

        if not isinstance(o_result, dict):
            return {
                "message": "node_executed",
                "output": {"value": o_result},
                "output_meta": {
                    "output_key": s_default_output_key,
                    "output_label": s_default_output_label,
                    "node_outputs": {
                        s_default_output_key: {"value": o_result},
                    },
                },
            }

        if "output" not in o_result:
            o_output = copy.deepcopy(o_result)
            o_result = {
                **o_result,
                "output": o_output,
            }

        if not isinstance(o_result.get("output"), dict):
            o_result = {
                **o_result,
                "output": {"value": o_result.get("output")},
            }

        o_output_meta = o_result.get("output_meta", {})
        if not isinstance(o_output_meta, dict):
            o_output_meta = {}

        d_node_outputs = o_output_meta.get("node_outputs", {})
        if not isinstance(d_node_outputs, dict) or len(d_node_outputs) == 0:
            d_node_outputs = {
                s_default_output_key: copy.deepcopy(o_result.get("output", {})),
            }

        return {
            **o_result,
            "output_meta": {
                "output_key": str(o_output_meta.get("output_key", s_default_output_key)).strip() or s_default_output_key,
                "output_label": str(o_output_meta.get("output_label", s_default_output_label)).strip() or s_default_output_label,
                "node_outputs": d_node_outputs,
            },
        }

    def _build_node_input_context(
        self,
        a_prev_nodes: List[Any],
        d_target_handles: Dict[str, Any],
        d_results_by_node_id: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        a_inputs: List[Any] = []
        d_named_inputs: Dict[str, Any] = {}
        d_input_sources: Dict[str, Any] = {}
        o_prev_node_results: Dict[str, Any] = {}

        for o_prev_node_id in a_prev_nodes:
            s_prev_node_id = str(o_prev_node_id).strip()
            if s_prev_node_id == "":
                continue

            o_prev_result_wrapper = d_results_by_node_id.get(s_prev_node_id, {})
            o_prev_result = o_prev_result_wrapper.get("result", {})
            o_prev_output = {}

            if isinstance(o_prev_result, dict):
                o_prev_output = o_prev_result.get("output", {})
                if not isinstance(o_prev_output, dict):
                    o_prev_output = {"value": o_prev_output}

            a_inputs.append(copy.deepcopy(o_prev_output))
            o_prev_node_results[s_prev_node_id] = copy.deepcopy(o_prev_result)

        if isinstance(d_target_handles, dict):
            for s_target_handle, a_sources in d_target_handles.items():
                s_safe_target_handle = self._sanitize_handle_key(s_target_handle)
                if s_safe_target_handle == "":
                    continue

                if not isinstance(a_sources, list) or len(a_sources) == 0:
                    continue

                for o_source_item in a_sources:
                    if not isinstance(o_source_item, dict):
                        continue

                    s_source_node_id = str(o_source_item.get("source_node_id", "")).strip()
                    s_source_handle = self._sanitize_handle_key(
                        str(o_source_item.get("source_handle", "")).strip()
                    )

                    if s_source_node_id == "":
                        continue

                    o_prev_result_wrapper = d_results_by_node_id.get(s_source_node_id, {})
                    o_prev_result = o_prev_result_wrapper.get("result", {})
                    if not isinstance(o_prev_result, dict):
                        continue

                    o_output_meta = o_prev_result.get("output_meta", {})
                    if not isinstance(o_output_meta, dict):
                        o_output_meta = {}

                    d_node_outputs = o_output_meta.get("node_outputs", {})
                    if not isinstance(d_node_outputs, dict):
                        d_node_outputs = {}

                    o_resolved_output = None
                    s_resolved_source_output_key = ""

                    if s_source_handle != "" and s_source_handle in d_node_outputs:
                        o_resolved_output = copy.deepcopy(d_node_outputs[s_source_handle])
                        s_resolved_source_output_key = s_source_handle
                    elif "output_main" in d_node_outputs:
                        o_resolved_output = copy.deepcopy(d_node_outputs["output_main"])
                        s_resolved_source_output_key = "output_main"
                    else:
                        o_fallback_output = o_prev_result.get("output", {})
                        if isinstance(o_fallback_output, dict):
                            o_resolved_output = copy.deepcopy(o_fallback_output)
                            s_resolved_source_output_key = "output_main"

                    if o_resolved_output is None:
                        continue

                    d_named_inputs[s_safe_target_handle] = o_resolved_output
                    d_input_sources[s_safe_target_handle] = {
                        "source_node_id": s_source_node_id,
                        "source_handle": s_source_handle,
                        "source_output_key": s_resolved_source_output_key,
                    }
                    break

        if len(d_named_inputs) == 0 and len(a_inputs) == 1:
            d_named_inputs["input_main"] = copy.deepcopy(a_inputs[0])
            d_input_sources["input_main"] = {
                "source_node_id": str(a_prev_nodes[0]).strip() if len(a_prev_nodes) > 0 else "",
                "source_handle": "output_main",
                "source_output_key": "output_main",
            }

        return {
            "inputs": a_inputs,
            "input": a_inputs,
            "named_inputs": d_named_inputs,
            "input_sources": d_input_sources,
            "prev_node_results": o_prev_node_results,
        }

    def _apply_node_routing_result(
        self,
        o_result: Dict[str, Any],
        d_workflow_map: Dict[str, Dict[str, Any]],
        d_node_enabled: Dict[str, bool],
    ) -> None:
        s_node_id = str(o_result.get("node_id", "")).strip()
        if s_node_id == "":
            return

        if s_node_id not in d_workflow_map:
            return

        o_workflow_item = d_workflow_map[s_node_id]
        s_node_type = str(o_workflow_item.get("type", "unknown")).strip()
        o_node_result = o_result.get("result", {})
        a_next_nodes = o_workflow_item.get("NextNodes", [])

        for s_next_node_id in a_next_nodes:
            if s_next_node_id not in d_node_enabled:
                d_node_enabled[s_next_node_id] = False

        if s_node_type == "condition" and isinstance(o_node_result, dict):
            o_output = o_node_result.get("output", {})
            if not isinstance(o_output, dict):
                o_output = {}

            s_routing_handle = str(o_output.get("routing_handle", "")).strip().lower()
            d_source_handles = o_workflow_item.get("source_handles", {})

            if s_routing_handle == "":
                return

            a_selected_next_nodes = d_source_handles.get(s_routing_handle, [])
            for s_next_node_id in a_selected_next_nodes:
                d_node_enabled[s_next_node_id] = True
            return

        if s_node_type in ["switch", "classifier"] and isinstance(o_node_result, dict):
            o_output = o_node_result.get("output", {})
            if not isinstance(o_output, dict):
                o_output = {}

            d_source_handles = o_workflow_item.get("source_handles", {})
            a_active_output_handles = o_output.get("active_output_handles", [])
            if not isinstance(a_active_output_handles, list):
                a_active_output_handles = []

            s_selected_handle = self._sanitize_handle_key(
                str(o_output.get("selected_handle", "")).strip()
            )
            if s_selected_handle != "":
                a_active_output_handles.append(s_selected_handle)

            a_normalized_handles: List[str] = []
            d_seen_handles: Dict[str, bool] = {}

            for o_handle in a_active_output_handles:
                s_handle = self._sanitize_handle_key(str(o_handle).strip())
                if s_handle == "":
                    continue
                if s_handle in d_seen_handles:
                    continue
                d_seen_handles[s_handle] = True
                a_normalized_handles.append(s_handle)

            if len(a_normalized_handles) == 0:
                return

            for s_handle in a_normalized_handles:
                a_selected_next_nodes = d_source_handles.get(s_handle, [])
                for s_next_node_id in a_selected_next_nodes:
                    d_node_enabled[s_next_node_id] = True
            return

        for s_next_node_id in a_next_nodes:
            d_node_enabled[s_next_node_id] = True
    # file: backend/services/workflow_runner.py
# description: Zusatzmethoden fuer Template Syntax im Workflow Runner.
# history:
# - 2026-05-01: Resolver Kontext fuer globale Werte und Workflow Werte ergaenzt. author Marcus Schlieper
# author Marcus Schlieper

    def _build_global_value_map(
        self,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        a_global_variables = payload.get("global_variables", [])
        d_result: Dict[str, Any] = {}

        if not isinstance(a_global_variables, list):
            return d_result

        for o_item in a_global_variables:
            if not isinstance(o_item, dict):
                continue

            s_name = str(o_item.get("s_name", "")).strip()
            if s_name == "":
                continue

            d_result[s_name] = o_item.get("value")

        return d_result

    def _build_workflow_value_map(
        self,
        payload: Dict[str, Any],
        s_name: str,
    ) -> Dict[str, Any]:
        return {
            "name": s_name,
            "node_count": len(payload.get("nodes", [])) if isinstance(payload.get("nodes", []), list) else 0,
            "edge_count": len(payload.get("edges", [])) if isinstance(payload.get("edges", []), list) else 0,
        }

    def _resolve_node_templates_in_data(
        self,
        o_node: Dict[str, Any],
        o_current_node_context: Dict[str, Any],
        d_results_by_node_id: Dict[str, Dict[str, Any]],
        d_global_values: Dict[str, Any],
        d_workflow_values: Dict[str, Any],
    ) -> Dict[str, Any]:
        def _walk(o_value: Any) -> Any:
            if isinstance(o_value, str):
                return resolve_template_text(
                    s_template=o_value,
                    o_current_node_context=o_current_node_context,
                    d_results_by_node_id=d_results_by_node_id,
                    d_global_values=d_global_values,
                    d_workflow_values=d_workflow_values,
                )

            if isinstance(o_value, list):
                return [_walk(o_item) for o_item in o_value]

            if isinstance(o_value, dict):
                return {
                    s_key: _walk(o_item)
                    for s_key, o_item in o_value.items()
                }

            return o_value

        o_node_copy = copy.deepcopy(o_node)
        o_node_copy["data"] = _walk(o_node_copy.get("data", {}))
        return o_node_copy

