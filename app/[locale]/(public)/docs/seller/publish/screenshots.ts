// Guide screenshots, shared by every Locale's content file. Static imports
// give next/image their intrinsic size, so the layout does not shift (#79).
import s01 from "./screens/01.png";
import s01De from "./screens/01.de.png";
import s02 from "./screens/02.png";
import s02De from "./screens/02.de.png";
import s03 from "./screens/03.png";
import s04 from "./screens/04.png";
import s04De from "./screens/04.de.png";
import s05 from "./screens/05.png";

export const screenshots = [s01, s02, s03, s04, s05] as const;

// A Locale can get shots of its own UI where one exists.
export const screenshotsDe = [s01De, s02De, s03, s04De, s05] as const;
