import type { Metadata } from "next";
import { Guide, type GuideStep } from "@/components/guide";

export const metadata: Metadata = {
  title: "发布组件 — AiBlocks 卖家指南",
  description: "分步说明：如何在 AiBlocks 上发布你的 AI 组件。",
};

const steps: GuideStep[] = [
  {
    title: "开始发布流程",
    body: "在卖家控制台点击“发布”按钮即可开始。",
    img: "/guides/publish/01.png",
    alt: "用于开始发布流程的“发布”按钮",
  },
  {
    title: "填写发布表单，然后点击“发布”",
    body: "填写名称、描述、生态、标签、价格（0 表示免费）、README，并上传组件的 zip 文件（最大 10MB），然后提交。",
    img: "/guides/publish/02.png",
    alt: "填写完成的发布表单",
  },
  {
    title: "组件已创建",
    body: "提交后，组件即发布到组件目录中。",
    img: "/guides/publish/03.png",
    alt: "新组件已创建的确认信息",
  },
  {
    title: "查看组件详情页",
    body: "详情页展示组件的全部信息：README、元数据、价格和下载。",
    img: "/guides/publish/04.png",
    alt: "组件详情页",
  },
  {
    title: "在你的卖家页面找到它",
    body: "你发布的所有组件都会列在你的卖家个人资料页上。",
    img: "/guides/publish/05.png",
    alt: "列出已发布组件的卖家页面",
  },
];

export default function PublishGuideContent() {
  return (
    <Guide
      eyebrow="卖家指南"
      title="发布组件"
      intro="发布只需几分钟。以下是完整流程，从点击“发布”按钮到组件出现在你的卖家页面。"
      steps={steps}
      related={{ href: "/docs/seller/stripe", label: "下一步：连接 Stripe 以便收款" }}
    />
  );
}
