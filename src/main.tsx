import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./global.css";
import "./pages/LandingPage.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
