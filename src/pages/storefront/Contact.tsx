import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  MapPin,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
} from 'lucide-react';

import {
  Button,
  Input,
  Textarea,
  Badge,
} from '../../components/ui';
import { useSettings } from '../../hooks/useSettings';

export function Contact() {
  const { data: settings } = useSettings();
  const [submitted, setSubmitted] = useState(false);

  const businessName = settings?.businessName || 'Shilp Sahayak';
  const whatsappNumber = settings?.whatsappNumber || '';
  const email = settings?.email || 'hello@shilpsahayak.com';
  const phone = settings?.phone || '';
  const address = settings?.address || 'Patiala, Punjab, India';

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hi ${businessName}, I have an inquiry regarding 3D printing`
      )}`
    : '#';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Hero Header */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Connect With {businessName}
              </span>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Have a 3D Print Idea?
                <br />
                <span className="text-accent">Let&apos;s Build It Together.</span>
              </h1>
              <p className="mt-4 max-w-2xl font-sans text-sm text-muted sm:text-base leading-relaxed">
                Whether you need rapid prototyping, architectural models, custom lithophanes, or mass production, our engineering team is ready to assist.
              </p>
            </div>

            <div className="lg:col-span-4 lg:border-l lg:border-line lg:pl-8">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted block mb-3">
                How We Can Help
              </span>
              <ul className="space-y-2 font-sans text-xs text-muted">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>CAD file design & slicing feasibility</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>Material selection (PLA, PETG, ABS, Resin)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>Bulk batch production discounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>Pan-India tracked courier delivery</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Direct Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Studio Channels
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
                Get in Touch
              </h2>
              <p className="mt-2 font-sans text-xs text-muted leading-relaxed">
                Connect directly with our workshop engineers or schedule a studio consultation.
              </p>
            </div>

            <div className="space-y-3">
              {/* WhatsApp Card */}
              {whatsappNumber && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft transition-all hover:border-emerald-300 hover:shadow-card group"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-ink">WhatsApp Direct</h3>
                      <Badge variant="success">Instant Response</Badge>
                    </div>
                    <p className="font-mono text-xs text-emerald-700 font-bold mt-1">
                      +{whatsappNumber}
                    </p>
                    <p className="font-sans text-xs text-muted mt-1">
                      Quick file reviews, slicing advice, and live status.
                    </p>
                  </div>
                </a>
              )}

              {/* Email Card */}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-start gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft transition-all hover:border-accent/40 hover:shadow-card group"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent group-hover:scale-105 transition-transform">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base font-bold text-ink">Email Studio</h3>
                    <p className="font-mono text-xs text-accent font-bold mt-1">
                      {email}
                    </p>
                    <p className="font-sans text-xs text-muted mt-1">
                      For enterprise quotes, CAD attachments, and invoices.
                    </p>
                  </div>
                </a>
              )}

              {/* Phone Direct Card */}
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="flex items-start gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft transition-all hover:border-accent/40 hover:shadow-card group"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent group-hover:scale-105 transition-transform">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base font-bold text-ink">Call Studio Direct</h3>
                    <p className="font-mono text-xs text-accent font-bold mt-1">
                      {phone}
                    </p>
                    <p className="font-sans text-xs text-muted mt-1">
                      Direct engineering support and dispatch updates.
                    </p>
                  </div>
                </a>
              )}

              {/* Studio Address Card */}
              {address && (
                <div className="flex items-start gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-shell text-ink">
                    <MapPin className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base font-bold text-ink">Workshop Studio</h3>
                    <p className="font-sans text-xs text-muted mt-1 leading-relaxed">
                      {address}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 font-mono text-[11px] text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Mon - Sat: 9:00 AM – 7:00 PM IST</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Print Quick Box */}
            <div className="rounded-3xl border border-accent/30 bg-accent-soft p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h4 className="font-display text-sm font-bold text-ink">Have a 3D File Ready?</h4>
              </div>
              <p className="font-sans text-xs text-muted leading-relaxed">
                Skip the contact form and upload your STL directly to our automated slicing calculator for instant transparent pricing.
              </p>
              <Link to="/custom-service" className="inline-block">
                <Button size="sm" variant="primary">
                  Launch 3D File Uploader
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-line bg-white p-7 sm:p-9 shadow-soft">
              {submitted ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>

                  <span className="mt-5 font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                    Message Dispatched
                  </span>

                  <h2 className="mt-2 font-display text-3xl font-bold text-ink">
                    Thank you for reaching out!
                  </h2>

                  <p className="mt-2 max-w-md font-sans text-xs text-muted leading-relaxed">
                    Your inquiry has been received by our engineering team. We will review your requirements and respond via email/WhatsApp within 2-4 business hours.
                  </p>

                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    size="md"
                    className="mt-6"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-b border-line pb-5 mb-6">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                      Direct Message
                    </span>
                    <h2 className="mt-1 font-display text-2xl font-bold text-ink">
                      Send Us an Inquiry
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        name="name"
                        label="Full Name *"
                        placeholder="e.g. Aditi Sharma"
                        required
                      />
                      <Input
                        name="email"
                        type="email"
                        label="Email Address *"
                        placeholder="aditi@example.com"
                        required
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        name="phone"
                        type="tel"
                        label="Phone / WhatsApp Number *"
                        placeholder="+91 98765 43210"
                        required
                      />
                      <Input
                        name="subject"
                        label="Subject / Topic *"
                        placeholder="Custom Order / Bulk Production"
                        required
                      />
                    </div>

                    <Textarea
                      name="message"
                      label="Project Description *"
                      placeholder="Share dimensions, preferred material (PLA/PETG/ABS/Resin), intended application, or any deadline constraints..."
                      rows={5}
                      required
                    />

                    <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-mono text-[11px] text-muted leading-relaxed max-w-sm">
                        🔒 Shilp Sahayak respects your IP. All CAD concepts and designs remain 100% confidential.
                      </p>

                      <Button type="submit" size="md" variant="primary">
                        <span>Send Inquiry</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dark Theme Banner Footer */}
      <section className="border-t border-zinc-800 bg-dark text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Maker Studio in Patiala
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl text-white">
                If you can imagine it, we can print it.
              </h2>
              <p className="mt-1 font-sans text-xs text-zinc-400 max-w-xl">
                High-precision FDM and SLA additive manufacturing powered by premium filaments, tested layer by layer.
              </p>
            </div>

            <Link to="/custom-service">
              <Button size="lg" variant="primary">
                <span>Explore Custom Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}