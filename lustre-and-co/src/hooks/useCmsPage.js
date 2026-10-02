import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../services/api";

/** Loads a published content page managed in the admin panel. */
export default function useCmsPage(slug) {
  const [state, setState] = useState({ page: null, status: "loading", error: "" });

  useEffect(() => {
    let active = true;
    setState({ page: null, status: "loading", error: "" });

    api
      .get(`/pages/${slug}`)
      .then(({ data }) => active && setState({ page: data, status: "ready", error: "" }))
      .catch(
        (err) =>
          active &&
          setState({
            page: null,
            status: err.response?.status === 404 ? "not-found" : "error",
            error: getErrorMessage(err, "This page could not be loaded.")
          })
      );

    return () => {
      active = false;
    };
  }, [slug]);

  return state;
}

export function toParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toAnchor(text, fallback) {
  return (
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}
