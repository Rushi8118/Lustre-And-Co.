import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SettingsProvider } from "./context/SettingsContext";
import { StoreProvider } from "./context/StoreContext";
import { initAnalytics } from "./services/analytics";
import "./styles.css";
import "./app-extras.css";

// Loaded before the app so visits are counted even if the store is still
// waking up and the app has not rendered yet.
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
