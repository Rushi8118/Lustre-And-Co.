import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import { setCurrency } from "../data/products";

const SettingsContext = createContext(null);
const BOOT_CACHE_KEY = "lustre_boot_cache";

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
  const [waking, setWaking] = useState(false);

  const apply = useCallback((settingsData, categoriesData) => {
    setCurrency(settingsData?.commerce?.currency);
    setSettings(settingsData);
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    applySeo(settingsData?.seo);
    setError("");
    setStatus("ready");
  }, []);

  const reload = useCallback(async () => {
    // The free API host sleeps when idle and can take up to a minute to wake,
    // so retry network/5xx failures for a while before showing an error.
    const deadline = Date.now() + 90_000;
    const slowTimer = setTimeout(() => setWaking(true), 4000);
    let attempt = 0;
    try {
      for (;;) {
        try {
          const [settingsRes, categoriesRes] = await Promise.all([
            api.get("/settings", { timeout: 30_000 }),
            api.get("/categories", { timeout: 30_000 })
          ]);
          apply(settingsRes.data, categoriesRes.data);
          try {
            localStorage.setItem(
              BOOT_CACHE_KEY,
              JSON.stringify({ settings: settingsRes.data, categories: categoriesRes.data })
            );
          } catch {
            // storage unavailable; the cache is only a speed-up
          }
          return;
        } catch (err) {
          const retryable = !err.response || err.response.status >= 500;
          if (!retryable || Date.now() > deadline) {
            setError(getErrorMessage(err, "The store could not be loaded."));
            setStatus((current) => (current === "ready" ? "ready" : "error"));
            return;
          }
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, Math.min(2000 * attempt, 8000)));
        }
      }
    } finally {
      clearTimeout(slowTimer);
      setWaking(false);
    }
  }, [apply]);

  useEffect(() => {
    // Render instantly from the last good response, then refresh in the background.
    try {
      const cached = JSON.parse(localStorage.getItem(BOOT_CACHE_KEY) || "null");
      if (cached?.settings) apply(cached.settings, cached.categories);
    } catch {
      // ignore a corrupt or unavailable cache
    }
    reload();
  }, [apply, reload]);

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
        <p>{waking ? "Waking up the store server — this can take up to a minute…" : "Loading the store…"}</p>
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
