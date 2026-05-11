import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { translations } from "@/i18n/translations";

const LanguageContext = createContext(null);

const STORAGE_KEY = "qalam:lang";

function detectLang() {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "ar" || stored === "en") return stored;
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("ar") ? "ar" : "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l === "ar" ? "ar" : "en"), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === "ar" ? "en" : "ar")), []);

  const t = useCallback((path, vars = {}) => {
    const parts = path.split(".");
    let cur = translations[lang];
    for (const p of parts) {
      if (cur == null) return path;
      cur = cur[p];
    }
    if (typeof cur !== "string") return path;
    return cur.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  }, [lang]);

  const value = useMemo(() => ({ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
