import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SettingsProvider } from "./context/SettingsContext";
import { StoreProvider } from "./context/StoreContext";
import "./styles.css";
import "./app-extras.css";

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
