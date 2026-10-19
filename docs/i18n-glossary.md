# i18n glossary

One fixed translation per `CONTEXT.md` term for each Locale, so the same concept reads the same way on every page. Use these words in `messages/*.json`, the per-Locale seller guides and the Legal pages. Reviewers settle this table first: Han Yang for `de`, Liying Zhu for `zh-CN`. Changing a word here means changing it everywhere it is used.

`en` is the Source copy (see `CONTEXT.md`). German UI addresses the reader as **`Sie`**, never `du`.

## Domain terms

| `CONTEXT.md` term | `en` UI | `de` | `zh-CN` | Notes |
|---|---|---|---|---|
| Profile | profile | Profil | 个人资料 | |
| Viewer | (not shown in UI) | – | – | Code-only term. |
| Seller | seller | Verkäufer | 卖家 | Not "Anbieter", "Händler", "发布者". |
| Buyer | buyer | Käufer | 买家 | Not "Kunde", "客户". |
| Component | component | Komponente | 组件 | Not "Produkt", "Artikel", "产品", "商品". |
| Tag | tag | Tag | 标签 | Tag values themselves are shown as submitted. |
| Ecosystem | ecosystem | Ökosystem | 生态 | Ecosystem values are shown as submitted. |
| Price | price | Preis | 价格 | Always EUR (ADR 0005). |
| Free (Price of zero) | Free | Kostenlos | 免费 | |
| Entitlement | access | Zugang | 使用权 | UI never says "license"/"Lizenz"/"许可证". |
| Purchase | purchase | Kauf | 购买记录 | Not "Bestellung", "订单". |
| Withdrawal waiver | withdrawal waiver | Verzicht auf das Widerrufsrecht | 放弃撤回权 | Wording in the Buyer's Locale (ADR 0004). |
| Comment | comment | Kommentar | 评论 | |
| Review | review | Bewertung | 评价 | Not "Rezension"; distinct from 评论 (Comment). |
| Seller reply | seller reply | Antwort des Verkäufers | 卖家回复 | |
| Star | star | Stern | 收藏 | A bookmark, so 收藏 rather than 星标. |
| Locale | language | Sprache | 语言 | UI says "language"; "Locale" is the code term. |
| Source copy | (not shown in UI) | – | – | Code and process term. |
| Source text | original | Original | 原文 | As in "Show original". |
| Translation | translation | Übersetzung | 翻译 | |
| Machine-translated | Machine-translated | Maschinell übersetzt | 机器翻译 | Label on a machine Translation. |
| Legal page | legal page | Rechtstext | 法律页面 | |

## Fixed names

| `en` | `de` | `zh-CN` | Notes |
|---|---|---|---|
| AiBlocks | AiBlocks | AiBlocks | Product name, never translated. |
| RheinWeg | RheinWeg | RheinWeg | Company name, never translated. |
| Impressum | Impressum | Impressum | Keeps its German name in every Locale (#61). |
| Terms | AGB | 服务条款 | |
| Privacy | Datenschutz | 隐私政策 | |
| Stripe, Clerk, Claude, MCP | unchanged | unchanged | Third-party and technical names. |
| Sign in / Sign up | Anmelden / Registrieren | 登录 / 注册 | |
| Dashboard | Dashboard | 控制台 | |
