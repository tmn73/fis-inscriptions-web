"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Flag from "react-world-flags";
import { Languages } from "lucide-react";

type Locale = "en" | "fr" | "es";

const locales: { value: Locale; label: string; countryCode: string }[] = [
  { value: "en", label: "English", countryCode: "GB" },
  { value: "fr", label: "Français", countryCode: "FR" },
  { value: "es", label: "Español", countryCode: "ES" },
];

const getDefaultLocale = (): Locale => {
  if (typeof document !== "undefined") {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1];
    if (cookieValue && ["en", "fr", "es"].includes(cookieValue)) {
      return cookieValue as Locale;
    }
  }
  return "en";
};

const persistLocale = (locale: string) => {
  document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
};

export const LanguageSwitcher = () => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const currentLocale = getDefaultLocale();

  const handleLocaleChange = (newLocale: string) => {
    persistLocale(newLocale);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-white/10"
          aria-label="Change language"
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.value}
            onClick={() => handleLocaleChange(locale.value)}
            className="cursor-pointer gap-3 py-2"
          >
            <Flag
              code={locale.countryCode}
              className="w-5 h-5 rounded flex-shrink-0"
              style={{ width: 20, height: 20 }}
            />
            <span className="flex-1">{locale.label}</span>
            {locale.value === currentLocale && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
