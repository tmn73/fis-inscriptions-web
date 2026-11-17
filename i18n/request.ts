import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["en", "fr", "es", "it"] as const;
const defaultLocale = "en";

export default getRequestConfig(async () => {
  // Read locale from cookie
  const cookieStore = await cookies();
  let locale = cookieStore.get("locale")?.value || defaultLocale;

  // Ensure that a valid locale is used
  if (!locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
