import type { Metadata } from "next";
import { Guide, type GuideStep } from "@/components/guide";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Connect Stripe to get paid — AiBlocks seller guide",
  description: "Step-by-step: onboard your Stripe connected account so buyers can pay you directly.",
};

const steps: GuideStep[] = [
  {
    title: "Start Stripe onboarding",
    body: "Signed in, go to your seller Stripe page /dashboard/seller/stripe and click “Connect with Stripe” to begin onboarding your connected account.",
    img: "/guides/stripe/01.png",
    alt: "The Connect with Stripe button on AiBlocks",
  },
  {
    title: "Complete Stripe’s Express onboarding",
    body: "Stripe hosts the rest of the flow. Follow its prompts to set up your account.",
    img: "/guides/stripe/02.png",
    alt: "Stripe Express onboarding start",
  },
  {
    title: "Provide your mobile phone number",
    img: "/guides/stripe/03.png",
    alt: "Entering a mobile phone number",
  },
  {
    title: "Enter the 6-digit code Stripe texts you got on your mobile phone",
    img: "/guides/stripe/04.png",
    alt: "Entering the verification code",
  },
  {
    title: "Tell Stripe about your business",
    img: "/guides/stripe/05.png",
    alt: "Business type selection",
  },
  {
    title: "Provide your personal details",
    img: "/guides/stripe/06.png",
    alt: "Personal details form",
  },
  {
    title: "Add your business details",
    img: "/guides/stripe/07.png",
    alt: "Business details form",
  },
  {
    title: "Add a bank account for payouts",
    body: "This is where your earnings are paid out. Payments from buyers route directly to this account.",
    img: "/guides/stripe/08.png",
    alt: "Adding a payout bank account",
  },
  {
    title: "Review and submit",
    img: "/guides/stripe/09.png",
    alt: "Review and submit screen",
  },
  {
    title: "Done — return to AiBlocks",
    body: "Once Stripe finishes onboarding your account, you’re returned to AiBlocks and can sell paid components.",
    img: "/guides/stripe/10.png",
    alt: "Returned to AiBlocks after onboarding",
  },
];

export default function StripeGuidePage() {
  return (
    <>
      <Guide
        eyebrow="Seller guide"
        title="Connect Stripe to get paid"
        intro="To sell paid components, connect a Stripe account so buyers can pay you directly. AiBlocks takes 0% — Stripe’s standard processing fee applies. Here is the full onboarding flow."
        steps={steps}
        related={{ href: "/docs/seller/publish", label: "See how to publish a component" }}
      />
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <Link
          href="/dashboard/seller/stripe"
          className="inline-flex items-center justify-center rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Go to Stripe onboarding →
        </Link>
      </div>
    </>
  );
}
