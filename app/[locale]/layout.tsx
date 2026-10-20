import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { clerkProviderProps } from "@/i18n/clerk";
import { routing } from "@/i18n/routing";
import { APP_URL } from "@/lib/constants";
import "../globals.css";

// Every weight renders (#82). Mono 500 only via fallback: `code` in bold text
// or a README heading. Each family is one variable woff2, so a weight costs no bytes.
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

// Absolute URLs resolve against APP_URL. Each page sets its own canonical
// (lib/seo.ts); hreflang comes from next-intl's `Link` headers (#68).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    metadataBase: new URL(APP_URL),
    title: { template: "%s · AiBlocks", default: t("title") },
    description: t("description"),
  };
}

// Prerender every Locale; the Locale reaches rendering via next/root-params
// (see i18n/request.ts), so pages need no setRequestLocale.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <ClerkProvider {...clerkProviderProps(locale)}>
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
