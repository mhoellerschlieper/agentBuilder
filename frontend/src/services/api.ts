/* file: frontend/src/services/api.ts
description: API Client fuer sichere Backend Kommunikation und Tool Registry Laden.
history:
- 2026-03-25: Erweitert fuer Workflow Export mit globalen Variablen. author Marcus Schlieper
- 2026-04-11: Endpunkt fuer Tool Registry Laden ergaenzt. author Marcus Schlieper
author Marcus Schlieper
*/
import axios from "axios";

const s_base_url = "http://localhost:5000/api";
const s_api_token = "change_this_token";

const api_client = axios.create({
  baseURL: s_base_url,
  timeout: 100000,
  headers: {
    Authorization: `Bearer ${s_api_token}`,
    "Content-Type": "application/json",
  },
});

export async function validate_workflow(o_workflow: unknown) {
  const o_response = await api_client.post("/workflows/validate", o_workflow);
  return o_response.data;
}

export async function run_workflow(o_workflow: unknown) {
  const o_response = await api_client.post("/workflows/run", o_workflow);
  return o_response.data;
}

export async function fetch_tool_schemas() {
  const o_response = await api_client.get("/tools");
  return o_response.data;
}
