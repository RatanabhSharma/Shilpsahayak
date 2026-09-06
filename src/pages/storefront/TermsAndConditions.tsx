import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';

/* ============================================================
   TERMS AND CONDITIONS — Shilp Sahayak
   Governed by Indian law — Consumer Protection Act 2019,
   IT Act 2000, Contract Act 1872
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
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'about', label: 'About Our Services' },
  { id: 'account', label: 'Your Account' },
  { id: 'orders', label: 'Orders & Pricing' },
  { id: 'custom-prints', label: 'Custom 3D Prints' },
  { id: 'intellectual-property', label: 'Intellectual Property' },
  { id: 'shipping', label: 'Shipping & Delivery' },
  { id: 'payment', label: 'Payment & GST' },
  { id: 'prohibited', label: 'Prohibited Uses' },
  { id: 'disclaimer', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'governing-law', label: 'Governing Law' },
  { id: 'contact', label: 'Contact' },
];

export function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-paper text-ink pt-16 lg:pt-20">
      {/* Page Header */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Legal · Terms
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Terms &amp; Conditions
              </h1>
            </div>
          </div>
          <p className="font-sans text-sm text-muted max-w-2xl leading-relaxed">
            Please read these Terms &amp; Conditions carefully before using the Shilp Sahayak
            Platform. By creating an account, placing an order, or uploading a CAD file, you
            agree to be bound by these terms.
          </p>
          <p className="mt-3 font-mono text-xs text-muted">
            Last updated: <strong>September 2026</strong>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16 grid gap-12 lg:grid-cols-[260px_1fr] lg:items-start">
        {/* Sidebar Table of Contents */}
        <nav
          aria-label="Terms and conditions sections"
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

          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>
              These Terms &amp; Conditions (&ldquo;Terms&rdquo;) form a legally binding
              agreement between <strong className="text-ink">you</strong> (the user, customer,
              or visitor) and <strong className="text-ink">Shilp Sahayak</strong>, a 3D
              fabrication studio operating from Patiala, Punjab, India
              (&ldquo;Shilp Sahayak&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
              &ldquo;our&rdquo;).
            </p>
            <p>
              By accessing <span className="font-mono text-accent">shilpsahayak.com</span>,
              creating an account, placing an order, uploading a CAD file, or submitting an
              inquiry, you confirm that you have read, understood, and agree to these Terms. If
              you do not agree, please do not use our Platform.
            </p>
            <p>
              You must be at least <strong className="text-ink">18 years of age</strong> to use
              this Platform and enter into a binding contract under the Indian Contract Act,
              1872.
            </p>
          </Section>

          <Section id="about" title="2. About Our Services">
            <p>
              Shilp Sahayak provides the following services through the Platform:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>
                <strong className="text-ink">Catalogue Sales:</strong> Sale of ready-to-ship or
                made-to-order 3D-printed products from our standard product catalogue.
              </li>
              <li>
                <strong className="text-ink">Custom Fabrication (Shilp Studio):</strong> Upload
                your own CAD file (STL, OBJ, or 3MF format) for an automated instant price
                estimate, followed by manual review and fabrication upon order confirmation.
              </li>
              <li>
                <strong className="text-ink">Bulk &amp; Enterprise Orders:</strong> Volume
                discounts and custom production runs for businesses, colleges, and institutions.
              </li>
            </ul>
            <p>
              All fabrication occurs at our workshop in{' '}
              <strong className="text-ink">Patiala, Punjab, India</strong>. We currently ship
              across India only.
            </p>
          </Section>

          <Section id="account" title="3. Your Account">
            <p>
              To place an order or submit a custom print request, you must register for an
              account using a valid email address and Indian mobile number. You are responsible
              for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>Maintaining the confidentiality of your password.</li>
              <li>All activity that occurs under your account.</li>
              <li>Notifying us immediately of any unauthorised access to your account.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or
              are found to be used for fraudulent purposes.
            </p>
          </Section>

          <Section id="orders" title="4. Orders, Pricing & Cancellations">
            <p>
              <strong className="text-ink">Order placement:</strong> An order is confirmed when
              you receive an order confirmation email/WhatsApp message from us. We reserve the
              right to cancel or reject any order due to stock unavailability, pricing errors,
              or technical issues, with a full refund where applicable.
            </p>
            <p>
              <strong className="text-ink">Pricing:</strong> All prices displayed on the
              Platform are in Indian Rupees (₹) and are inclusive of applicable GST. Prices for
              custom prints are dynamically calculated based on material, volume (cm³), weight
              (g), and infill settings using our automated slicer engine. Estimates are
              indicative until confirmed by our engineering team.
            </p>
            <p>
              <strong className="text-ink">Cancellation window:</strong> Catalogue orders can be
              cancelled within <strong className="text-ink">2 hours</strong> of placement,
              provided production has not started. Custom print orders cannot be cancelled once
              the file has entered the slicing queue (typically within 4 hours of confirmation).
              Contact us on WhatsApp for urgent cancellation requests.
            </p>
            <p>
              <strong className="text-ink">Price changes:</strong> We reserve the right to
              update prices at any time. The price applicable to your order is the one confirmed
              at the time of your order placement.
            </p>
          </Section>

          <Section id="custom-prints" title="5. Custom 3D Print Services">
            <p>
              When you submit a CAD file via Shilp Studio:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>
                You confirm that the file is <strong className="text-ink">your own original work</strong>{' '}
                or that you have the legal right / licence to reproduce it.
              </li>
              <li>
                You grant us a limited, non-exclusive licence to process and print your design
                solely to fulfil your order.
              </li>
              <li>
                We will not reproduce, share, sell, or use your design for any other purpose
                without your written consent.
              </li>
              <li>
                We reserve the right to decline printing of any design that is illegal, harmful,
                weaponisable, or violates third-party intellectual property rights.
              </li>
              <li>
                Print quality is subject to the inherent limitations of FDM and SLA technology
                (layer lines, tolerance of up to ±0.5 mm may occur on complex geometries). We
                will communicate any feasibility concerns before production.
              </li>
            </ul>
          </Section>

          <Section id="intellectual-property" title="6. Intellectual Property">
            <p>
              All content on the Shilp Sahayak Platform, including logos, text, product
              photographs, 3D renders, and software code, is owned by or licensed to Shilp
              Sahayak and is protected under Indian copyright, trademark, and design laws.
            </p>
            <p>
              You may not copy, reproduce, distribute, or commercially exploit any Platform
              content without our prior written permission.
            </p>
            <p>
              <strong className="text-ink">Customer CAD files:</strong> You retain full ownership
              of your uploaded designs. We claim no ownership or right to your intellectual
              property.
            </p>
          </Section>

          <Section id="shipping" title="7. Shipping & Delivery">
            <p>
              We dispatch all orders from our Patiala workshop via tracked courier partners
              (Delhivery, DTDC, India Post, or equivalent). Estimated delivery timelines:
            </p>
            <ul className="space-y-1 text-xs">
              {[
                ['Standard catalogue items', '5–8 business days from dispatch'],
                ['Custom FDM prints (simple)', '7–12 business days (includes print time)'],
                ['Custom resin / detailed prints', '10–16 business days'],
                ['Bulk / enterprise orders', 'Timeline communicated on quote confirmation'],
              ].map(([type, timeline]) => (
                <li key={type} className="flex gap-3 rounded-xl border border-line bg-white p-3">
                  <span className="font-bold text-ink shrink-0 min-w-[180px]">{type}</span>
                  <span className="text-muted">{timeline}</span>
                </li>
              ))}
            </ul>
            <p>
              Delivery timelines are estimates and not guaranteed. We are not liable for delays
              caused by courier partners, natural disasters, or government restrictions.
            </p>
            <p>
              Risk of loss and title passes to you upon dispatch. All shipments include a
              tracking number shared via email/WhatsApp.
            </p>
          </Section>

          <Section id="payment" title="8. Payment & GST">
            <p>
              We currently accept the following payment methods:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>Cash on Delivery (COD)</li>
              <li>Bank transfer / UPI (on invoice, for confirmed orders)</li>
            </ul>
            <p>
              All prices are inclusive of applicable{' '}
              <strong className="text-ink">Goods &amp; Services Tax (GST)</strong> as per
              current Indian rates. A GST invoice will be provided on request. If you require
              a GST invoice for business purposes, please mention your GSTIN when placing the
              order.
            </p>
            <p>
              For COD orders, payment is due at the time of delivery. Refusal to accept a
              delivered order may result in the customer being charged return shipping and
              restocking fees, and future COD access may be restricted on the account.
            </p>
          </Section>

          <Section id="prohibited" title="9. Prohibited Uses">
            <p>
              You agree not to use the Platform to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>Order or upload designs for weapons, illegal items, or counterfeit goods.</li>
              <li>Infringe third-party copyrights, trademarks, or patents.</li>
              <li>Submit fraudulent or duplicate orders.</li>
              <li>Attempt to hack, exploit, or reverse-engineer the Platform.</li>
              <li>Provide false contact or address information for order placement.</li>
              <li>Harass, abuse, or threaten our staff or other users.</li>
            </ul>
            <p>
              Violation of these terms may result in immediate account termination and, where
              required by law, referral to law enforcement authorities.
            </p>
          </Section>

          <Section id="disclaimer" title="10. Disclaimers">
            <p>
              The Platform and services are provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, except as expressly stated in
              these Terms or required by applicable Indian consumer protection law.
            </p>
            <p>
              Material specifications and print parameters displayed on the Platform (density,
              tolerance, finish) are indicative. Actual results may vary based on model
              complexity, geometry, and environmental conditions during printing. Our quoted
              precision of{' '}
              <strong className="text-ink">up to ±50 µm</strong> applies to calibrated FDM and
              SLA machines under controlled conditions; individual prints may vary.
            </p>
            <p>
              We make reasonable efforts to display product colours and finishes accurately;
              however, actual colours may vary slightly due to monitor calibration differences.
            </p>
          </Section>

          <Section id="liability" title="11. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable Indian law, Shilp Sahayak&rsquo;s
              total liability to you for any claim arising out of or relating to these Terms or
              our services shall not exceed the{' '}
              <strong className="text-ink">amount you paid for the specific order</strong> giving
              rise to the claim.
            </p>
            <p>
              We shall not be liable for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>Indirect, incidental, or consequential losses.</li>
              <li>Loss of profit, business, or data.</li>
              <li>Losses arising from your use of a 3D-printed part in safety-critical applications (medical implants, load-bearing structures, etc.) unless explicitly agreed in writing.</li>
            </ul>
            <p>
              Nothing in these Terms excludes or limits our liability for death, personal injury,
              fraud, or any liability that cannot be excluded under Indian law.
            </p>
          </Section>

          <Section id="governing-law" title="12. Governing Law & Disputes">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of
              India, specifically:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
              <li>The Indian Contract Act, 1872</li>
              <li>The Consumer Protection Act, 2019</li>
              <li>The Information Technology Act, 2000</li>
              <li>The Digital Personal Data Protection Act, 2023</li>
            </ul>
            <p>
              Any dispute arising out of or in connection with these Terms shall first be
              attempted to be resolved amicably through good-faith negotiation. If unresolved
              within 30 days, disputes shall be subject to the exclusive jurisdiction of the
              courts at <strong className="text-ink">Patiala, Punjab, India</strong>.
            </p>
            <p>
              Consumer disputes may be referred to the appropriate Consumer Disputes Redressal
              Forum under the Consumer Protection Act, 2019.
            </p>
          </Section>

          <Section id="contact" title="13. Contact Us">
            <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 space-y-2 text-xs">
              <p className="font-bold text-ink text-sm">Shilp Sahayak — Legal</p>
              <p>
                <a href="mailto:hello@shilpsahayak.com" className="text-accent font-mono hover:underline">
                  hello@shilpsahayak.com
                </a>
              </p>
              <p className="text-muted">
                Workshop: Patiala, Punjab — 147001, India
                <br />
                WhatsApp: available via the chat button on our Platform
              </p>
            </div>
          </Section>

          {/* Footer Navigation */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-line text-xs font-sans">
            <Link to="/privacy-policy" className="text-accent hover:underline font-medium">
              Privacy Policy →
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

