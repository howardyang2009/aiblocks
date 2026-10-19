import type { Metadata } from "next";
import { Guide, type GuideStep } from "@/components/guide";

export const metadata: Metadata = {
  title: "Publish a component — AiBlocks seller guide",
  description: "Step-by-step: how to publish your AI component on AiBlocks.",
};

const steps: GuideStep[] = [
  {
    title: "Start the publish flow",
    body: "From the seller dashboard, press the “Publish” button to begin.",
    img: "/guides/publish/01.png",
    alt: "The Publish button to start the publish process",
  },
  {
    title: "Fill in the publish form, then press “Publish”",
    body: "Add the name, description, ecosystems, tags, price (0 for free), README, and your component zip (max 10MB). Then submit.",
    img: "/guides/publish/02.png",
    alt: "The publish form filled in",
  },
  {
    title: "Your component is created",
    body: "Once submitted, the component is published to the catalog.",
    img: "/guides/publish/03.png",
    alt: "Confirmation that the new component is created",
  },
  {
    title: "Review the component detail page",
    body: "The detail page shows the full information for your component — README, metadata, price, and download.",
    img: "/guides/publish/04.png",
    alt: "The component detail page",
  },
  {
    title: "Find it on your seller page",
    body: "All of your published components are listed on your seller profile.",
    img: "/guides/publish/05.png",
    alt: "The seller page listing published components",
  },
];

export default function PublishGuidePage() {
  return (
    <Guide
      eyebrow="Seller guide"
      title="Publish a component"
      intro="Publishing takes a couple of minutes. Here is the full flow, from the Publish button to your component appearing on your seller page."
      steps={steps}
      related={{ href: "/docs/seller/stripe", label: "Next, connect Stripe to get paid" }}
    />
  );
}
