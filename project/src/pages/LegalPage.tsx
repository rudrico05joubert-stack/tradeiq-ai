import { Footer, PublicHeader } from '../components/PublicHeader';

type LegalPageName = 'terms' | 'privacy' | 'refunds' | 'risk';
type Section = { heading: string; paragraphs?: string[]; bullets?: string[] };

const UPDATED = '3 August 2026';
const SUPPORT_EMAIL = 'support@nexoracharts.com';

const pages: Record<LegalPageName, { eyebrow: string; title: string; intro: string; sections: Section[] }> = {
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    intro: 'These terms govern access to NEXORA AI and form an agreement between you and NEXORA AI, a South African digital-services business.',
    sections: [
      { heading: '1. Eligibility and acceptance', paragraphs: ['You must be at least 18 years old and legally able to enter into this agreement. By creating an account, using the service, or purchasing a plan, you accept these terms and the linked Privacy, Refund and Risk policies.'] },
      { heading: '2. What NEXORA provides', paragraphs: ['NEXORA provides software-generated educational chart analysis, risk indicators, journaling features and related tools. Outputs may be incomplete, delayed or incorrect and are not personalised financial, investment, tax or legal advice.'] },
      { heading: '3. Accounts and acceptable use', bullets: ['Keep your login details secure and report suspected unauthorised access promptly.', 'Do not misuse, disrupt, reverse engineer, scrape or bypass limits or security controls.', 'Do not upload unlawful material or content that you do not have the right to use.', 'You remain responsible for every trading and financial decision you make.'] },
      { heading: '4. Plans, billing and cancellation', paragraphs: ['Paid plans renew monthly through Paystack at the price shown at checkout. You authorise recurring charges until cancellation. You may cancel before the next billing date from Settings using Manage subscription, or by contacting support if self-service is unavailable. Cancellation stops future renewals and access continues until the end of the paid period unless applicable law requires otherwise.'] },
      { heading: '5. Availability and changes', paragraphs: ['We aim to keep NEXORA available but do not promise uninterrupted service. We may maintain, improve, suspend or discontinue features where reasonably necessary. Material changes to pricing or these terms will be communicated before they take effect where required.'] },
      { heading: '6. Intellectual property', paragraphs: ['NEXORA and its software, design and branding belong to NEXORA AI or its licensors. You retain rights in charts and information you upload and grant us a limited right to process them only to provide, secure and improve the service.'] },
      { heading: '7. Liability', paragraphs: ['To the fullest extent permitted by law, NEXORA is provided without guarantees of profit, accuracy or fitness for a particular trading purpose. We are not responsible for trading losses, lost profits or decisions based on generated outputs. Nothing in these terms excludes rights or liability that cannot lawfully be excluded under South African law.'] },
      { heading: '8. Suspension and termination', paragraphs: ['We may restrict or close an account for material breach, fraud, abuse, security risk or legal requirements. You may stop using NEXORA at any time. Clauses that by nature should survive termination will continue to apply.'] },
      { heading: '9. Governing law and contact', paragraphs: [`South African law governs these terms. Contact ${SUPPORT_EMAIL} first so we can try to resolve a concern fairly and promptly.`] },
    ],
  },
  privacy: {
    eyebrow: 'Your information',
    title: 'Privacy Policy',
    intro: 'This notice explains how NEXORA AI collects and uses personal information in line with South Africa’s Protection of Personal Information Act (POPIA).',
    sections: [
      { heading: '1. Information we collect', bullets: ['Account details such as your name, email address and authentication identifiers.', 'Charts, symbols, notes, journal entries and analysis history that you choose to provide.', 'Plan, transaction reference and payment status. Paystack processes card and bank details; NEXORA does not store full card details.', 'Technical and security information such as device, browser, IP address and service logs.'] },
      { heading: '2. Why we process it', bullets: ['Create and secure your account.', 'Provide chart analysis, saved history, journal and paid features.', 'Verify payments, manage subscriptions and prevent fraud.', 'Operate, troubleshoot and improve NEXORA.', 'Meet legal obligations and respond to valid requests.'] },
      { heading: '3. Lawful processing and sharing', paragraphs: ['We process information where needed to perform our agreement with you, comply with law, protect legitimate business and security interests, or where you consent. We share only what is reasonably necessary with service providers such as Supabase, Vercel, OpenAI and Paystack, or with authorities when legally required.'] },
      { heading: '4. International processing', paragraphs: ['Some providers may process information outside South Africa. We use reputable providers and reasonable contractual and technical safeguards appropriate to the information and service.'] },
      { heading: '5. Retention and security', paragraphs: ['We retain information only for as long as needed for the purposes above, legal obligations, disputes and security. We use access controls, encrypted connections and restricted server credentials, but no online service can guarantee absolute security.'] },
      { heading: '6. Your choices and rights', bullets: ['Ask whether we hold personal information about you.', 'Request access to, correction of or deletion of eligible information.', 'Object to or restrict certain processing where the law allows.', 'Withdraw consent for optional processing.', 'Complain to South Africa’s Information Regulator if a privacy concern is not resolved.'] },
      { heading: '7. Cookies and authentication', paragraphs: ['NEXORA uses essential browser storage and authentication technologies to keep you signed in and protect your session. We do not currently use advertising cookies.'] },
      { heading: '8. Contact', paragraphs: [`Send privacy or account-data requests to ${SUPPORT_EMAIL}. We may need to verify your identity before acting on a request.`] },
    ],
  },
  refunds: {
    eyebrow: 'Billing',
    title: 'Cancellation & Refund Policy',
    intro: 'We want subscription billing to be clear, predictable and fair.',
    sections: [
      { heading: '1. Monthly subscriptions', paragraphs: ['Pro and Elite plans renew monthly through Paystack until cancelled. Prices and the billing interval are shown before payment.'] },
      { heading: '2. Cancelling', paragraphs: [`To stop the next renewal, open Settings and select Manage subscription, or email ${SUPPORT_EMAIL} from your account email if self-service is unavailable. Cancel before the next billing date. Your paid access normally continues until the end of the current billing period.`] },
      { heading: '3. Refund requests', paragraphs: ['If you were charged incorrectly, charged more than once, could not access paid features because of a verified NEXORA fault, or believe a legal cooling-off or consumer right applies, contact us within 7 days of the charge. Include the Paystack reference and a short explanation.'] },
      { heading: '4. How requests are handled', paragraphs: ['We review requests fairly and may ask for information needed to verify the transaction. Approved refunds are returned through the original payment method. Bank and payment-network processing times are outside our control.'] },
      { heading: '5. Non-refundable situations', paragraphs: ['Subject to rights that cannot be excluded by law, we generally do not refund a used billing period because of trading outcomes, changing your mind after substantial use, failure to cancel before renewal, or dissatisfaction with an educational analysis result.'] },
      { heading: '6. Chargebacks', paragraphs: ['Please contact us before starting a payment dispute so we can investigate quickly. This does not limit your right to approach your bank, Paystack or a consumer authority.'] },
    ],
  },
  risk: {
    eyebrow: 'Important',
    title: 'Trading Risk Disclosure',
    intro: 'Trading is risky. NEXORA is an educational software tool—not a broker, financial adviser, signal provider or asset manager.',
    sections: [
      { heading: '1. No financial advice', paragraphs: ['NEXORA outputs are generated from uploaded chart images and user inputs. They are general educational information and do not consider your finances, experience, objectives or risk tolerance.'] },
      { heading: '2. You can lose money', paragraphs: ['Leveraged products, forex, CFDs, crypto-assets and other markets can move rapidly. You may lose some or all of the money committed and, depending on the product, may face losses beyond an initial amount. Do not trade money you cannot afford to lose.'] },
      { heading: '3. AI and data limitations', bullets: ['Charts may be misread or lack necessary market context.', 'Indicators, confidence scores, entries, stops and targets may be wrong.', 'Prices can gap or move before an idea can be acted on.', 'Technical failures, stale information and model errors can occur.', 'Past performance and backtests do not guarantee future results.'] },
      { heading: '4. Your responsibility', paragraphs: ['Independently verify all information, understand the product and fees, use appropriate risk controls, and consider advice from an authorised financial professional. You alone decide whether and how to trade.'] },
      { heading: '5. No custody or execution', paragraphs: ['NEXORA does not accept deposits, hold customer trading funds, open brokerage positions or execute trades. Payments to NEXORA purchase access to software only.'] },
    ],
  },
};

export function LegalPage({ page }: { page: LegalPageName }) {
  const content = pages[page];
  return (
    <div className="min-h-screen bg-ink-950">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
        <p className="text-xs font-700 uppercase tracking-[0.2em] text-neon-400">{content.eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-700 tracking-tight text-white sm:text-5xl">{content.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-300">{content.intro}</p>
        <p className="mt-3 text-xs text-ink-500">Last updated: {UPDATED}</p>
        <div className="mt-10 space-y-5">
          {content.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
              <h2 className="font-display text-xl font-600 text-white">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-ink-300">{paragraph}</p>)}
              {section.bullets && <ul className="mt-3 space-y-2 pl-5 text-sm leading-7 text-ink-300">{section.bullets.map((bullet) => <li key={bullet} className="list-disc marker:text-neon-500">{bullet}</li>)}</ul>}
            </section>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-neon-500/20 bg-neon-500/[0.05] p-6 text-sm leading-7 text-ink-300">
          Questions about this policy? Email <a className="font-600 text-neon-400 hover:text-neon-300" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </div>
      </main>
      <Footer />
    </div>
  );
}
