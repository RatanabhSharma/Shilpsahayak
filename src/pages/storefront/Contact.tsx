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
} from 'lucide-react';

import {
  Button,
  Input,
  Textarea,
  Badge,
} from '../../components/ui';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-charcoal">
      {/* Hero Header */}
      <section className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                Connect With Shilp Sahayak
              </span>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-charcoal sm:text-5xl">
                Have a 3D Print Idea?
                <br />
                <span className="text-brand-500">Let&apos;s Build It Together.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-charcoal-light sm:text-base leading-relaxed">
                Whether you need rapid prototyping, architectural models, custom lithophanes, or mass production, our engineering team in Patiala is ready to assist.
              </p>
            </div>

            <div className="lg:col-span-4 lg:border-l lg:border-zinc-200 lg:pl-8">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-lighter block mb-3">
                How We Can Help
              </span>
              <ul className="space-y-2 text-xs text-charcoal-light">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span>CAD file design & slicing feasibility</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span>Material selection (PLA, PETG, ABS, Resin)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span>Bulk batch production discounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
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
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                Studio Channels
              </span>
              <h2 className="mt-1 font-serif text-2xl font-bold text-charcoal sm:text-3xl">
                Get in Touch
              </h2>
              <p className="mt-2 text-xs text-charcoal-light leading-relaxed">
                Connect directly with our workshop engineers or schedule a studio visit in Patiala.
              </p>
            </div>

            <div className="space-y-3">
              {/* WhatsApp Card */}
              <a
                href="https://wa.me/919988000000?text=Hi%20Shilp%20Sahayak%2C%20I%20have%20an%20inquiry%20regarding%203D%20printing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-base font-bold text-charcoal">WhatsApp Direct</h3>
                    <Badge variant="success">Instant Response</Badge>
                  </div>
                  <p className="font-mono text-xs text-emerald-700 font-bold mt-1">
                    +91 99880 00000
                  </p>
                  <p className="text-xs text-charcoal-lighter mt-1">
                    Quick file reviews, slicing advice, and live status.
                  </p>
                </div>
              </a>

              {/* Email Card */}
              <a
                href="mailto:hello@shilpsahayak.in"
                className="flex items-start gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 group-hover:scale-105 transition-transform">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-base font-bold text-charcoal">Email Studio</h3>
                  <p className="font-mono text-xs text-brand-600 font-bold mt-1">
                    hello@shilpsahayak.in
                  </p>
                  <p className="text-xs text-charcoal-lighter mt-1">
                    For enterprise quotes, CAD attachments, and invoices.
                  </p>
                </div>
              </a>

              {/* Studio Address Card */}
              <div className="flex items-start gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-charcoal">
                  <MapPin className="h-6 w-6 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-base font-bold text-charcoal">Patiala Studio</h3>
                  <p className="text-xs text-charcoal-light mt-1 leading-relaxed">
                    Model Town / Urban Estate, Patiala, Punjab — 147001
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 font-mono text-[11px] text-charcoal-lighter">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Mon - Sat: 9:00 AM – 7:00 PM IST</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Print Quick Box */}
            <div className="rounded-3xl border border-brand-200 bg-brand-50/50 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-500" />
                <h4 className="font-serif text-sm font-bold text-charcoal">Have a 3D File Ready?</h4>
              </div>
              <p className="text-xs text-charcoal-light leading-relaxed">
                Skip the contact form and upload your STL directly to our automated slicing calculator for instant pricing at ₹4.5/g.
              </p>
              <Link to="/custom-service" className="inline-block">
                <Button size="sm" className="font-bold text-xs">
                  Launch 3D File Uploader
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-zinc-200 bg-white p-7 sm:p-9 shadow-sm">
              {submitted ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>

                  <span className="mt-5 font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                    Message Dispatched
                  </span>

                  <h2 className="mt-2 font-serif text-3xl font-bold text-charcoal">
                    Thank you for reaching out!
                  </h2>

                  <p className="mt-2 max-w-md text-xs text-charcoal-light leading-relaxed">
                    Your inquiry has been received by our engineering team. We will review your requirements and respond via email/WhatsApp within 2-4 business hours.
                  </p>

                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    className="mt-6 font-bold text-xs"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-b border-zinc-100 pb-5 mb-6">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                      Direct Message
                    </span>
                    <h2 className="mt-1 font-serif text-2xl font-bold text-charcoal">
                      Send Us an Inquiry
                    </h2>
                    <p className="mt-1 text-xs text-charcoal-light">
                      Tell us about your print concept, required strength, timeline, and delivery pin code.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input
                        name="name"
                        label="Your Full Name *"
                        placeholder="e.g. Gurpreet Singh"
                        autoComplete="name"
                        required
                      />

                      <Input
                        name="email"
                        label="Email Address *"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input
                        name="phone"
                        label="Mobile / WhatsApp Number *"
                        type="tel"
                        placeholder="10-digit mobile number"
                        required
                      />

                      <Input
                        name="subject"
                        label="Inquiry Subject *"
                        placeholder="e.g. Custom Lithophane Lamp / CAD Prototyping"
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

                    <div className="flex flex-col gap-4 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] text-charcoal-lighter leading-relaxed max-w-sm">
                        🔒 Shilp Sahayak respects your IP. All CAD concepts and designs remain 100% confidential.
                      </p>

                      <Button type="submit" size="lg" className="font-bold shadow-md shadow-brand-500/20">
                        Send Inquiry
                        <ArrowRight className="ml-1.5 h-4 w-4" />
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
      <section className="border-t border-zinc-800 bg-[#0b0f17] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                Maker Studio in Patiala
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl text-white">
                If you can imagine it, we can print it.
              </h2>
              <p className="mt-1 text-xs text-zinc-400 max-w-xl">
                High-precision FDM and SLA additive manufacturing powered by premium filaments, tested layer by layer.
              </p>
            </div>

            <Link to="/custom-service">
              <Button size="lg" className="font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20">
                Explore Custom Studio
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}