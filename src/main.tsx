import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./styles.css";

const root = document.querySelector("#root");

if (!root) {
  throw new Error("Leavewell mount element is missing.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => window.dispatchEvent(new Event("offline-cache-error")));
  });
}
