import {useLocale} from "next-intl";
import {enGB, es, fr, it} from "date-fns/locale";
import type {Locale as DateFnsLocale} from "date-fns";

// Langue de l'interface -> locale BCP 47 pour toLocaleDateString / toLocaleTimeString
const INTL_LOCALES: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  it: "it-IT",
};

// Langue de l'interface -> locale date-fns
const DATE_FNS_LOCALES: Record<string, DateFnsLocale> = {fr, en: enGB, es, it};

export const useDateLocale = (): string => INTL_LOCALES[useLocale()] ?? "en-GB";

export const useDateFnsLocale = (): DateFnsLocale =>
  DATE_FNS_LOCALES[useLocale()] ?? enGB;
