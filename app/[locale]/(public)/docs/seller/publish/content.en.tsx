import { Guide, type GuideStep } from "@/components/guide";
import { screens } from "./screens";

const steps: GuideStep[] = [
  {
    title: "Start the publish flow",
    body: "From the seller dashboard, press the “Publish” button to begin.",
    img: screens[0],
    alt: "The Publish button to start the publish process",
  },
  {
    title: "Fill in the publish form, then press “Publish”",
    body: "Add the name, description, ecosystems, tags, price (0 for free), README, and your component zip (max 10MB). Then submit.",
    img: screens[1],
    alt: "The publish form filled in",
  },
  {
    title: "Your component is created",
    body: "Once submitted, the component is published to the catalog.",
    img: screens[2],
    alt: "Confirmation that the new component is created",
  },
  {
    title: "Review the component detail page",
    body: "The detail page shows the full information for your component — README, metadata, price, and download.",
    img: screens[3],
    alt: "The component detail page",
  },
  {
    title: "Find it on your seller page",
    body: "All of your published components are listed on your seller profile.",
    img: screens[4],
    alt: "The seller page listing published components",
  },
];

export default function PublishGuideContent() {
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
