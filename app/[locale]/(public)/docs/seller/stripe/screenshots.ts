// Guide screenshots, shared by every Locale's content file. Static imports
// give next/image their intrinsic size, so the layout does not shift (#79).
import s01 from "./screens/01.png";
import s01De from "./screens/01.de.png";
import s01ZhCN from "./screens/01.zh-CN.png";
import s02 from "./screens/02.png";
import s03 from "./screens/03.png";
import s04 from "./screens/04.png";
import s05 from "./screens/05.png";
import s06 from "./screens/06.png";
import s07 from "./screens/07.png";
import s08 from "./screens/08.png";
import s09 from "./screens/09.png";
import s10 from "./screens/10.png";

export const screenshots = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10] as const;

// Step 1 is our own page, so each Locale gets a shot of its own UI. The rest
// are Stripe-hosted and stay shared.
export const screenshotsDe = [s01De, s02, s03, s04, s05, s06, s07, s08, s09, s10] as const;
export const screenshotsZhCN = [s01ZhCN, s02, s03, s04, s05, s06, s07, s08, s09, s10] as const;
