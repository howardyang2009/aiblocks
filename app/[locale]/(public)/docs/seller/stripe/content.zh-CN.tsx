import type { Metadata } from "next";
import { Guide, type GuideStep } from "@/components/guide";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "连接 Stripe 以便收款 — AiBlocks 卖家指南",
  description: "分步说明：接入你的 Stripe 关联账户，让买家可以直接向你付款。",
};

const steps: GuideStep[] = [
  {
    title: "开始 Stripe 接入流程",
    body: "登录后，前往你的卖家 Stripe 页面 /dashboard/seller/stripe，点击“连接 Stripe”，开始接入你的关联账户。",
    img: "/guides/stripe/01.png",
    alt: "AiBlocks 上的“连接 Stripe”按钮",
  },
  {
    title: "完成 Stripe Express 接入流程",
    body: "其余流程由 Stripe 托管。按照提示设置你的账户。",
    img: "/guides/stripe/02.png",
    alt: "Stripe Express 接入流程的起始页",
  },
  {
    title: "填写你的手机号码",
    img: "/guides/stripe/03.png",
    alt: "输入手机号码",
  },
  {
    title: "输入 Stripe 发送到你手机上的 6 位验证码",
    img: "/guides/stripe/04.png",
    alt: "输入验证码",
  },
  {
    title: "告诉 Stripe 你的业务类型",
    img: "/guides/stripe/05.png",
    alt: "选择业务类型",
  },
  {
    title: "填写你的个人信息",
    img: "/guides/stripe/06.png",
    alt: "个人信息表单",
  },
  {
    title: "填写你的业务信息",
    img: "/guides/stripe/07.png",
    alt: "业务信息表单",
  },
  {
    title: "添加用于提现的银行账户",
    body: "你的收入会提现到这个账户。买家的付款会直接进入这个账户。",
    img: "/guides/stripe/08.png",
    alt: "添加提现银行账户",
  },
  {
    title: "检查并提交",
    img: "/guides/stripe/09.png",
    alt: "检查并提交页面",
  },
  {
    title: "完成，返回 AiBlocks",
    body: "Stripe 完成账户接入后，你会回到 AiBlocks，即可出售付费组件。",
    img: "/guides/stripe/10.png",
    alt: "接入完成后返回 AiBlocks",
  },
];

export default function StripeGuideContent() {
  return (
    <>
      <Guide
        eyebrow="卖家指南"
        title="连接 Stripe 以便收款"
        intro="要出售付费组件，请连接一个 Stripe 账户，让买家可以直接向你付款。AiBlocks 抽成 0%，仅收取 Stripe 的标准手续费。以下是完整的接入流程。账户接入后，Stripe 会在每周一把你的收入转入你的银行账户。"
        steps={steps}
        related={{ href: "/docs/seller/publish", label: "了解如何发布组件" }}
      />
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <Link
          href="/dashboard/seller/stripe"
          className="inline-flex items-center justify-center rounded-block bg-accent text-accent-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors"
        >
          前往接入 Stripe →
        </Link>
      </div>
    </>
  );
}
