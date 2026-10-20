import type { ReactNode } from "react";
import { LegalSection as Section, LegalToc } from "@/components/legal/legal-page";
import { Link } from "@/i18n/navigation";

export const lastUpdated = "2026-10-20";

const sections = [
  { id: "overview", label: "1. 概述" },
  { id: "data-we-collect", label: "2. 我们收集的数据" },
  { id: "how-we-use-it", label: "3. 我们如何使用数据" },
  { id: "legal-basis", label: "4. 处理的法律依据（GDPR）" },
  { id: "sharing", label: "5. 我们与谁共享数据" },
  { id: "transfers", label: "6. 跨境数据传输" },
  { id: "retention", label: "7. 数据保存期限" },
  { id: "your-rights", label: "8. 你的权利" },
  { id: "cookies", label: "9. Cookie 与跟踪" },
  { id: "children", label: "10. 儿童隐私" },
  { id: "security", label: "11. 安全" },
  { id: "breach", label: "12. 数据泄露通知" },
  { id: "changes", label: "13. 本政策的变更" },
  { id: "contact", label: "14. 联系方式与控制者" },
];

export default function PrivacyContent({ notices }: { notices: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">隐私政策</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        本政策说明你作为买家或卖家使用市场时 AiBlocks 收集哪些个人数据、为什么收集、
        与谁共享，以及你对这些数据享有的权利，包括欧盟《通用数据保护条例》（GDPR）赋予你的权利。
      </p>
      {notices}

      <LegalToc sections={sections} />

      <Section id="overview" title="1. 概述">
        <p>
          AiBlocks 是一个可复用 AI 组件的市场。运营它需要处理一些个人数据：账户信息、
          购买记录、卖家收款信息。本页涵盖所有这些数据，适用于买家、卖家以及浏览公开网站的任何人。
        </p>
      </Section>

      <Section id="data-we-collect" title="2. 我们收集的数据">
        <p><strong className="text-ink">账户数据（通过 Clerk）：</strong>邮箱地址、姓名、头像，以及你所用登录方式（Google、Microsoft、Facebook、GitHub 或邮箱加密码）提供的基本个人资料。</p>
        <p><strong className="text-ink">卖家数据：</strong>你在公开卖家个人资料中添加的显示名称、简介和链接；Stripe Connect 接入状态（身份验证和收款信息由 Stripe 直接收集和保存，AiBlocks 看不到也不存储你的银行信息）。</p>
        <p><strong className="text-ink">交易数据：</strong>你购买或发布了哪些组件、购买金额和时间、下载记录、收藏，以及你发布的评价和评论。</p>
        <p><strong className="text-ink">你上传的内容：</strong>你作为卖家发布的组件 zip 文件和 Markdown README。</p>
        <p><strong className="text-ink">技术数据：</strong>我们的托管服务商（Vercel）为运行和保护网站而自动收集的标准服务器日志（IP 地址、时间戳、请求元数据）。</p>
      </Section>

      <Section id="how-we-use-it" title="3. 我们如何使用数据">
        <ul className="list-disc pl-5 space-y-1">
          <li>创建并保护你的账户，让你能够登录</li>
          <li>通过 Stripe Connect 处理购买并向卖家转款</li>
          <li>将组件的描述和 README 机器翻译为本网站的其他语言</li>
          <li>展示你的公开卖家个人资料和已发布组件</li>
          <li>仅向已付款的买家开放付费下载</li>
          <li>回复支持请求并执行服务条款</li>
          <li>履行法律义务（例如税务和财务记录的保存）</li>
        </ul>
        <p>我们不出售你的个人数据，也不将其用于广告。</p>
      </Section>

      <Section id="legal-basis" title="4. 处理的法律依据（GDPR）">
        <p>对于欧盟/欧洲经济区的用户，上述每项数据使用都基于以下法律依据之一：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">合同</strong>（GDPR 第 6 条第 1 款 b 项）：为创建账户、完成购买或向卖家付款所必需的处理。</li>
          <li><strong className="text-ink">法律义务</strong>（GDPR 第 6 条第 1 款 c 项）：税法和财务法规要求的记录保存。</li>
          <li><strong className="text-ink">正当利益</strong>（GDPR 第 6 条第 1 款 f 项）：保护平台免受欺诈和滥用，以及运行网站的核心功能。</li>
          <li><strong className="text-ink">同意</strong>（GDPR 第 6 条第 1 款 a 项）：我们以后可能增加的任何可选功能（例如营销邮件），届时会另行征求你的同意。</li>
        </ul>
      </Section>

      <Section id="sharing" title="5. 我们与谁共享数据">
        <p>
          我们仅在运营平台的服务商（“数据处理者”）为我们提供服务所必需的范围内与其共享数据，
          不供其自行使用：
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Clerk</strong>：身份验证和账户管理。</li>
          <li><strong className="text-ink">Supabase</strong>：数据库和文件存储（组件 zip 文件、元数据）。</li>
          <li><strong className="text-ink">Stripe</strong>（Stripe Connect）：支付处理、卖家身份验证（KYC）和转款。Stripe 直接保存你的支付和银行信息，我们从不会看到完整的银行卡号。</li>
          <li><strong className="text-ink">Vercel</strong>：应用托管和服务器日志。</li>
          <li><strong className="text-ink">Anthropic</strong>（Claude）：将卖家提交的组件文本（描述和 README）机器翻译为本网站的其他语言。</li>
        </ul>
        <p>
          你的公开卖家个人资料（姓名、简介、链接、已发布组件、数据统计）对所有访问 AiBlocks
          的人可见。这种可见性正是公开个人资料的用途，而不是数据共享的副作用。
          除购买本身所揭示的信息外（例如卖家可通过 Stripe 看到发生了一笔销售），
          我们不会以其他方式与其他用户共享你的数据。
        </p>
      </Section>

      <Section id="transfers" title="6. 跨境数据传输">
        <p>
          Clerk、Supabase、Stripe、Vercel 和 Anthropic 可能在你所在国家以外（包括美国）处理数据。
          如果涉及欧盟/欧洲经济区的数据，这些传输应受各服务商的标准合同条款（SCC）或同等保障措施保护。
          这需要对照各服务商当前的数据处理协议（DPA）加以确认，并在此具体列出，而不是想当然地假定。
        </p>
      </Section>

      <Section id="retention" title="7. 数据保存期限">
        <ul className="list-disc pl-5 space-y-1">
          <li>账户数据在你的账户存续期间保存，并在你删除账户后的合理期限内删除或匿名化，法律要求我们保存更久的除外。</li>
          <li>交易和支付记录（购买记录、Stripe 支付数据）依照德国税法（GoBD、《税收通则》第 147 条）保存 <strong className="text-ink">8 年</strong>；《减轻官僚负担法 IV》将 2024 年 12 月 31 日之后开始的期间的保存期由 10 年缩短为 8 年。期限自记录产生当年的年末起算，例如 2026 年的购买记录保存至 2034 年 12 月 31 日。</li>
          <li>年度财务报表和账簿记录：10 年。</li>
          <li>与具体交易相关的商业往来信函：6 年。</li>
          <li>已发布组件的文件在其上架期间保存，并在下架后保存一段合理期限，以便买家重新下载已购买的内容。</li>
        </ul>
      </Section>

      <Section id="your-rights" title="8. 你的权利">
        <p>如果你在欧盟/欧洲经济区（或具有类似保护的法域），你有权：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>访问我们持有的关于你的个人数据</li>
          <li>更正不准确的数据</li>
          <li>要求删除（“被遗忘权”），但受上述法定保存义务的限制</li>
          <li>限制或反对某些处理</li>
          <li>以可携带的格式获取你的数据</li>
          <li>在处理以同意为依据时，随时撤回同意</li>
          <li>向你所在地的数据保护监管机构投诉</li>
        </ul>
        <p>如需行使上述任何权利，请通过第 14 条与我们联系。</p>
      </Section>

      <Section id="cookies" title="9. Cookie 与跟踪">
        <p>AiBlocks 目前只使用网站运行所必需的 Cookie：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Clerk 会话 Cookie</strong>：保持你的登录状态。</li>
          <li><strong className="text-ink"><code>RHEINWEG_LOCALE</code></strong>：记住你上次浏览网站时使用的语言，以便下次访问首页时以该语言打开。该 Cookie 与 rheinwegde.de 及其子域名共用，使两个网站以同一语言打开。它只包含语言代码。保存一年。</li>
        </ul>
        <p>
          我们目前不使用任何分析或广告跟踪工具。如果情况发生变化（例如加入产品分析），
          我们会更新本政策，并在法律要求时事先征得你的同意。
        </p>
      </Section>

      <Section id="children" title="10. 儿童隐私">
        <p>
          AiBlocks 不面向儿童。根据我们的服务条款，你必须年满 18 周岁（或达到你所在地的成年年龄）
          才能创建账户。我们不会在知情的情况下收集儿童的数据。
        </p>
      </Section>

      <Section id="security" title="11. 安全">
        <p>
          我们采取合理的技术和组织措施保护你的数据：对数据库实施访问控制、使用加密连接，
          并将最敏感的数据（登录凭据、支付信息）交由 Clerk 和 Stripe 处理，而不是自行处理。
          没有任何系统是 100% 安全的，我们无法保证绝对安全。本节涉及的是
          <em>你的账户和平台数据</em>；关于运行你下载的第三方组件的另一类风险
          （这是安全问题而非隐私问题），请参阅服务条款第 8 条。
        </p>
      </Section>

      <Section id="breach" title="12. 数据泄露通知">
        <p>
          如果发生影响你个人数据的泄露事件，我们将在适用法律规定的时限内
          （GDPR 下通常为不得无故拖延）通知受影响的用户，并在法律要求时通知相关监管机构。
        </p>
      </Section>

      <Section id="changes" title="13. 本政策的变更">
        <p>
          随着平台发展，我们可能会更新本隐私政策。重大变更将提前合理时间公告。
          变更生效后继续使用 AiBlocks，即表示你接受更新后的政策。
        </p>
      </Section>

      <Section id="contact" title="14. 联系方式与控制者">
        <p>
          AiBlocks 的数据控制者为 <strong className="text-ink">RheinWeg</strong>。
          如有隐私问题或需行使第 8 条所列权利：
          <Link href="/contact" className="underline underline-offset-2 hover:text-ink">
            点击此处联系我们
          </Link>
          。
        </p>
      </Section>
    </div>
  );
}
