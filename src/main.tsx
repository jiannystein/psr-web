import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoot } from "@app/AppRoot";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);
