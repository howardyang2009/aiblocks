import type { ReactNode } from "react";
import type { Metadata } from "next";
import { LegalSection as Section, LegalToc } from "@/components/legal/legal-page";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "服务条款 — AiBlocks",
  description: "在 AiBlocks 上购买和出售组件的条款。",
};

export const lastUpdated = "2026-10-19";

const sections = [
  { id: "acceptance", label: "1. 条款的接受" },
  { id: "service", label: "2. AiBlocks 是什么" },
  { id: "accounts", label: "3. 资格与账户" },
  { id: "sellers", label: "4. 发布组件" },
  { id: "buyers", label: "5. 购买与使用组件" },
  { id: "payments", label: "6. 付款、费用与 Stripe Connect" },
  { id: "refunds", label: "7. 退款与撤回权" },
  { id: "no-curation", label: "8. 不做审核：使用风险自负" },
  { id: "reviews", label: "9. 评价、收藏与评论" },
  { id: "prohibited", label: "10. 禁止的用途" },
  { id: "ip", label: "11. 知识产权与版权投诉" },
  { id: "termination", label: "12. 终止" },
  { id: "disclaimers", label: "13. 免责声明" },
  { id: "liability", label: "14. 责任限制" },
  { id: "indemnification", label: "15. 赔偿" },
  { id: "changes", label: "16. 条款的变更" },
  { id: "law", label: "17. 适用法律、合同语言与争议" },
  { id: "contact", label: "18. 联系我们" },
];

