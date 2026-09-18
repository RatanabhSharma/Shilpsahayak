import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';

/* ============================================================
   PRIVACY POLICY — Shilp Sahayak
   Compliant with India's Digital Personal Data Protection
   (DPDP) Act 2023 & IT Act 2000
   Last updated: September 2026
   ============================================================ */

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-xl font-bold text-ink mb-3 pb-2 border-b border-line">
        {title}
      </h2>
      <div className="space-y-3 font-sans text-sm text-muted leading-relaxed">
        {children}
      </div>
    </section>
  );
}

const TOC_ITEMS = [
  { id: 'who-we-are', label: 'Who We Are' },
  { id: 'data-collected', label: 'Data We Collect' },
  { id: 'why-we-collect', label: 'Why We Collect It' },
  { id: 'data-sharing', label: 'Data Sharing' },
  { id: 'cookies', label: 'Cookies & Local Storage' },
  { id: 'retention', label: 'Data Retention' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'security', label: 'Security' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact Us' },
];

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-paper text-ink pt-16 lg:pt-20">
      {/* Page Header */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Legal · Privacy
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Privacy Policy
              </h1>
            </div>
          </div>
          <p className="font-sans text-sm text-muted max-w-2xl leading-relaxed">
            This policy explains how <strong className="text-ink">Shilp Sahayak</strong>{' '}
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our Studio&rdquo;) collects, uses, and
            protects your personal data. We are committed to transparency and your data rights
            under the <strong className="text-ink">Digital Personal Data Protection (DPDP) Act, 2023</strong>{' '}
            and the <strong className="text-ink">Information Technology Act, 2000</strong>.
          </p>
          <p className="mt-3 font-mono text-xs text-muted">
            Last updated: <strong>September 2026</strong> · Effective immediately
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16 grid gap-12 lg:grid-cols-[260px_1fr] lg:items-start">
        {/* Sidebar Table of Contents */}
        <nav
          aria-label="Privacy policy sections"
          className="hidden lg:block sticky top-28 rounded-2xl border border-line bg-white p-5 shadow-soft"
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-3">
            Contents
          </p>
          <ul className="space-y-1.5">
            {TOC_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="font-sans text-xs text-muted hover:text-accent transition-colors flex items-center gap-1.5 group"
                >
                  <ArrowRight className="h-3 w-3 text-muted/40 group-hover:text-accent transition-colors shrink-0" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <article className="space-y-10 max-w-3xl">

          <Section id="who-we-are" title="1. Who We Are">
            <p>
              <strong className="text-ink">Shilp Sahayak</strong> is a custom 3D printing and
              digital fabrication studio based in <strong className="text-ink">Patiala, Punjab, India</strong>.
              We operate the website at{' '}
              <span className="font-mono text-accent">shilpsahayak.com</span> (the
              &ldquo;Platform&rdquo;) through which we sell 3D-printed products and custom
              fabrication services to customers across India.
            </p>
            <p>
              For the purposes of applicable Indian data protection law, Shilp Sahayak is the
              &ldquo;Data Fiduciary&rdquo; (i.e., the entity that determines the purpose and means
              of processing your personal data).
            </p>
            <div className="rounded-xl border border-line bg-shell p-4 text-xs">
              <p className="font-bold text-ink mb-1">Data Fiduciary Contact</p>
              <p>
                Privacy inquiries:{' '}
                <a
                  href="mailto:hello@shilpsahayak.com"
                  className="text-accent font-mono hover:underline"
                >
                  hello@shilpsahayak.com
                </a>
              </p>
              <p className="mt-1 text-muted">
                Workshop: Patiala, Punjab — 147001, India
              </p>
            </div>
          </Section>

          <Section id="data-collected" title="2. Personal Data We Collect">
            <p>
              We collect only the minimum data required to provide our services. Below is a
              complete list of personal data we process:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-shell text-left">
                    <th className="border border-line px-3 py-2 font-bold text-ink">Data</th>
                    <th className="border border-line px-3 py-2 font-bold text-ink">When Collected</th>
                    <th className="border border-line px-3 py-2 font-bold text-ink">Required?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    ['Full name', 'Account signup', 'Yes — for order dispatch'],
                    ['Email address', 'Account signup / login', 'Yes — for authentication & notifications'],
                    ['Mobile number', 'Account signup / checkout', 'Yes — for delivery updates & OTP verification'],
                    ['Delivery address (street, city, state, PIN)', 'Checkout', 'Yes — for courier dispatch'],
                    ['CAD / STL / OBJ / 3MF files', 'Custom print upload (Shilp Studio)', 'Only when you use custom printing'],
                    ['Order history & items purchased', 'On order placement', 'Yes — for fulfilment & account'],
                    ['Contact form message', 'When you contact us', 'Only when you send an inquiry'],
                    ['Device & browser type (Firebase logs)', 'Automatically on app load', 'Functional — for app security'],
                  ].map(([data, when, required]) => (
                    <tr key={data} className="hover:bg-shell/40">
                      <td className="border border-line px-3 py-2 font-medium text-ink">{data}</td>
                      <td className="border border-line px-3 py-2 text-muted">{when}</td>
                      <td className="border border-line px-3 py-2 text-muted">{required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs">
              <strong className="text-ink">We do not collect:</strong> payment card numbers (we
              use Cash-on-Delivery / manual bank transfer; no card processor is integrated),
              government ID numbers, or biometric data.
            </p>
          </Section>

          <Section id="why-we-collect" title="3. Why We Collect Your Data (Purposes)">
            <p>
              We rely on the following lawful bases under the DPDP Act 2023 for processing:
            </p>
            <ul className="space-y-2 text-xs">
              {[
                {
                  purpose: 'Order fulfilment & dispatch',
                  basis: 'Contract — to deliver what you purchased',
                  data: 'Name, address, phone, order items',
                },
                {
                  purpose: 'Account creation & authentication',
                  basis: 'Contract — to give you access to your orders & CAD vault',
                  data: 'Name, email, phone, password (hashed by Firebase)',
                },
                {
                  purpose: 'Custom print processing',
                  basis: 'Contract — to fabricate your uploaded model',
                  data: 'CAD files, material preferences, notes',
                },
                {
                  purpose: 'Order status notifications',
                  basis: 'Legitimate interest — keeping you informed',
                  data: 'Email, WhatsApp number',
                },
                {
                  purpose: 'Fraud prevention & OTP verification',
                  basis: 'Legitimate interest — protecting you and us',
                  data: 'Phone number, session data',
                },
                {
                  purpose: 'Responding to inquiries',
                  basis: 'Consent — you voluntarily contact us',
                  data: 'Name, email, phone, message',
                },
              ].map((row) => (
                <li
                  key={row.purpose}
                  className="rounded-xl border border-line bg-white p-3 space-y-0.5"
                >
                  <p className="font-bold text-ink">{row.purpose}</p>
                  <p className="text-muted">
                    <span className="font-semibold">Basis:</span> {row.basis}
                  </p>
                  <p className="text-muted">
                    <span className="font-semibold">Data used:</span> {row.data}
                  </p>
                </li>
              ))}
            </ul>
            <p>
              We <strong className="text-ink">do not</strong> send marketing emails or SMS
              without your explicit consent, and we do not use your data for profiling or
              automated decision-making.
            </p>
          </Section>

          <Section id="data-sharing" title="4. Who We Share Your Data With">
            <p>
              We do not sell your personal data. We share it only with the following
              sub-processors, each bound by data protection obligations:
            </p>
            <ul className="space-y-2 text-xs">
              {[
                {
                  processor: 'Google Firebase (Google LLC)',
                  purpose: 'Authentication, Firestore database, Cloud Storage (CAD files)',
                  location: 'Mumbai (asia-south1) / Global',
                  policy: 'https://policies.google.com/privacy',
                },
                {
                  processor: 'Courier partners (Delhivery / DTDC / India Post)',
                  purpose: 'Last-mile delivery — your name, address, phone shared with courier',
                  location: 'India',
                  policy: 'Varies by carrier',
                },
                {
                  processor: 'Cloudflare (R2 Storage)',
                  purpose: 'Hosting static assets and CAD file vault storage',
                  location: 'India Edge / US',
                  policy: 'https://www.cloudflare.com/privacypolicy/',
                },
                {
                  processor: 'Vercel Inc.',
                  purpose: 'Web hosting and CDN',
                  location: 'US / Global CDN',
                  policy: 'https://vercel.com/legal/privacy-policy',
                },
              ].map((row) => (
                <li
                  key={row.processor}
                  className="rounded-xl border border-line bg-white p-3 space-y-0.5"
                >
                  <p className="font-bold text-ink">{row.processor}</p>
                  <p className="text-muted">{row.purpose}</p>
                  <p className="text-muted">
                    <span className="font-semibold">Location:</span> {row.location}
                  </p>
                </li>
              ))}
            </ul>
            <p>
              We may disclose your data to law enforcement or government authorities if required
              by law or to protect the safety and legal rights of Shilp Sahayak and its users.
            </p>
          </Section>

          <Section id="cookies" title="5. Cookies & Local Storage">
            <p>
              Our Platform uses browser{' '}
              <strong className="text-ink">localStorage and IndexedDB</strong> solely to store
              your Firebase authentication session token. This allows you to stay logged in
              between visits.
            </p>
            <p>
              We <strong className="text-ink">do not</strong> use:
            </p>
            <ul className="list-disc list-inside text-xs space-y-1 pl-2">
              <li>Google Analytics or any analytics tracking cookies</li>
              <li>Meta Pixel, Google Ads, or any advertising/retargeting cookies</li>
              <li>Third-party session recording tools</li>
            </ul>
            <p>
              You can clear this storage at any time via your browser settings (Settings →
              Privacy → Clear site data for shilpsahayak.com). This will sign you out of your
              account.
            </p>
            <p>
              For more details, see our{' '}
              <Link to="/cookie-policy" className="text-accent hover:underline font-medium">
                Cookie Policy
              </Link>
              .
            </p>
          </Section>

          <Section id="retention" title="6. Data Retention">
            <p>We retain your personal data for the following periods:</p>
            <ul className="space-y-1.5 text-xs">
              {[
                ['Account data (name, email, phone)', '7 years from account closure, or as required by Indian tax law'],
                ['Order records', '7 years from dispatch (GST / income tax compliance)'],
                ['CAD files uploaded for custom prints', 'Deleted 90 days after order completion, unless you request earlier deletion'],
                ['Contact form submissions', 'Deleted after 12 months'],
                ['Authentication session tokens', 'Until you log out or the token expires (Firebase default: 1 hour, refreshed automatically while active)'],
              ].map(([item, period]) => (
                <li key={item} className="flex gap-3 rounded-xl border border-line bg-white p-3">
                  <span className="font-bold text-ink shrink-0 w-[180px]">{item}</span>
                  <span className="text-muted">{period}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="your-rights" title="7. Your Data Rights">
            <p>
              Under the DPDP Act 2023, you have the following rights as a Data Principal:
            </p>
            <ul className="space-y-2 text-xs">
              {[
                ['Right to access', 'Request a copy of all personal data we hold about you.'],
                ['Right to correction', 'Ask us to correct inaccurate or incomplete data.'],
                ['Right to erasure', 'Request deletion of your personal data (subject to legal retention requirements).'],
                ['Right to withdraw consent', 'Where we rely on consent, you can withdraw it at any time without affecting prior processing.'],
                ['Right to grievance redressal', 'Raise a complaint with our Grievance Officer (see Contact section below). We will respond within 30 days.'],
              ].map(([right, desc]) => (
                <li key={right as string} className="rounded-xl border border-line bg-white p-3">
                  <p className="font-bold text-ink">{right}</p>
                  <p className="text-muted mt-0.5">{desc}</p>
                </li>
              ))}
            </ul>
            <p>
              To exercise any right, email{' '}
              <a href="mailto:hello@shilpsahayak.com" className="text-accent font-mono hover:underline">
                hello@shilpsahayak.com
              </a>{' '}
              with subject line <em>&ldquo;Data Rights Request — [Your Name]&rdquo;</em>. We will
              respond within <strong className="text-ink">30 days</strong>.
            </p>
            <p>
              If you are unsatisfied with our response, you may escalate to India&rsquo;s{' '}
              <strong className="text-ink">Data Protection Board</strong> once it is operational
              under the DPDP Act 2023.
            </p>
          </Section>

          <Section id="security" title="8. Security">
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-xs space-y-1 pl-2">
              <li>All data transmitted over <strong className="text-ink">HTTPS/TLS encryption</strong></li>
              <li>Passwords are <strong className="text-ink">never stored in plain text</strong> — Firebase Authentication manages hashed credentials</li>
              <li>CAD files stored in Firebase Cloud Storage with per-file access rules</li>
              <li>Firestore security rules restrict data access to authenticated account owners</li>
              <li>Admin panel protected by separate authentication and role verification</li>
            </ul>
            <p>
              No system is 100% secure. If you discover a security vulnerability, please report it
              responsibly to{' '}
              <a href="mailto:hello@shilpsahayak.com" className="text-accent font-mono hover:underline">
                hello@shilpsahayak.com
              </a>
              .
            </p>
          </Section>

          <Section id="children" title="9. Children's Privacy">
            <p>
              Our Platform is intended for users aged <strong className="text-ink">18 years and above</strong>.
              We do not knowingly collect personal data from children under 18. If you believe
              we have inadvertently collected data from a minor, please contact us immediately
              for deletion.
            </p>
          </Section>

          <Section id="changes" title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy to reflect changes in law or our practices. We
              will notify registered users of material changes by email. Continued use of the
              Platform after the effective date constitutes acceptance of the revised policy.
            </p>
            <p>
              The version date at the top of this page always reflects the most recent update.
            </p>
          </Section>

          <Section id="contact" title="11. Contact & Grievance Officer">
            <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 space-y-2 text-xs">
              <p className="font-bold text-ink text-sm">Grievance Officer</p>
              <p className="text-muted">
                For any privacy complaints or data rights requests, contact:
              </p>
              <p>
                <strong className="text-ink">Shilp Sahayak — Privacy & Grievance</strong>
                <br />
                <a href="mailto:hello@shilpsahayak.com" className="text-accent font-mono hover:underline">
                  hello@shilpsahayak.com
                </a>
                <br />
                Workshop: Patiala, Punjab — 147001, India
                <br />
                <span className="text-muted">Response time: within 30 days</span>
              </p>
            </div>
          </Section>

          {/* Footer Navigation */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-line text-xs font-sans">
            <Link to="/terms-and-conditions" className="text-accent hover:underline font-medium">
              Terms &amp; Conditions →
            </Link>
            <Link to="/refund-policy" className="text-accent hover:underline font-medium">
              Refund Policy →
            </Link>
            <Link to="/cookie-policy" className="text-accent hover:underline font-medium">
              Cookie Policy →
            </Link>
            <Link to="/" className="text-muted hover:text-ink font-medium ml-auto">
              ← Back to Home
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

