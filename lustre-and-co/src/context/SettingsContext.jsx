import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import { setCurrency } from "../data/products";

const SettingsContext = createContext(null);

function applySeo(seo) {
  if (!seo) return;
  if (seo.metaTitle) document.title = seo.metaTitle;
  if (seo.metaDescription) {
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = seo.metaDescription;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        api.get("/settings"),
        api.get("/categories")
      ]);
      setCurrency(settingsRes.data?.commerce?.currency);
      setSettings(settingsRes.data);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      applySeo(settingsRes.data?.seo);
      setError("");
      setStatus("ready");
    } catch (err) {
      setError(getErrorMessage(err, "The store could not be loaded."));
      setStatus((current) => (current === "ready" ? "ready" : "error"));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      settings,
      categories,
      commerce: settings?.commerce,
      reload
    }),
    [settings, categories, reload]
  );

  if (status === "loading") {
    return (
      <div className="app-boot" role="status">
        <span className="app-boot-mark">✦</span>
        <p>Loading the store…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="app-boot app-boot-error" role="alert">
        <span className="app-boot-mark">✦</span>
        <h1>We can’t reach the store right now.</h1>
        <p>{error}</p>
        <button
          type="button"
          className="button button-dark"
          onClick={() => {
            setStatus("loading");
            reload();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}
