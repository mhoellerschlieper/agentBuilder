# file: backend/nodes/tool_planner/node_impl.py
# description: Planner Node Implementierung mit LLM basierter Aufgabenplanung.
# history:
# - 2026-04-20: Erste ausgelagerte Version aus bestehender Planner Logik. author Marcus Schlieper

import copy
import json
from typing import Any, Dict, List

from tools.LLM import llmTextGen
from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


DEFAULT_TASK_CREATOR_PROMPT_WITH_TOOLS = """
You are an task creation AI and creates tasks that uses the result of an execution agent
to create new tasks with the following objective: {objective}.
Decide how many tasks are neccessary to solve the objective but less than 20 tasks are allowed.
Take focus on the chat history.
The last completed task has the result: {last_result}.
This result was based on this task description: {task_name}.
These are incomplete tasks: {task_list}.
Based on the result, create new tasks to be completed by the AI system that do not overlap with incomplete tasks.
You are intererrested in all user themes and be neutral.

Important: Describe each task exactly and direct without any references.

Use differnt tools.
The last task is a summary with the gpt_summarization tool.
Solve the tasks step by step.

Do not ask in the summary task. Use the summary task to summarize the research.
Do not repeat tasks.
Do not visit homepage with the same query parameters.

Return the tasks as an array. Use following Syntax:
Your tools: {tools}
You can use a tool by writing TOOL: TOOL_NAME into the JSON tool then the arguments of the tool into arg.
Priorize(0=hi,3=medium,5=low) the importance of the tool.
Use yourPrompt add some additional intents.
Finally you plan the task for parallel execution. Think witch task depends on and waiting for the other.
Describe your plan in dependencies in each task.
Decide for each task if the task output is relevant for the agent output or it as an interim result for the next dependent tasks and use outputIsRelevantForResult.

JSON: {json_description}
"""


