import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { SettingsProvider } from "./context/SettingsContext";
import { StoreProvider } from "./context/StoreContext";
import "./styles.css";
import "./app-extras.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Every card, banner and panel animates in via framer-motion. `reducedMotion="user"`
        makes all of them honour the visitor's OS "reduce motion" setting, which CSS alone
        cannot do because framer-motion writes transforms inline. */}
    <MotionConfig reducedMotion="user">
      {/* Opt in to the v7 behaviours now: this silences the upgrade warnings React
          Router logs on every boot, and keeps the eventual v7 bump uneventful. */}
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SettingsProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </SettingsProvider>
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>
);
