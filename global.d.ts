import type { routing } from "@/i18n/routing";
import type messages from "@/messages/en.json";

// Types next-intl's Locale and message keys from the routing config and the
// `en` Source copy.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
