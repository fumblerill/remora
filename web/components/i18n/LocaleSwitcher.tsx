"use client";

import { useTranslation } from "./LocaleProvider";

const LABELS = {
  ru: "RU",
  en: "EN",
};

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  const nextLocale = locale === "ru" ? "en" : "ru";

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      className="inline-flex items-center gap-2 rounded border border-white/60 bg-white/10 px-3 py-1.5 text-sm uppercase tracking-wide text-white transition hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white"
      title={t("header.languageToggleTitle", { locale: LABELS[nextLocale as keyof typeof LABELS] })}
    >
      <span className="text-xs opacity-80">{t("header.languageLabel")}</span>
      <span>{LABELS[locale as keyof typeof LABELS]}</span>
    </button>
  );
}
