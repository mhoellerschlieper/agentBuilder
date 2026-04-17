/* file: src/main.tsx
description: React Einstiegspunkt.
history:
- 2026-03-25: Erstellt fuer Frontend Bootstrap. author Marcus Schlieper
- 2026-03-29: StrictMode Rendering vervollstaendigt. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./styles.css";

const o_root_element = document.getElementById("root");

if (!o_root_element) {
  throw new Error("root_element_not_found");
}

ReactDOM.createRoot(o_root_element).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
