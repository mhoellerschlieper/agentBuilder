# file: backend/nodes/tool_scheduler/node_impl.py
# description: Scheduler Node fuer einfache zeitgesteuerte Aufgaben.
# history:
# - 2026-04-22: Erste funktionsfaehige Version erstellt. author Marcus Schlieper
# - 2026-04-22: Registrierungsfreundliche Outputs und sichere Validierung ergaenzt. author Marcus Schlieper

import copy
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode

class ToolScheduler(BaseNode):
    def get_node_type(self) -> str:
        return "tool_scheduler"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "schedule_input",
                "s_description": "scheduler input data",
            },
            {
                "s_key": "input_context",
                "s_label": "context",
                "s_description": "extra context",
            },
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "schedule_result",
                "s_description": "full scheduler result",
            },
            {
                "s_key": "next_run",
                "s_label": "next_run",
                "s_description": "next run timestamp",
            },
            {
                "s_key": "is_due",
                "s_label": "is_due",
                "s_description": "true if execution is due",
            },
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_mode = str(o_data.get("s_mode", "calculate_next_run")).strip().lower()
        s_start_at = str(o_data.get("s_start_at", "")).strip()
        s_last_run_at = str(o_data.get("s_last_run_at", "")).strip()
        s_now = str(o_data.get("s_now", "")).strip()
        s_interval_unit = str(o_data.get("s_interval_unit", "minutes")).strip().lower()

        i_interval_value = self._safe_int(o_data.get("i_interval_value", 60), 60)
        i_max_occurrences = self._safe_int(o_data.get("i_max_occurrences", 0), 0)

        if i_interval_value < 1:
            i_interval_value = 1
        if i_interval_value > 525600:
            i_interval_value = 525600

        if i_max_occurrences < 0:
            i_max_occurrences = 0
        if i_max_occurrences > 100000:
            i_max_occurrences = 100000

        o_now = self._parse_datetime(s_now)
        if o_now is None:
            o_now = datetime.now(timezone.utc)

        o_start_at = self._parse_datetime(s_start_at)
        if o_start_at is None:
            o_start_at = o_now

        o_last_run_at = self._parse_datetime(s_last_run_at)

        o_result = self._calculate_schedule(
            s_mode=s_mode,
            o_start_at=o_start_at,
            o_last_run_at=o_last_run_at,
            o_now=o_now,
            s_interval_unit=s_interval_unit,
            i_interval_value=i_interval_value,
            i_max_occurrences=i_max_occurrences,
        )

        o_main_output = {
            "mode": s_mode,
            "start_at": self._format_datetime(o_start_at),
            "last_run_at": self._format_datetime(o_last_run_at),
            "now": self._format_datetime(o_now),
            "interval_unit": s_interval_unit,
            "interval_value": i_interval_value,
            "max_occurrences": i_max_occurrences,
            "result": o_result,
            "resolved_data": o_data,
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "node_tool_scheduler_ok",
            "output": o_main_output,
            "value": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "schedule_result",
                "node_outputs": {
                    "output_main": o_main_output,
                    "next_run": o_result.get("next_run_at", ""),
                    "is_due": o_result.get("b_is_due", False),
                },
            },
        }

    def _calculate_schedule(
        self,
        s_mode: str,
        o_start_at: datetime,
        o_last_run_at: Optional[datetime],
        o_now: datetime,
        s_interval_unit: str,
        i_interval_value: int,
        i_max_occurrences: int,
    ) -> Dict[str, Any]:
        # history:
        # - 2026-04-22: Zentrale Terminberechnung erstellt. author Marcus Schlieper

        o_delta = self._build_timedelta(s_interval_unit, i_interval_value)
        if o_delta is None:
            raise ValueError("node_tool_scheduler_invalid_interval_unit")

        if s_mode not in ["calculate_next_run", "check_due"]:
            raise ValueError("node_tool_scheduler_invalid_mode")

        if o_last_run_at is None:
            o_next_run_at = o_start_at
            i_run_count = 0
        else:
            o_next_run_at = o_last_run_at + o_delta
            i_run_count = 1

        b_has_remaining_runs = True
        if i_max_occurrences > 0 and i_run_count >= i_max_occurrences:
            b_has_remaining_runs = False
            o_next_run_at = None

        b_is_due = False
        if o_next_run_at is not None and o_now >= o_next_run_at:
            b_is_due = True

        return {
            "b_is_due": b_is_due,
            "b_has_remaining_runs": b_has_remaining_runs,
            "next_run_at": self._format_datetime(o_next_run_at),
            "run_count_estimate": i_run_count,
        }

    def _build_timedelta(self, s_interval_unit: str, i_interval_value: int) -> Optional[timedelta]:
        if s_interval_unit == "minutes":
            return timedelta(minutes=i_interval_value)
        if s_interval_unit == "hours":
            return timedelta(hours=i_interval_value)
        if s_interval_unit == "days":
            return timedelta(days=i_interval_value)
        if s_interval_unit == "weeks":
            return timedelta(weeks=i_interval_value)
        return None

    def _parse_datetime(self, s_value: str) -> Optional[datetime]:
        if not isinstance(s_value, str):
            return None

        s_value = s_value.strip()
        if s_value == "":
            return None

        try:
            s_value = s_value.replace("Z", "+00:00")
            o_dt = datetime.fromisoformat(s_value)
            if o_dt.tzinfo is None:
                o_dt = o_dt.replace(tzinfo=timezone.utc)
            return o_dt.astimezone(timezone.utc)
        except Exception:
            return None

    def _format_datetime(self, o_value: Optional[datetime]) -> str:
        if o_value is None:
            return ""
        try:
            return o_value.astimezone(timezone.utc).isoformat()
        except Exception:
            return ""

    def _safe_int(self, o_value: Any, i_default: int) -> int:
        try:
            return int(o_value)
        except Exception:
            return i_default
