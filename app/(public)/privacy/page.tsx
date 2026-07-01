import { LegalSection as Section, LegalCallout as Callout, LegalToc } from "@/components/legal/legal-page";

const sections = [
  { id: "overview", label: "1. Overview" },
  { id: "data-we-collect", label: "2. Data We Collect" },
  { id: "how-we-use-it", label: "3. How We Use It" },
  { id: "legal-basis", label: "4. Legal Basis for Processing (GDPR)" },
  { id: "sharing", label: "5. Who We Share Data With" },
  { id: "transfers", label: "6. International Data Transfers" },
  { id: "retention", label: "7. Data Retention" },
  { id: "your-rights", label: "8. Your Rights" },
  { id: "cookies", label: "9. Cookies & Tracking" },
  { id: "children", label: "10. Children's Privacy" },
  { id: "security", label: "11. Security" },
  { id: "breach", label: "12. Data Breach Notification" },
  { id: "changes", label: "13. Changes to This Policy" },
  { id: "contact", label: "14. Contact & Controller" },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">Privacy Policy</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        This explains what personal data AiBlocks collects when you use the
        marketplace as a buyer or seller, why we collect it, who we share it
        with, and the rights you have over it — including rights under the
        EU/EEA General Data Protection Regulation (GDPR).
      </p>
      <p className="eyebrow mt-3">Last updated: July 2026</p>

      <LegalToc sections={sections} />

      <Section id="overview" title="1. Overview">
        <p>
          AiBlocks is a marketplace for reusable AI components. Running it
          means handling some personal data — account details, purchase
          records, seller payout information — and this page covers all of
          it. It applies to buyers, sellers, and anyone browsing the public
          site.
        </p>
      </Section>

      <Section id="data-we-collect" title="2. Data We Collect">
        <p><strong className="text-ink">Account data (via Clerk):</strong> email address, name, profile image, and basic profile info from whichever sign-in method you use (Google, Microsoft, Facebook, GitHub, or email/password).</p>
        <p><strong className="text-ink">Seller data:</strong> display name, bio, and links you add to your public seller profile; Stripe Connect onboarding status (identity verification and payout details are collected and held by Stripe directly — AiBlocks does not see or store your bank details).</p>
        <p><strong className="text-ink">Transaction data:</strong> which components you've purchased or published, purchase amounts and timestamps, download history, stars, and any reviews or comments you post.</p>
        <p><strong className="text-ink">Content you upload:</strong> component zip files and markdown READMEs you publish as a seller.</p>
        <p><strong className="text-ink">Technical data:</strong> standard server logs (IP address, timestamps, request metadata) collected automatically by our hosting provider (Vercel) for operating and securing the site.</p>
      </Section>

      <Section id="how-we-use-it" title="3. How We Use It">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and secure your account, and let you sign in</li>
          <li>To process purchases and route seller payouts via Stripe Connect</li>
          <li>To display your public seller profile and published components</li>
          <li>To gate paid downloads to buyers who've actually paid</li>
          <li>To respond to support requests and enforce the Terms of Service</li>
          <li>To meet legal obligations (e.g., tax and financial record-keeping)</li>
        </ul>
        <p>We do not sell your personal data, and we do not use it for advertising.</p>
      </Section>

      <Section id="legal-basis" title="4. Legal Basis for Processing (GDPR)">
        <p>For users in the EU/EEA, we rely on one of these legal bases for each use of data above:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Contract</strong> — processing needed to create your account, complete a purchase, or pay out a seller.</li>
          <li><strong className="text-ink">Legal obligation</strong> — record-keeping required by tax and financial law.</li>
          <li><strong className="text-ink">Legitimate interest</strong> — securing the platform against fraud and abuse, and operating core site functionality.</li>
          <li><strong className="text-ink">Consent</strong> — anything optional we might add later (e.g., marketing emails), which you'd be asked separately to opt into.</li>
        </ul>
      </Section>

      <Section id="sharing" title="5. Who We Share Data With">
        <p>
          We share data with the vendors ("subprocessors") that run the
          platform, only as needed for them to provide their service to us —
          not for their own independent use:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Clerk</strong> — authentication and account management.</li>
          <li><strong className="text-ink">Supabase</strong> — database and file storage (component zips, metadata).</li>
          <li><strong className="text-ink">Stripe</strong> (Stripe Connect) — payment processing, seller identity verification (KYC), and payouts. Stripe holds your payment and banking details directly; we never see full card numbers.</li>
          <li><strong className="text-ink">Vercel</strong> — application hosting and server logs.</li>
        </ul>
        <p>
          Your public seller profile (name, bio, links, published components,
          stats) is visible to anyone who visits AiBlocks — that visibility
          is the point of a public profile, not a data-sharing side effect.
          We don't otherwise share your data with other users beyond what a
          purchase itself reveals (e.g., a seller can see that a sale
          happened, via Stripe).
        </p>
      </Section>

      <Section id="transfers" title="6. International Data Transfers">
        <p>
          Clerk, Supabase, Stripe, and Vercel may process data outside your
          country, including in the United States. Where that applies to
          EU/EEA data, transfers should be covered by each vendor's Standard
          Contractual Clauses (SCCs) or equivalent safeguard — this needs to
          be confirmed against each vendor's current Data Processing
          Agreement (DPA) and listed here specifically, rather than assumed.
        </p>
      </Section>

      <Section id="retention" title="7. Data Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account data is kept while your account is active, and deleted or anonymized within a reasonable period after you delete your account, except where we're legally required to keep it longer.</li>
          <li>Transaction and payment records (purchases, Stripe payment data) are retained for <strong className="text-ink">8 years</strong> under German tax law (GoBD / Abgabenordnung §147), reduced from 10 years by the Bürokratieentlastungsgesetz IV effective for periods starting after December 31, 2024. The period runs from the end of the calendar year the record was created — e.g., a purchase from 2026 is retained through December 31, 2034.</li>
          <li>Annual financial statements and bookkeeping records: 10 years.</li>
          <li>Business correspondence tied to a specific transaction: 6 years.</li>
          <li>A published component's files are retained while it's live on the marketplace, and for a reasonable period after unpublishing to support buyers' re-downloads of what they already purchased.</li>
        </ul>
      </Section>

      <Section id="your-rights" title="8. Your Rights">
        <p>If you're in the EU/EEA (or a jurisdiction with similar protections), you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion ("right to be forgotten"), subject to our legal retention obligations above</li>
          <li>Restrict or object to certain processing</li>
          <li>Receive your data in a portable format</li>
          <li>Withdraw consent at any time, where consent is the basis for processing</li>
          <li>Lodge a complaint with your local data protection supervisory authority</li>
        </ul>
        <p>To exercise any of these, contact us via Section 14.</p>
      </Section>

      <Section id="cookies" title="9. Cookies & Tracking">
        <p>
          AiBlocks currently uses only the essential session cookies set by
          Clerk to keep you signed in — nothing else is required for the
          site to function. We don't currently run analytics or advertising
          trackers. If that changes (e.g., adding product analytics), we'll
          update this policy and, where required, ask for consent first.
        </p>
      </Section>

      <Section id="children" title="10. Children's Privacy">
        <p>
          AiBlocks isn't directed at children, and per our Terms you must be
          at least 18 (or the age of majority where you live) to create an
          account. We don't knowingly collect data from children.
        </p>
      </Section>

      <Section id="security" title="11. Security">
        <p>
          We use reasonable technical and organizational measures to protect
          your data — access controls on our database, encrypted connections,
          and relying on Clerk/Stripe for the most sensitive data (auth
          credentials, payment details) rather than handling it ourselves.
          No system is 100% secure, and we can't guarantee absolute security.
          This section covers <em>your account and platform data</em> — for
          the separate risk of running third-party components you download
          (which is a security topic, not a privacy one), see Terms Section 8.
        </p>
      </Section>

      <Section id="breach" title="12. Data Breach Notification">
        <p>
          If a breach affecting your personal data occurs, we'll notify
          affected users and, where legally required, the relevant
          supervisory authority, within the timeframe required by applicable
          law (for GDPR, generally without undue delay).
        </p>
      </Section>

      <Section id="changes" title="13. Changes to This Policy">
        <p>
          We may update this Privacy Policy as the platform evolves. Material
          changes will be announced with reasonable notice. Continuing to use
          AiBlocks after changes take effect means you accept the updated
          policy.
        </p>
      </Section>

      <Section id="contact" title="14. Contact & Controller">
        <p>
          The data controller for AiBlocks is{" "}
          <strong className="text-ink">RheinWeg</strong>
          . For privacy questions or to exercise the rights in Section 8:{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-ink">
            contact us here
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
