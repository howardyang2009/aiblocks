import { describe, it, expect } from "vitest";
import { canonical, listSitemapTargets, pageSeo, robotsRules, sitemapEntries, truncateDescription, type SitemapDb } from "@/lib/seo";
import { APP_URL } from "@/lib/constants";

describe("sitemapEntries", () => {
  const urls = (targets: Parameters<typeof sitemapEntries>[0]) => sitemapEntries(targets).map((e) => e.url);

  it("lists every static content page under all three Locale prefixes", () => {
    const listed = urls({ componentIds: [], sellerUsernames: [] });
    for (const prefix of ["/de", "/en", "/zh"]) {
      expect(listed).toContain(`${APP_URL}${prefix}`);
      for (const page of ["browse", "about", "contact", "impressum", "privacy", "terms", "docs/seller/publish", "docs/seller/stripe"]) {
        expect(listed).toContain(`${APP_URL}${prefix}/${page}`);
      }
    }
    expect(listed).toHaveLength(27);
  });

  it("lists each published Component and Seller page in every Locale", () => {
    const listed = urls({ componentIds: ["c1"], sellerUsernames: ["ada"] });
    expect(listed).toEqual(
      expect.arrayContaining([
        `${APP_URL}/de/components/c1`,
        `${APP_URL}/en/components/c1`,
        `${APP_URL}/zh/components/c1`,
        `${APP_URL}/de/sellers/ada`,
        `${APP_URL}/en/sellers/ada`,
        `${APP_URL}/zh/sellers/ada`,
      ])
    );
    expect(listed).toHaveLength(33);
  });

  it("never lists dashboard, sign-in, sign-up, search or API URLs", () => {
    const listed = urls({ componentIds: ["c1"], sellerUsernames: ["ada"] });
    expect(listed.filter((u) => /dashboard|sign-in|sign-up|search|\/api\//.test(u))).toEqual([]);
  });

  it("escapes a username that is not URL-safe", () => {
    expect(urls({ componentIds: [], sellerUsernames: ["a b"] })).toContain(`${APP_URL}/en/sellers/a%20b`);
  });
});

describe("listSitemapTargets", () => {
  function fakeDb(components: { id: string; seller_id: string }[], profiles: { id: string; username: string }[]) {
    const calls: unknown[][] = [];
    const db = {
      from(table: string) {
        return {
          select(columns: string) {
            if (table === "components") {
              return {
                eq(column: string, value: string) {
                  calls.push(["components", columns, column, value]);
                  return Promise.resolve({ data: components });
                },
              };
            }
            return {
              in(column: string, values: string[]) {
                calls.push(["profiles", columns, column, values]);
                return Promise.resolve({ data: profiles.filter((p) => values.includes(p.id)) });
              },
            };
          },
        };
      },
    } as unknown as SitemapDb;
    return { db, calls };
  }

  it("returns published Components and the Sellers who published them, each once", async () => {
    const { db, calls } = fakeDb(
      [
        { id: "c1", seller_id: "p1" },
        { id: "c2", seller_id: "p1" },
        { id: "c3", seller_id: "p2" },
      ],
      [
        { id: "p1", username: "ada" },
        { id: "p2", username: "lin" },
        { id: "p3", username: "nobody" },
      ]
    );
    expect(await listSitemapTargets(db)).toEqual({ componentIds: ["c1", "c2", "c3"], sellerUsernames: ["ada", "lin"] });
    expect(calls[0]).toEqual(["components", "id, seller_id", "status", "published"]);
    expect(calls[1]).toEqual(["profiles", "username", "id", ["p1", "p2"]]);
  });

  it("skips the profile lookup when nothing is published", async () => {
    const { db, calls } = fakeDb([], [{ id: "p3", username: "nobody" }]);
    expect(await listSitemapTargets(db)).toEqual({ componentIds: [], sellerUsernames: [] });
    expect(calls).toHaveLength(1);
  });
});

describe("robotsRules", () => {
  it("keeps crawlers out of the API and every Locale's dashboard and points to the sitemap", () => {
    expect(robotsRules()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/*/dashboard"] },
      sitemap: `${APP_URL}/sitemap.xml`,
    });
  });
});

describe("truncateDescription", () => {
  it("keeps a description of 160 characters or fewer as it is", () => {
    const text = "x".repeat(160);
    expect(truncateDescription(text)).toBe(text);
  });

  it("cuts a long description at a word boundary and marks the cut", () => {
    const text = "word ".repeat(40).trim(); // 199 characters
    const cut = truncateDescription(text);
    expect(cut.length).toBeLessThanOrEqual(160);
    expect(cut).toBe("word ".repeat(32).trim() + "…");
  });

  it("hard-cuts text without spaces, such as Chinese", () => {
    const cut = truncateDescription("组".repeat(200));
    expect(cut).toBe("组".repeat(159) + "…");
  });

  it("collapses line breaks and runs of whitespace", () => {
    expect(truncateDescription("  A tool\n\nfor   agents ")).toBe("A tool for agents");
  });
});

describe("canonical", () => {
  it("is the absolute URL of the same page in its own Locale, with the public /zh prefix", () => {
    expect(canonical("zh-CN", "/components/c1")).toEqual({ canonical: `${APP_URL}/zh/components/c1` });
    expect(canonical("de", "")).toEqual({ canonical: `${APP_URL}/de` });
  });
});

describe("pageSeo", () => {
  it("gives an indexed static page a self-referencing canonical", () => {
    expect(pageSeo("privacy", "zh-CN")).toEqual({ alternates: { canonical: `${APP_URL}/zh/privacy` } });
    expect(pageSeo("sellerStripeGuide", "en")).toEqual({
      alternates: { canonical: `${APP_URL}/en/docs/seller/stripe` },
    });
  });

  it("keeps sign-in, sign-up and search out of the index", () => {
    for (const page of ["signIn", "signUp", "search"] as const) {
      expect(pageSeo(page, "de")).toEqual({ robots: { index: false } });
    }
  });
});
