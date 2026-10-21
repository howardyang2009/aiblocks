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
import s10De from "./screens/10.de.png";
import s10ZhCN from "./screens/10.zh-CN.png";

export const screenshots = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10] as const;

// Steps 1 and 10 are our own page, so a Locale can get shots of its own UI.
// Steps 2-9 are Stripe-hosted and stay shared.
export const screenshotsDe = [s01De, s02, s03, s04, s05, s06, s07, s08, s09, s10De] as const;
export const screenshotsZhCN = [s01ZhCN, s02, s03, s04, s05, s06, s07, s08, s09, s10ZhCN] as const;
