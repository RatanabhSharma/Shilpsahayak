import { Link } from 'react-router-dom';
import { RotateCcw, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

/* ============================================================
   REFUND & RETURN POLICY — Shilp Sahayak
   Under the Consumer Protection Act 2019 (India)
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
  { id: 'overview', label: 'Policy Overview' },
  { id: 'catalogue', label: 'Catalogue Products' },
  { id: 'custom-prints', label: 'Custom 3D Prints' },
  { id: 'non-returnable', label: 'Non-Returnable Items' },
  { id: 'how-to-return', label: 'How to Initiate a Return' },
  { id: 'refund-timeline', label: 'Refund Timeline' },
  { id: 'damaged-goods', label: 'Damaged / Wrong Items' },
  { id: 'contact', label: 'Contact' },
];

export function RefundPolicy() {
  return (
    <div className="min-h-screen bg-paper text-ink pt-16 lg:pt-20">
      {/* Page Header */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Legal · Refunds
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Refund &amp; Return Policy
              </h1>
            </div>
          </div>
          <p className="font-sans text-sm text-muted max-w-2xl leading-relaxed">
            We stand behind the quality of every piece that leaves our Patiala workshop. This
            policy explains your return and refund rights under the{' '}
            <strong className="text-ink">Consumer Protection Act, 2019</strong> and our studio
            commitments.
          </p>
          <p className="mt-3 font-mono text-xs text-muted">
            Last updated: <strong>September 2026</strong>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16 grid gap-12 lg:grid-cols-[260px_1fr] lg:items-start">
        {/* Sidebar Table of Contents */}
        <nav
          aria-label="Refund policy sections"
          className="hidden lg:block sticky top-28 rounded-2xl border border-line bg-white p-5 shadow-soft"
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-3">
            Sections
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

          {/* Quick Summary Card */}
          <div className="rounded-2xl border border-line bg-white p-6 grid sm:grid-cols-2 gap-4 shadow-soft">
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                ✓ Eligible for Return
              </p>
              {[
                'Catalogue items — manufacturing defect only',
                'Wrong item delivered',
                'Damaged in transit',
                'Request within 7 days of delivery',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 sm:border-l sm:border-line sm:pl-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-600">
                ✗ Not Eligible
              </p>
              {[
                'Custom / personalized 3D prints (once production started)',
                'Change of mind',
                'Customer-damaged goods',
                'Requests after 7 days of delivery',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-muted">
                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <Section id="overview" title="1. Policy Overview">
            <p>
              Due to the nature of on-demand 3D fabrication, our refund and return eligibility
              differs between catalogue products and custom fabrication orders. Please review each
              section carefully.
            </p>
            <p>
              Our policy complies with the{' '}
              <strong className="text-ink">Consumer Protection Act, 2019</strong> and associated
              rules. For any dispute, you may also approach the appropriate Consumer Disputes
              Redressal Forum in your jurisdiction.
            </p>
          </Section>

          <Section id="catalogue" title="2. Catalogue Products (Ready-to-Ship / Made-to-Order Standard Items)">
            <p>
              We accept returns and refunds for catalogue products under the following conditions:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>
                <strong className="text-ink">Return window:</strong> 7 days from the date of
                delivery (as evidenced by courier tracking).
              </li>
              <li>
                <strong className="text-ink">Eligible reasons:</strong> Manufacturing defect (e.g.,
                structural failure, visible print layer delamination under normal use),
                significantly incorrect item delivered, or item damaged in transit.
              </li>
              <li>
                <strong className="text-ink">Condition:</strong> Items must be unused, in original
                packaging, and accompanied by unboxing photos or a short video as proof of the defect.
              </li>
              <li>
                <strong className="text-ink">Return shipping:</strong> We will arrange a pickup or
                reimburse return courier charges (up to ₹150) if the defect is verified to be on
                our end.
              </li>
            </ul>
            <p>
              Colour variation within ±10% of the displayed product image is not considered a
              defect due to inherent variability in filament batches and screen calibration.
            </p>
          </Section>

          <Section id="custom-prints" title="3. Custom 3D Print Orders (Shilp Studio Uploads)">
            <p>
              Custom fabrication orders are{' '}
              <strong className="text-ink">non-refundable once production has commenced.</strong>{' '}
              This is because:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>Filament and resin are consumed in the print process and cannot be recovered.</li>
              <li>Machine time and engineering review are allocated specifically to your file.</li>
              <li>The finished part is made exclusively to your specification and has no resale value.</li>
            </ul>
            <p>
              <strong className="text-ink">Exception — Studio Production Fault:</strong> If we
              determine that the defect was caused by our processing error (e.g., wrong material
              used, significant dimensional error caused by our slicing settings — not your model),
              we will reprint the part at no charge or issue a full refund, at our discretion.
            </p>
            <p>
              <strong className="text-ink">Cancellation before production:</strong> Custom orders
              can be cancelled and fully refunded within{' '}
              <strong className="text-ink">4 hours of order confirmation</strong> if we have not
              yet entered the file into the print queue. Contact us via WhatsApp immediately.
            </p>
          </Section>

          <Section id="non-returnable" title="4. Non-Returnable Items">
            <p>The following items are not eligible for return or refund under any circumstances:</p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>Custom / personalised prints once production has begun.</li>
              <li>Items with customer-induced damage (dropped, modified, exposed to extreme conditions).</li>
              <li>Items returned without prior authorisation from our team.</li>
              <li>Digital files, design consultation services, or quote fees (if applicable).</li>
              <li>Bulk orders where individual item issues fall within stated print tolerances.</li>
            </ul>
          </Section>

          <Section id="how-to-return" title="5. How to Initiate a Return">
            <p>
              Follow these steps to initiate a return:
            </p>
            <ol className="space-y-3 text-xs">
              {[
                {
                  step: '01',
                  title: 'Contact us within 7 days of delivery',
                  desc: 'Send a WhatsApp message or email to hello@shilpsahayak.com with your Order ID and a clear description of the issue.',
                },
                {
                  step: '02',
                  title: 'Send evidence',
                  desc: 'Attach clear photos or a short video showing the defect, the item, and the packaging. This is required to process your request.',
                },
                {
                  step: '03',
                  title: 'Await review',
                  desc: 'Our team will review your request within 2 business days and confirm whether the return is approved.',
                },
                {
                  step: '04',
                  title: 'Ship the item back (if required)',
                  desc: 'If approved, we will provide return instructions. Do not ship the item before receiving approval, as we cannot guarantee acceptance of unauthorised returns.',
                },
                {
                  step: '05',
                  title: 'Refund or replacement issued',
                  desc: 'Once we receive and verify the returned item, we will process your refund or dispatch a replacement within 5–10 business days.',
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-4 rounded-xl border border-line bg-white p-4">
                  <span className="font-mono text-xl font-bold text-accent/50 shrink-0 w-8">
                    {item.step}
                  </span>
                  <div>
                    <p className="font-bold text-ink">{item.title}</p>
                    <p className="text-muted mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="refund-timeline" title="6. Refund Timeline">
            <p>
              Once a refund is approved and (where required) the item is received back at our
              workshop:
            </p>
            <ul className="space-y-1.5 text-xs">
              {[
                ['COD orders', 'Refund via bank transfer / UPI within 5–7 business days'],
                ['Prepaid orders (bank transfer / UPI)', 'Refund to original payment account within 5–10 business days'],
                ['Replacement orders', 'Re-dispatched within 5–7 business days after verification'],
              ].map(([method, timeline]) => (
                <li key={method} className="flex gap-3 rounded-xl border border-line bg-white p-3">
                  <span className="font-bold text-ink shrink-0 w-[200px]">{method}</span>
                  <span className="text-muted">{timeline}</span>
                </li>
              ))}
            </ul>
            <p>
              For COD refunds, we will contact you via WhatsApp/email to collect your bank account
              details (account number, IFSC, account name) for NEFT/UPI transfer.
            </p>
          </Section>

          <Section id="damaged-goods" title="7. Damaged or Wrong Items Received">
            <p>
              If your order arrives damaged in transit or contains a wrong item:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>
                Record an unboxing video whenever possible — this significantly speeds up
                resolution.
              </li>
              <li>
                Contact us within <strong className="text-ink">48 hours of delivery</strong> for
                transit damage claims, as courier partners require timely reporting.
              </li>
              <li>
                We will either resend the correct item or issue a full refund, including any
                shipping charges paid.
              </li>
            </ul>
          </Section>

          <Section id="contact" title="8. Contact for Refund Queries">
            <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 space-y-2 text-xs">
              <p className="font-bold text-ink text-sm">Shilp Sahayak — Returns &amp; Refunds</p>
              <p>
                <a href="mailto:hello@shilpsahayak.com" className="text-accent font-mono hover:underline">
                  hello@shilpsahayak.com
                </a>
              </p>
              <p className="text-muted">
                WhatsApp: available via the chat button on our Platform
                <br />
                Response time: within 2 business days
              </p>
            </div>
          </Section>

          {/* Footer Navigation */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-line text-xs font-sans">
            <Link to="/privacy-policy" className="text-accent hover:underline font-medium">
              Privacy Policy →
            </Link>
            <Link to="/terms-and-conditions" className="text-accent hover:underline font-medium">
              Terms &amp; Conditions →
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