class NodePlannerNode(BaseNode):
    def get_node_type(self) -> str:
        return "node_planner"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "input_main", "s_label": "objective", "s_description": "planning objective"},
            {"s_key": "input_context", "s_label": "context", "s_description": "optional planning context"},
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "output_main", "s_label": "plan", "s_description": "planner result"},
            {"s_key": "tasks", "s_label": "tasks", "s_description": "planned tasks"},
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        s_model_name = str(o_data.get("s_model_name", "")).strip()
        s_api_key = str(o_data.get("s_api_key", "")).strip()
        s_api_host = str(o_data.get("s_api_host", "")).strip()
        s_provider = str(o_data.get("s_provider", "openai")).strip().lower()
        s_prompt = str(o_data.get("s_prompt", "")).strip()
        s_objective = str(o_data.get("s_objective", "")).strip()
        s_last_result = str(o_data.get("s_last_result", "")).strip()
        s_task_name = str(o_data.get("s_task_name", "initialize system")).strip() or "initialize system"
        d_temperature = float(str(o_data.get("d_temperature", "0.2")).strip() or "0.2")
        i_timeout = int(o_data.get("i_timeout", 20000) or 20000)
        i_max_completion_tokens = int(o_data.get("max_completion_tokens", 8000) or 8000)

        a_task_list = o_data.get("task_list", [])
        a_tools = o_data.get("tools", [])

        if not isinstance(a_task_list, list):
            a_task_list = []

        if not isinstance(a_tools, list):
            a_tools = []

        if s_model_name == "":
            raise ValueError("planner_model_required")

        if s_objective == "":
            s_objective = self._build_objective_from_inputs(o_context.input_context)

        if s_objective == "":
            raise ValueError("planner_objective_required")

        s_tools_text = self._build_tools_text(a_tools)
        s_json_description = (
            '{tasks:[{taskNumber:number, prio:number, task:string, tool:string, '
            'arg:string, dependencies:[number], yourPrompt:string, '
            'outputIsRelevantForResult:boolean}]}'
        )

        s_effective_prompt = s_prompt or DEFAULT_TASK_CREATOR_PROMPT_WITH_TOOLS
        s_user_prompt = s_effective_prompt.format(
            objective=s_objective,
            last_result=s_last_result or "no last results",
            task_name=s_task_name,
            task_list=json.dumps(a_task_list, ensure_ascii=True),
            tools=s_tools_text,
            json_description=s_json_description,
        )

        a_messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": "You create structured task plans and return valid JSON only.",
            },
            {
                "role": "user",
                "content": s_user_prompt,
            },
        ]

        s_response_text, d_token = llmTextGen(
            model=s_model_name,
            messages=a_messages,
            max_completion_tokens=i_max_completion_tokens,
            timeout=i_timeout,
            response_format={"type": "json_object"},
            s_provider=s_provider,
            s_endpoint_url=s_api_host if s_provider == "endpoint" else "",
            s_endpoint_api_key=s_api_key if s_provider == "endpoint" else "",
            d_endpoint_headers=None,
        )

        o_parsed = self._parse_json_response(s_response_text)
        a_tasks = o_parsed.get("tasks", [])

        if not isinstance(a_tasks, list):
            raise ValueError("planner_tasks_invalid")

        a_normalized_tasks = self._normalize_tasks(a_tasks)

        o_main_output = {
            "objective": s_objective,
            "task_name": s_task_name,
            "task_count": len(a_normalized_tasks),
            "tasks": a_normalized_tasks,
            "raw_response": s_response_text,
            "model": s_model_name,
            "provider": s_provider,
            "temperature": d_temperature,
            "token_usage": d_token,
            "resolved_data": {
                **o_data,
                "s_api_key": "***" if s_api_key != "" else "",
            },
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "node_planner_ok",
            "output": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "plan",
                "node_outputs": {
                    "output_main": o_main_output,
                    "tasks": {
                        "tasks": a_normalized_tasks,
                        "task_count": len(a_normalized_tasks),
                    },
                },
            },
        }

    def _build_objective_from_inputs(self, o_input_context: Dict[str, Any]) -> str:
        d_named_inputs = o_input_context.get("named_inputs", {})
        if not isinstance(d_named_inputs, dict):
            return ""

        for s_key in ["input_main", "objective", "prompt_data"]:
            if s_key in d_named_inputs:
                o_value = d_named_inputs.get(s_key)
                return self._stringify_value(o_value)

        try:
            return json.dumps(d_named_inputs, ensure_ascii=True)
        except Exception:
            return str(d_named_inputs)

    def _build_tools_text(self, a_tools: List[Any]) -> str:
        a_parts: List[str] = []
        for o_tool in a_tools:
            if not isinstance(o_tool, dict):
                continue
            s_name = str(o_tool.get("name", "")).strip()
            s_spec = str(o_tool.get("spec", "")).strip()
            if s_name == "":
                continue
            a_parts.append(f"Toolname: {s_name}\nToolSpec: {s_spec}\n###")
        return "\n".join(a_parts)

    def _parse_json_response(self, s_response_text: str) -> Dict[str, Any]:
        s_clean = str(s_response_text).strip()
        if s_clean == "":
            raise ValueError("planner_empty_response")

        try:
            o_parsed = json.loads(s_clean)
            if isinstance(o_parsed, dict):
                return o_parsed
        except Exception:
            pass

        i_start = s_clean.find("{")
        i_end = s_clean.rfind("}")
        if i_start != -1 and i_end != -1 and i_end > i_start:
            s_json = s_clean[i_start:i_end + 1]
            o_parsed = json.loads(s_json)
            if isinstance(o_parsed, dict):
                return o_parsed

        raise ValueError("planner_invalid_json_response")

    def _normalize_tasks(self, a_tasks: List[Any]) -> List[Dict[str, Any]]:
        a_result: List[Dict[str, Any]] = []

        for i_index, o_task in enumerate(a_tasks):
            if not isinstance(o_task, dict):
                continue

            i_task_number = self._safe_int(o_task.get("taskNumber", i_index + 1), i_index + 1)
            i_prio = self._safe_int(o_task.get("prio", 3), 3)
            s_task = str(o_task.get("task", "")).strip() or f"task_{i_index + 1}"
            s_tool = str(o_task.get("tool", "")).strip()
            s_arg = str(o_task.get("arg", "")).strip()
            s_your_prompt = str(o_task.get("yourPrompt", "")).strip()
            b_output_is_relevant_for_result = bool(o_task.get("outputIsRelevantForResult", False))

            a_dependencies_raw = o_task.get("dependencies", [])
            a_dependencies: List[int] = []
            if isinstance(a_dependencies_raw, list):
                for o_dependency in a_dependencies_raw:
                    a_dependencies.append(self._safe_int(o_dependency, 0))

            a_result.append(
                {
                    "taskNumber": i_task_number,
                    "prio": i_prio,
                    "task": s_task,
                    "tool": s_tool,
                    "arg": s_arg,
                    "dependencies": a_dependencies,
                    "yourPrompt": s_your_prompt,
                    "outputIsRelevantForResult": b_output_is_relevant_for_result,
                }
            )

        return a_result

    def _safe_int(self, o_value: Any, i_default: int) -> int:
        try:
            return int(o_value)
        except Exception:
            return i_default

    def _stringify_value(self, o_value: Any) -> str:
        if isinstance(o_value, dict) or isinstance(o_value, list):
            try:
                return json.dumps(o_value, ensure_ascii=True)
            except Exception:
                return str(o_value)
        if o_value is None:
            return ""
        return str(o_value)
