import { Guide, type GuideStep } from "@/components/guide";
import { screenshots } from "./screenshots";
import { Link } from "@/i18n/navigation";

const steps: GuideStep[] = [
  {
    title: "Start Stripe onboarding",
    body: "Signed in, go to your seller Stripe page /dashboard/seller/stripe and click “Connect with Stripe” to begin onboarding your connected account.",
    img: screenshots[0],
    alt: "The Connect with Stripe button on AiBlocks",
  },
  {
    title: "Complete Stripe’s Express onboarding",
    body: "Stripe hosts the rest of the flow. Follow its prompts to set up your account.",
    img: screenshots[1],
    alt: "Stripe Express onboarding start",
  },
  {
    title: "Provide your mobile phone number",
    img: screenshots[2],
    alt: "Entering a mobile phone number",
  },
  {
    title: "Enter the 6-digit code Stripe texts to your mobile phone",
    img: screenshots[3],
    alt: "Entering the verification code",
  },
  {
    title: "Tell Stripe about your business",
    img: screenshots[4],
    alt: "Business type selection",
  },
  {
    title: "Provide your personal details",
    img: screenshots[5],
    alt: "Personal details form",
  },
  {
    title: "Add your business details",
    img: screenshots[6],
    alt: "Business details form",
  },
  {
    title: "Add a bank account for payouts",
    body: "This is where your earnings are paid out. Payments from buyers route directly to this account.",
    img: screenshots[7],
    alt: "Adding a payout bank account",
  },
  {
    title: "Review and submit",
    img: screenshots[8],
    alt: "Review and submit screen",
  },
  {
    title: "Done — return to AiBlocks",
    body: "Once Stripe finishes onboarding your account, you’re returned to AiBlocks and can sell paid components.",
    img: screenshots[9],
    alt: "Returned to AiBlocks after onboarding",
  },
];

export default function StripeGuideContent() {
  return (
    <>
      <Guide
        eyebrow="Seller guide"
        title="Connect Stripe to get paid"
        intro="To sell paid components, connect a Stripe account so buyers can pay you directly. AiBlocks takes 0% — Stripe’s standard processing fee applies. Here is the full onboarding flow. Once your account is onboarded, Stripe pays your earnings out to your bank account every Monday."
        steps={steps}
        related={{ href: "/docs/seller/publish", label: "See how to publish a component" }}
      />
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <Link
          href="/dashboard/seller/stripe"
          className="inline-flex items-center justify-center rounded-block bg-accent text-accent-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors"
        >
          Go to Stripe onboarding →
        </Link>
      </div>
    </>
  );
}
