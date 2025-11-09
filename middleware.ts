import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// On protège explicitement les routes sensibles, PAS la home
const isProtectedRoute = createRouteMatcher([
  "/inscriptions/:path*",
  "/pdf-preview/:path*",
  "/api/:path*",
  "/trpc/:path*",
  "/sign-in(.*)",
]);

// Préfixes des API publiques
const publicApiPrefixes = [
  "/api/inscriptions",
  "/api/competitors/with-inscriptions",
  "/api/competitors",
  "/api/users", // Allow public access to user info for creator display
];

// Fonction pour savoir si une page d'inscription individuelle est publique
function isPublicInscriptionPage(url: string) {
  // /inscriptions/quelquechose mais PAS /inscriptions/new ou autre sous-page
  const match = url.match(/^\/inscriptions\/([^\/]+)$/);
  if (!match) return false;
  const id = match[1];
  // Exclure les routes comme /inscriptions/new, /inscriptions/secret, etc.
  return id !== "new";
}

// Detect browser language and set cookie if not already set
function detectAndSetLocale(req: Request) {
  const localeCookie = req.headers.get("cookie")?.match(/locale=([^;]+)/)?.[1];

  // If locale cookie already exists, do nothing
  if (localeCookie) return null;

  // Get browser language from Accept-Language header
  const acceptLanguage = req.headers.get("accept-language");
  let detectedLocale = "en"; // default

  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7")
    const languages = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().toLowerCase());

    // Check if browser prefers French or Spanish
    for (const lang of languages) {
      if (lang.startsWith("fr")) {
        detectedLocale = "fr";
        break;
      }
      if (lang.startsWith("es")) {
        detectedLocale = "es";
        break;
      }
    }
  }

  return detectedLocale;
}

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl.pathname;

  // Handle locale detection and cookie setting
  const detectedLocale = detectAndSetLocale(req);

  // API publiques
  if (
    publicApiPrefixes.some(
      (prefix) => url === prefix || url.startsWith(prefix + "/")
    )
  ) {
    // Set locale cookie if needed, even for public APIs
    if (detectedLocale) {
      const response = NextResponse.next();
      response.cookies.set("locale", detectedLocale, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
      return response;
    }
    return;
  }

  // Page d'inscription individuelle publique
  if (isPublicInscriptionPage(url)) {
    if (detectedLocale) {
      const response = NextResponse.next();
      response.cookies.set("locale", detectedLocale, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
      return response;
    }
    return;
  }

  // Protected routes
  if (isProtectedRoute(req)) {
    await auth.protect();

    // Set locale cookie if needed
    if (detectedLocale) {
      const response = NextResponse.next();
      response.cookies.set("locale", detectedLocale, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
      return response;
    }
  }
});

export const config = {
  matcher: [
    "/",
    "/inscriptions/:path*",
    "/pdf-preview/:path*",
    "/api/:path*",
    "/trpc/:path*",
    "/sign-in(.*)",
  ],
};
