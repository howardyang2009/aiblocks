const sections = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "service", label: "2. What AiBlocks Is" },
  { id: "accounts", label: "3. Eligibility & Accounts" },
  { id: "sellers", label: "4. Publishing Components" },
  { id: "buyers", label: "5. Buying & Using Components" },
  { id: "payments", label: "6. Payments, Fees & Stripe Connect" },
  { id: "refunds", label: "7. Refunds & Withdrawal Rights" },
  { id: "no-curation", label: "8. No Curation — Use at Your Own Risk" },
  { id: "reviews", label: "9. Reviews, Stars & Comments" },
  { id: "prohibited", label: "10. Prohibited Uses" },
  { id: "ip", label: "11. Intellectual Property & Copyright Claims" },
  { id: "termination", label: "12. Termination" },
  { id: "disclaimers", label: "13. Disclaimers" },
  { id: "liability", label: "14. Limitation of Liability" },
  { id: "indemnification", label: "15. Indemnification" },
  { id: "changes", label: "16. Changes to These Terms" },
  { id: "law", label: "17. Governing Law & Disputes" },
  { id: "contact", label: "18. Contact" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line pt-8 mt-8 scroll-mt-24">
      <h2 className="font-display font-semibold text-lg">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-muted leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-block border border-line bg-surface px-4 py-3 text-xs text-muted leading-relaxed">
      {children}
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">Terms of Service</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        These Terms govern your use of AiBlocks — a marketplace where sellers
        publish reusable AI components (prompts, skills, agents, MCP servers,
        CLAUDE.md configs, hooks, and similar building blocks) and buyers
        discover, download, and pay for them. By creating an account,
        publishing a component, or purchasing one, you agree to these Terms.
      </p>
      <p className="eyebrow mt-3">Last updated: July 2026</p>

      {/* Table of contents */}
      <nav className="mt-8 border-t border-line pt-6">
        <p className="eyebrow mb-3">On this page</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted hover:text-ink underline underline-offset-2">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="acceptance" title="1. Acceptance of Terms">
        <p>
          AiBlocks ("AiBlocks," "we," "us") is operated by{" "}
          <strong className="text-ink">RheinWeg</strong>. These Terms, together with our{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
            Privacy Policy
          </a>
          , form the agreement between you and AiBlocks. If you don't agree,
          don't use the platform.
        </p>
      </Section>

      <Section id="service" title="2. What AiBlocks Is">
        <p>
          AiBlocks is an open, multi-ecosystem marketplace connecting people
          who build reusable AI components with people who want to use them.
          We host listings, process payments via Stripe Connect, and provide
          discovery tools (search, tags, stars). We are a{" "}
          <strong className="text-ink">facilitator</strong>, not the
          publisher, author, or guarantor of any component listed on the
          platform. Components are created and owned by individual sellers,
          not by AiBlocks.
        </p>
      </Section>

      <Section id="accounts" title="3. Eligibility & Accounts">
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be at least 18, or the age of legal majority in your jurisdiction, to create an account or transact on AiBlocks.</li>
          <li>Authentication is handled by Clerk. You're responsible for keeping your sign-in method secure and for all activity under your account.</li>
          <li>One account per person. Accounts aren't transferable.</li>
          <li>You agree to provide accurate information, including for seller payout setup via Stripe Connect.</li>
        </ul>
      </Section>

      <Section id="sellers" title="4. Publishing Components">
        <p>As a seller, when you publish a component you confirm that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You own it or have the right to distribute it, and it doesn't infringe anyone else's IP.</li>
          <li>It doesn't contain malware, secrets/credentials belonging to others, or anything designed to harm the systems it runs on.</li>
          <li>Its description, ecosystem tags, and README accurately represent what it does.</li>
        </ul>
        <p>
          You retain ownership of your component. Publishing grants AiBlocks a
          non-exclusive, worldwide license to host, display, and distribute it
          through the platform solely to operate the marketplace (list it,
          serve the README, deliver the zip to paying/eligible buyers). This
          license ends if you unpublish the component, except for copies
          already lawfully downloaded by buyers.
        </p>
        <p>
          AiBlocks does not use versioning — updating your listing replaces
          the current version for future downloads. Keep a changelog in your
          README if buyers rely on knowing what changed.
        </p>
      </Section>

      <Section id="buyers" title="5. Buying & Using Components">
        <p>
          Downloading a free component or purchasing a paid one grants you a
          personal, non-exclusive license to use it for your own projects,
          under whatever additional terms (if any) the seller states in the
          README. Unless the seller's listing explicitly says otherwise, you
          may not resell, relicense, or redistribute the component itself as
          a standalone product.
        </p>
        <p>
          Purchased components remain available for re-download from your
          dashboard, tied to your account and that seller's current version.
        </p>
      </Section>

      <Section id="payments" title="6. Payments, Fees & Stripe Connect">
        <ul className="list-disc pl-5 space-y-1">
          <li>All payments are processed by Stripe. AiBlocks does not store card details.</li>
          <li>Paid components use Stripe Connect: funds flow from buyer to seller directly, and AiBlocks takes a <strong className="text-ink">0% platform fee at launch</strong>. We may introduce a platform fee in the future with advance notice to sellers.</li>
          <li>Stripe's own processing fees (currently ~2.9% + fixed fee per transaction) are deducted from the seller's payout, not charged separately by AiBlocks.</li>
          <li>Sellers are independent parties, not employees or agents of AiBlocks, and are solely responsible for their own taxes on income earned through the platform.</li>
          <li>Sellers must complete Stripe Connect onboarding (identity, payout details) before receiving paid downloads' proceeds.</li>
        </ul>
      </Section>

      <Section id="refunds" title="7. Refunds & Withdrawal Rights">
        <p>
          Because components are downloaded instantly, sales are{" "}
          <strong className="text-ink">final and non-refundable by default</strong>,
          except where required by law or where a component is materially
          different from its listing (e.g., non-functional, or not what was
          described) — reach out via Contact below.
        </p>
      </Section>

      <Section id="no-curation" title="8. No Curation — Use at Your Own Risk">
        <p>
          AiBlocks is <strong className="text-ink">open submission</strong>:
          anyone can publish, and nothing is reviewed or vetted by us before
          it goes live. Quality signals (stars, downloads, reviews) are
          community-driven, not a safety guarantee.
        </p>
        <p>
          Many components — MCP servers, hooks, skills, CLAUDE.md
          configurations — are designed to be executed or given access to
          your tools, files, or accounts. Treat every component the way you'd
          treat any third-party code: review it before running it, run
          untrusted components in a sandboxed or limited-permission
          environment, and never grant a component access or credentials you
          aren't prepared to lose. AiBlocks is not responsible for damage,
          data loss, or unauthorized access resulting from running a
          component you downloaded.
        </p>
      </Section>

      <Section id="reviews" title="9. Reviews, Stars & Comments">
        <p>
          Reviews must reflect a genuine, verified purchase and your honest
          opinion. Fake reviews, review manipulation (including sellers
          reviewing their own components), and paid/incentivized reviews
          that aren't disclosed are prohibited. Sellers may reply to reviews
          and comments but may not delete or suppress reviews they simply
          disagree with.
        </p>
      </Section>

      <Section id="prohibited" title="10. Prohibited Uses">
        <p>You may not use AiBlocks to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Publish malware, ransomware, or anything designed to exfiltrate data or harm a system;</li>
          <li>Publish content that infringes copyright, trademark, or other IP rights;</li>
          <li>Publish illegal content, or content that facilitates illegal activity;</li>
          <li>Scrape, mass-download, or reverse-engineer the platform beyond ordinary use;</li>
          <li>Harass, defraud, or impersonate another user or seller;</li>
          <li>Circumvent the paywall or download gating for paid components.</li>
        </ul>
      </Section>

      <Section id="ip" title="11. Intellectual Property & Copyright Claims">
        <p>
          If you believe a component listed on AiBlocks infringes your
          copyright or other IP rights, contact us (Section 18) with a
          description of the work, the infringing listing's URL, and your
          contact details. We'll investigate and remove infringing listings
          consistent with applicable law (e.g., DMCA in the US).
        </p>
      </Section>

      <Section id="termination" title="12. Termination">
        <p>
          You can delete your account at any time. We may suspend or
          terminate accounts, or remove listings, that violate these Terms —
          where possible, we'll tell you why. Purchases already completed
          before termination aren't automatically refunded (see Section 7).
        </p>
      </Section>

      <Section id="disclaimers" title="13. Disclaimers">
        <p>
          AiBlocks and all components are provided{" "}
          <strong className="text-ink">"as is"</strong> and{" "}
          <strong className="text-ink">"as available,"</strong> without
          warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, and
          non-infringement. We don't warrant that components are
          error-free, secure, or compatible with any specific AI ecosystem
          (Claude, GPT, Gemini, Deepseek, or others) beyond what the seller
          states in the listing.
        </p>
      </Section>

      <Section id="liability" title="14. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, AiBlocks is not liable for
          indirect, incidental, or consequential damages, or for any loss
          arising from a component you downloaded or ran, including data
          loss or unauthorized system access. Our total liability for any
          claim relating to the platform is limited to the greater of the
          amount you paid AiBlocks in the 12 months before the claim, or
          [amount — e.g. €100], except where a limitation like this isn't
          permitted by law (including certain mandatory consumer
          protections).
        </p>
      </Section>

      <Section id="indemnification" title="15. Indemnification">
        <p>
          You agree to indemnify AiBlocks against claims arising from your
          content (as a seller), your use of a component (as a buyer), or
          your violation of these Terms.
        </p>
      </Section>

      <Section id="changes" title="16. Changes to These Terms">
        <p>
          We may update these Terms as the platform evolves. Material changes
          (e.g., introducing a platform fee) will be announced with
          reasonable notice. Continuing to use AiBlocks after changes take
          effect means you accept the updated Terms.
        </p>
      </Section>

      <Section id="law" title="17. Governing Law & Disputes">
        <p>
          <strong className="text-ink">
            [Placeholder — Han/legal to confirm.]
          </strong>{" "}
          These Terms are governed by the laws of [jurisdiction — e.g.
          Germany], without regard to conflict-of-law rules, and disputes
          will be resolved in the courts of [venue]. If you're a consumer in
          the EU/EEA or another jurisdiction with mandatory local consumer
          protections, this choice of law doesn't remove protections you're
          otherwise entitled to under your home country's law.
        </p>
      </Section>

      <Section id="contact" title="18. Contact">
        <p>
          Questions about these Terms, copyright claims, or refund requests:{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-ink">
            contact us here
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
