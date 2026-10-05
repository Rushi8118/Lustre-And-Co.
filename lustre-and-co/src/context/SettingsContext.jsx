import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import { setCurrency } from "../data/products";
import { DEFAULT_SETTINGS } from "../data/defaultSettings";
import { DEFAULT_CATEGORIES } from "../data/defaultCategories";

const SettingsContext = createContext(null);

const CACHE_KEY = "lustre_store_cache_v1";

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

/** Last successful response, so a repeat visit paints with the real store data at once. */
function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.settings?.store ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable (private mode); the site still works for this visit.
  }
}

/**
 * Provides store settings without ever blocking the first paint.
 *
 * The page renders straight away from the cached response, or from the bundled
 * snapshot on a first visit, and the live values replace them as soon as the API
 * answers. Previously the whole site waited behind a "Loading the store…" screen,
 * which meant staring at a spinner for as long as the backend took to wake up.
 */
export function SettingsProvider({ children }) {
  const cached = useRef(readCache()).current;
  const [settings, setSettings] = useState(cached?.settings || null);
  const [categories, setCategories] = useState(cached?.categories || null);
  const [error, setError] = useState("");

  const effectiveSettings = settings || DEFAULT_SETTINGS;
  const effectiveCategories = categories || DEFAULT_CATEGORIES;

  const reload = useCallback(async (isRetry = false) => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        api.get("/settings"),
        api.get("/categories")
      ]);
      const nextSettings = settingsRes.data;
      const nextCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      setSettings(nextSettings);
      setCategories(nextCategories);
      applySeo(nextSettings?.seo);
      writeCache({ settings: nextSettings, categories: nextCategories });
      setError("");
    } catch (err) {
      if (!isRetry) {
        // Give the backend a moment in case it was still starting up.
        setTimeout(() => reload(true), 1500);
        return;
      }
      // Nothing is blocked: the cached or bundled values stay on screen.
      setError(getErrorMessage(err, "The store could not be loaded."));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Prices must format correctly before the API answers.
  useEffect(() => {
    setCurrency(effectiveSettings?.commerce?.currency);
  }, [effectiveSettings]);

  const value = useMemo(
    () => ({
      settings: effectiveSettings,
      categories: effectiveCategories,
      commerce: effectiveSettings?.commerce,
      error,
      reload
    }),
    [effectiveSettings, effectiveCategories, error, reload]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}