export default function TermsContent({ notices }: { notices: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">服务条款</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        本条款约束你对 AiBlocks 的使用。AiBlocks 是一个市场：卖家在这里发布可复用的 AI
        组件（提示词、技能、智能体、MCP 服务器、CLAUDE.md 配置、Hook 及类似构建块），
        买家在这里发现、下载并付费获取它们。创建账户、发布组件或购买组件，即表示你同意本条款。
      </p>
      {notices}

      <LegalToc sections={sections} />

      <Section id="acceptance" title="1. 条款的接受">
        <p>
          AiBlocks（“AiBlocks”“我们”）由 <strong className="text-ink">RheinWeg</strong> 运营。
          本条款与我们的
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
            隐私政策
          </Link>
          共同构成你与 AiBlocks 之间的协议。如果你不同意，请不要使用本平台。
        </p>
      </Section>

      <Section id="service" title="2. AiBlocks 是什么">
        <p>
          AiBlocks 是一个开放的、跨生态的市场，连接构建可复用 AI 组件的人和想要使用它们的人。
          我们托管组件信息，通过 Stripe Connect 处理付款，并提供发现工具（搜索、标签、收藏）。
          我们是<strong className="text-ink">中间方</strong>，而不是平台上任何组件的发布者、
          作者或担保人。组件由各个卖家创建并归其所有，而非归 AiBlocks 所有。
        </p>
      </Section>

      <Section id="accounts" title="3. 资格与账户">
        <ul className="list-disc pl-5 space-y-1">
          <li>你必须年满 18 周岁，或已达到你所在法域的法定成年年龄，才能在 AiBlocks 上创建账户或进行交易。</li>
          <li>身份验证由 Clerk 提供。你有责任保护好自己的登录方式，并对账户下的所有活动负责。</li>
          <li>每人仅限一个账户。账户不得转让。</li>
          <li>你同意提供准确的信息，包括通过 Stripe Connect 设置卖家收款时的信息。</li>
        </ul>
      </Section>

      <Section id="sellers" title="4. 发布组件">
        <p>作为卖家，你在发布组件时确认：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>你拥有该组件或有权分发它，且它不侵犯他人的知识产权；</li>
          <li>它不含恶意软件、不含属于他人的密钥或凭据，也不含任何旨在损害其运行系统的内容；</li>
          <li>它的描述、生态标签和 README 如实反映了它的功能。</li>
        </ul>
        <p>
          组件的所有权仍归你所有。发布即授予 AiBlocks 一项非独占的、全球范围的许可，
          仅为运营市场之目的（展示组件信息、提供 README、向已付款或有资格的买家交付 zip 文件）
          通过平台托管、展示和分发该组件。如果你撤下该组件，此许可即终止，
          但买家已合法下载的副本除外。
        </p>
        <p>
          AiBlocks 不做版本管理：更新组件会替换之后所有下载所用的当前版本。
          如果买家需要了解改动内容，请在 README 中维护更新日志。
        </p>
      </Section>

      <Section id="buyers" title="5. 购买与使用组件">
        <p>
          下载免费组件或购买付费组件后，你获得在自己的项目中使用它的个人、非独占的使用权，
          并须遵守卖家在 README 中声明的附加条款（如有）。除非卖家的组件信息另有明确说明，
          你不得将组件本身作为独立产品转售、再授权或再分发。
        </p>
        <p>
          已购买的组件可随时从你的控制台重新下载，与你的账户及卖家的当前版本绑定。
        </p>
      </Section>

      <Section id="payments" title="6. 付款、费用与 Stripe Connect">
        <ul className="list-disc pl-5 space-y-1">
          <li>所有付款均由 Stripe 处理。AiBlocks 不存储银行卡信息。</li>
          <li>付费组件使用 Stripe Connect：款项直接从买家流向卖家，<strong className="text-ink">上线期间 AiBlocks 收取 0% 平台费</strong>。我们将来可能会引入平台费，并会提前通知卖家。</li>
          <li>Stripe 自身的手续费（目前约为每笔交易 2.9% 加固定费用）从卖家的收款中扣除，AiBlocks 不另行收取。</li>
          <li>卖家是独立的一方，不是 AiBlocks 的员工或代理人，并自行负责通过平台所得收入的税务。</li>
          <li>卖家必须先完成 Stripe Connect 接入（身份、收款信息），才能收到付费下载的款项。</li>
        </ul>
      </Section>

      <Section id="refunds" title="7. 退款与撤回权">
        <p>
          如果你是欧盟/欧洲经济区的消费者，对于数字内容合同，你通常享有自合同订立之日起
          <strong className="text-ink"> 14 天的撤回权</strong>。
        </p>
        <p>
          对于付费组件，如果你在付款前明确同意在撤回期届满前开始履行合同，
          并确认你知道因此将丧失撤回权，则该权利在下载开始时消灭（§ 356 Abs. 5 BGB）。
          AiBlocks 在结账时征求这一同意和确认；未经同意和确认，付费下载无法开始。
          免费组件不涉及付款，因此不产生撤回权。
        </p>
        <p>
          如果组件与其描述存在实质性差异（例如无法使用，或与描述不符），你的法定权利不受影响。
          请通过下方的联系方式与我们联系。
        </p>
      </Section>

      <Section id="no-curation" title="8. 不做审核：使用风险自负">
        <p>
          AiBlocks 是<strong className="text-ink">开放发布</strong>的：任何人都可以发布，
          内容上线前我们不做任何审查。质量信号（收藏、下载量、评价）来自社区，并非安全保证。
        </p>
        <p>
          许多组件，例如 MCP 服务器、Hook、技能和 CLAUDE.md 配置，本身就是被设计为可执行的，
          或需要访问你的工具、文件或账户。请像对待任何第三方代码一样对待每个组件：
          运行前先审查；在沙箱或受限权限环境中运行不受信任的组件；
          绝不向组件提供你承受不起损失的访问权限或凭据。
          对于因运行你下载的组件而导致的损害、数据丢失或未经授权的访问，AiBlocks 不承担责任。
        </p>
      </Section>

      <Section id="reviews" title="9. 评价、收藏与评论">
        <p>
          评价必须基于真实、经过验证的购买，并反映你的真实看法。禁止虚假评价、操纵评价
          （包括卖家评价自己的组件）以及未披露的付费或有偿评价。卖家可以回复评价和评论，
          但不得仅因意见不同而删除或压制评价。
        </p>
      </Section>

      <Section id="prohibited" title="10. 禁止的用途">
        <p>你不得利用 AiBlocks：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>发布恶意软件、勒索软件，或任何旨在窃取数据或损害系统的内容；</li>
          <li>发布侵犯版权、商标或其他知识产权的内容；</li>
          <li>发布违法内容，或为违法活动提供便利的内容；</li>
          <li>超出正常使用范围地抓取、批量下载平台内容或对平台进行逆向工程；</li>
          <li>骚扰、欺诈或冒充其他用户或卖家；</li>
          <li>绕过付费组件的付费墙或下载限制。</li>
        </ul>
      </Section>

      <Section id="ip" title="11. 知识产权与版权投诉">
        <p>
          如果你认为 AiBlocks 上的某个组件侵犯了你的版权或其他知识产权，请联系我们（第 18 条），
          并提供作品说明、侵权组件页面的 URL 以及你的联系方式。我们将进行调查，
          并依照适用法律（例如美国的 DMCA）删除侵权组件。
        </p>
      </Section>

      <Section id="termination" title="12. 终止">
        <p>
          你可以随时删除自己的账户。对于违反本条款的账户，我们可以暂停或终止，
          或删除相关组件；在可能的情况下，我们会告知原因。终止前已完成的购买不会自动退款（见第 7 条）。
        </p>
      </Section>

      <Section id="disclaimers" title="13. 免责声明">
        <p>
          AiBlocks 及所有组件均按<strong className="text-ink">“现状”</strong>和
          <strong className="text-ink">“现有”</strong>提供，不附带任何明示或默示的保证，
          包括适销性、特定用途适用性及不侵权的保证。除卖家在组件信息中声明的内容外，
          我们不保证组件没有错误、安全可靠，或与任何特定 AI 生态（Claude、GPT、Gemini、
          Deepseek 或其他）兼容。
        </p>
      </Section>

      <Section id="liability" title="14. 责任限制">
        <p>
          在法律允许的最大范围内，AiBlocks 不对间接、附带或后果性损害承担责任，
          也不对你下载或运行的组件所造成的任何损失（包括数据丢失或未经授权的系统访问）承担责任。
          对于与平台有关的任何索赔，我们的总责任以下列两者中较高者为限：索赔前 12 个月内你向
          AiBlocks 支付的金额，或 [金额，例如 100 欧元]；法律不允许此类限制的情形除外
          （包括某些强制性的消费者保护规定）。
        </p>
      </Section>

      <Section id="indemnification" title="15. 赔偿">
        <p>
          对于因你的内容（作为卖家）、你对组件的使用（作为买家）或你违反本条款而引起的索赔，
          你同意使 AiBlocks 免受损害。
        </p>
      </Section>

      <Section id="changes" title="16. 条款的变更">
        <p>
          随着平台发展，我们可能会更新本条款。重大变更（例如引入平台费）将提前合理时间公告。
          变更生效后继续使用 AiBlocks，即表示你接受更新后的条款。
        </p>
      </Section>

      <Section id="law" title="17. 适用法律、合同语言与争议">
        <p>
          本条款适用德国法律，不适用冲突法规则；争议由德国法院管辖。
          如果你是欧盟/欧洲经济区或其他具有强制性本地消费者保护规定的法域的消费者，
          此法律选择不会剥夺你依照本国法律原本享有的保护。
        </p>
        <p>
          合同语言为<strong className="text-ink">德语</strong>。本条款另提供英文版和简体中文版，
          仅作为便于理解的译文；只有德语版本具有约束力，各版本不一致时以德语版本为准。
        </p>
      </Section>

      <Section id="contact" title="18. 联系我们">
        <p>
          有关本条款的问题、版权投诉或退款请求：
          <Link href="/contact" className="underline underline-offset-2 hover:text-ink">
            点击此处联系我们
          </Link>
          。
        </p>
      </Section>
    </div>
  );
}
