import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { localePrefix, routing } from "@/i18n/routing";
import "../globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "AiBlocks — reusable AI components",
  description:
    "An open marketplace for reusable AI building blocks: prompts, skills, agents, MCP servers, CLAUDE.md configs, hooks, and more.",
};

// Prerender every Locale; the Locale reaches rendering via next/root-params
// (see i18n/request.ts), so pages need no setRequestLocale.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const prefix = localePrefix(locale);

  return (
    <ClerkProvider signInUrl={`${prefix}/sign-in`} signUpUrl={`${prefix}/sign-up`}>
      <html lang={locale} className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <body className="min-h-screen flex flex-col">
          <NextIntlClientProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
