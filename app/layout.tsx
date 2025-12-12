import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import {Providers} from "./providers";
import {Snowflake} from "lucide-react";
import {Header} from "@/components/ui/Header";
import {ClerkProvider} from "@clerk/nextjs";
import {NetworkStatus} from "@/components/ui/NetworkStatus";
import "./globals.css";
import {frFR} from "@clerk/localizations";
import {NextIntlClientProvider} from "next-intl";
import {getMessages} from "next-intl/server";
import {Analytics} from "@vercel/analytics/next";

// Component to always provide ClerkProvider with fallback key for build
function ConditionalClerkProvider({children}: {children: React.ReactNode}) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "pk_test_Y29uY2lzZS1xdWFpbC0zNC5jbGVyay5hY2NvdW50cy5kZXYk";

  return (
    <ClerkProvider localization={frFR} publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inscriptions FIS Etranger",
  description: "Inscriptions FIS Etranger",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: [
      {url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png"},
      {url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png"},
    ],
    apple: {
      url: "/favicons/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
    other: [
      {
        url: "/favicons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/favicons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConditionalClerkProvider>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              <div className="min-h-screen bg-slate-50 pb-10">
                {/* Subtle background pattern */}
                <div className="fixed inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none" />
                {/* Header avec effet de neige et montagnes */}
                <div className="relative text-white overflow-hidden">
                  {/* Gradient background with depth */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#60a5fa]" />

                  {/* Subtle radial glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15)_0%,transparent_60%)]" />

                  {/* Snowflakes */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {Array.from({length: 35}).map((_, i) => {
                      const initialOpacity = Math.random() * 0.4 + 0.2;
                      const scale = Math.random() * 0.5 + 0.3;
                      const duration = Math.random() * 12 + 12;
                      const delay = Math.random() * -20;
                      const xAmplitude =
                        (Math.random() * 60 + 20) *
                        (Math.random() > 0.5 ? 1 : -1);
                      const rotation =
                        (Math.random() * 360 + 180) *
                        (Math.random() > 0.5 ? 1 : -1);

                      return (
                        <Snowflake
                          key={i}
                          className="absolute text-white/80 animate-snowfall"
                          style={
                            {
                              top: "-10%",
                              left: `${Math.random() * 100}%`,
                              "--opacity": initialOpacity,
                              "--scale": scale,
                              opacity: initialOpacity,
                              transform: `scale(${scale})`,
                              animationDuration: `${duration}s`,
                              animationDelay: `${delay}s`,
                              "--x-amplitude": `${xAmplitude}px`,
                              "--rotation": `${rotation}deg`,
                            } as React.CSSProperties
                          }
                        />
                      );
                    })}
                  </div>

                  {/* Header content */}
                  <div className="relative z-10">
                    <Header />
                  </div>

                </div>
                <div className="flex justify-center py-8 px-4">
                  <div className="w-full max-w-8xl">
                    {children}
                  </div>
                </div>
              </div>
              <NetworkStatus />
            </Providers>
          </NextIntlClientProvider>
        </ConditionalClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
