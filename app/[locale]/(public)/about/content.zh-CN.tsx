import { AssemblyGrid } from "@/components/brand/assembly-grid";

const ECOSYSTEMS = ["claude", "chatgpt", "gemini", "deepseek", "以及更多"];

const PRINCIPLES: [string, string][] = [
  ["开放发布", "任何人都可以发布。平台不做人工筛选，也不设门槛。"],
  ["由社区决定质量", "收藏、下载量和已验证买家的评价，让真正好用的组件浮现出来。"],
  ["上线期间 0% 平台费", "付费下载的款项通过 Stripe Connect 直接进入卖家账户。"],
  ["严格付费墙，诚实定价", "买家先付款再下载付费组件，没有可被钻空子的部分预览。"],
  ["始终是最新版本", "不搞版本泛滥。卖家直接更新自己的组件，更新日志写在 README 里。"],
  ["个人资料，而非店铺", "卖家页面参照 GitHub 设计：简介、数据统计，以及所有已发布组件的网格。"],
];

export default function AboutContent() {
  return (
    <div className="mx-auto max-w-shell px-5">
      {/* Hero — mirrors the homepage's visual language */}
      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-16 lg:py-20">
        <div>
          <p className="eyebrow">AiBlocks</p>
          <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl mt-4 leading-[1.05]">
            可复用 AI 组件的开放市场。
          </h1>
          <p className="mt-5 text-muted max-w-md leading-relaxed">
            AI 开发会产出大量可复用的成果：花一下午才调好的提示词，反复试错才调校好的智能体，
            接入真实 API 的 MCP 服务器，以及沉淀了来之不易的约定的 Hook 和 CLAUDE.md 配置。
            它们大多从未离开诞生时所在的代码仓库。在 AiBlocks，它们可以。
          </p>
        </div>
        <div className="rounded-block border bg-surface p-6">
          <AssemblyGrid />
          <p className="eyebrow mt-5">一次发布，处处复用。</p>
        </div>
      </section>

      {/* What we mean by "component" */}
      <section className="py-12 border-t max-w-2xl">
        <p className="eyebrow">什么是组件</p>
        <h2 className="font-display font-bold text-2xl mt-2">
          任何可复用的构建块，适用于任何 AI 生态。
        </h2>
        <p className="mt-4 text-muted leading-relaxed">
          组件可以是一个场景提示词、一个可复用的技能、一个智能体、一个 Hook、一份 CLAUDE.md
          配置、一个 MCP 服务器，或者是暂时还归不进这些类别的东西。只要它是别人可以直接接入自己
          AI 工作流的构建块，就属于 AiBlocks。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ECOSYSTEMS.map((e) => (
            <span key={e} className="font-mono text-xs rounded-[3px] border px-2 py-1 text-subtle">
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* Two flows: buyer / seller, side by side */}
      <section className="py-12 border-t">
        <p className="eyebrow">如何运作</p>
        <div className="grid sm:grid-cols-2 gap-10 mt-4">
          <div>
            <h3 className="font-display font-semibold text-lg">如果你在开发</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted leading-relaxed list-decimal pl-4">
              <li>注册并连接 Stripe（仅在出售付费组件时需要）。</li>
              <li>上传 zip 文件，撰写 README，并按生态和主题添加标签。</li>
              <li>设定价格，或设为免费。</li>
              <li>直接收款。随着组件改进，随时更新。</li>
            </ol>
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">如果你在寻找</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted leading-relaxed list-decimal pl-4">
              <li>按标签和生态搜索或筛选。</li>
              <li>阅读 README，查看收藏、下载量和评价。</li>
              <li>免费组件即刻下载，其余组件付费获取。</li>
              <li>随时在控制台重新下载。</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Principles — the real decisions behind the platform */}
      <section className="py-12 border-t">
        <p className="eyebrow">AiBlocks 的设计理念</p>
        <h2 className="font-display font-bold text-2xl mt-2">我们有意做出的几个决定</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {PRINCIPLES.map(([h, b]) => (
            <div key={h}>
              <h3 className="font-display font-medium text-base">{h}</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A note on how AiBlocks itself was built */}
      <section className="py-12 border-t max-w-2xl">
        <p className="eyebrow">公开透明地构建</p>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          AiBlocks 在 Claude 的 AI 辅助下构建，而产品决策、审核与责任始终由人主导：愿景、定价模式，
          以及所有以 AiBlocks 之名发布的内容。一个关于 AI 辅助构建的市场，理应坦诚说明自己是如何被构建的。
        </p>
      </section>
    </div>
  );
}
