import React, { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

import {
  Button,
  Input,
  Textarea,
  Card,
} from '../../components/ui';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSubmitted(true);
  };

  return (
    <div className="bg-[#f7f4ee] text-[#14120f]">
      {/* ============================================================
          HERO
          ============================================================ */}

      <section className="border-b border-[#d9d2c7] bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-14">
            <div className="lg:col-span-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b4491e]">
                Contact Shilp Sahayak
              </p>

              <h1 className="mt-3 max-w-3xl font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.035em] text-[#14120f] sm:text-[46px] lg:text-[52px]">
                Have a question?
                <br />
                Let&apos;s talk.
              </h1>

              <p className="mt-6 max-w-2xl text-[15.5px] leading-relaxed text-[#6b6156]">
                Have a question about an order, a custom
                project, or just want to say hello? We&apos;d
                love to hear from you.
              </p>
            </div>

            <div className="lg:col-span-4 lg:border-l lg:border-[#d9d2c7] lg:pl-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e8275]">
                Best for
              </p>

              <ul className="mt-3 space-y-2 text-[13.5px] text-[#6b6156]">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#b4491e]" />
                  Order questions
                </li>

                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#b4491e]" />
                  Custom printing
                </li>

                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#b4491e]" />
                  Prototypes and special projects
                </li>

                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#b4491e]" />
                  General enquiries
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MAIN CONTACT AREA
          ============================================================ */}

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            {/* ======================================================
                CONTACT INFORMATION
                ====================================================== */}

            <div className="lg:col-span-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8e8275]">
                Get in touch
              </p>

              <h2 className="mt-3 font-display text-[27px] font-semibold tracking-[-0.025em] text-[#14120f] sm:text-[32px]">
                Contact information
              </h2>

              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6b6156]">
                Choose the channel that works best for
                your question. For a project or custom
                print, include as much detail as you can.
              </p>

              <div className="mt-8 border-t border-[#d9d2c7]">
                {/* WhatsApp */}

                <div className="flex gap-4 border-b border-[#d9d2c7] py-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#ebe6dc] text-[#b4491e]">
                    <MessageCircle
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <p className="font-display text-[16px] font-semibold text-[#14120f]">
                      WhatsApp
                    </p>

                    <p className="mt-1 text-[13.5px] text-[#6b6156]">
                      +91 xxxxx xxxxx
                    </p>

                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8e8275]">
                      Quick project and order enquiries
                    </p>
                  </div>
                </div>

                {/* Phone */}

                <div className="flex gap-4 border-b border-[#d9d2c7] py-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#ebe6dc] text-[#b4491e]">
                    <Phone
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <p className="font-display text-[16px] font-semibold text-[#14120f]">
                      Phone
                    </p>

                    <p className="mt-1 text-[13.5px] text-[#6b6156]">
                      +91 xxxxx xxxxx
                    </p>

                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8e8275]">
                      Mon-Sat · 10am - 6pm
                    </p>
                  </div>
                </div>

                {/* Email */}

                <div className="flex gap-4 border-b border-[#d9d2c7] py-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#ebe6dc] text-[#b4491e]">
                    <Mail
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <p className="font-display text-[16px] font-semibold text-[#14120f]">
                      Email
                    </p>

                    <a
                      href="mailto:hello@shilpsahayak.in"
                      className="mt-1 block text-[13.5px] text-[#6b6156] transition-colors hover:text-[#b4491e]"
                    >
                      hello@shilpsahayak.in
                    </a>

                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8e8275]">
                      General and project enquiries
                    </p>
                  </div>
                </div>

                {/* Studio */}

                <div className="flex gap-4 py-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#ebe6dc] text-[#b4491e]">
                    <MapPin
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <p className="font-display text-[16px] font-semibold text-[#14120f]">
                      Studio
                    </p>

                    <p className="mt-1 text-[13.5px] leading-relaxed text-[#6b6156]">
                      PATIALA, PUNJAB 147001
                    </p>

                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8e8275]">
                      By appointment only
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical note */}

              <div className="mt-7 border-l-2 border-[#b4491e] bg-[#ebe6dc]/60 px-4 py-3.5">
                <p className="text-[12.5px] leading-relaxed text-[#6b6156]">
                  For custom printing, you can also
                  upload your model directly through our
                  custom printing service.
                </p>
              </div>
            </div>

            {/* ======================================================
                MESSAGE FORM
                ====================================================== */}

            <div className="lg:col-span-7">
              <Card className="border-[#d9d2c7] bg-white p-6 shadow-[0_8px_30px_rgba(20,18,15,0.04)] sm:p-8">
                {submitted ? (
                  <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center bg-[#edf5eb] text-[#4c7a45]">
                      <CheckCircle2
                        className="h-6 w-6"
                        aria-hidden="true"
                      />
                    </div>

                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b4491e]">
                      Message received
                    </p>

                    <h2 className="mt-3 font-display text-[28px] font-semibold tracking-[-0.025em] text-[#14120f]">
                      Thanks for reaching out.
                    </h2>

                    <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6b6156]">
                      Your message has been prepared for
                      our team. We&apos;ll get back to you as
                      soon as possible.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setSubmitted(false)
                      }
                      className="mt-7 font-mono text-[10px] uppercase tracking-[0.1em] text-[#b4491e] underline underline-offset-4 transition-colors hover:text-[#7b2f11]"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-5 border-b border-[#ebe6dc] pb-6">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b4491e]">
                          Enquiry
                        </p>

                        <h2 className="mt-2 font-display text-[25px] font-semibold tracking-[-0.02em] text-[#14120f]">
                          Send a message
                        </h2>

                        <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-[#6b6156]">
                          Tell us what you need and we&apos;ll
                          help you figure out the next step.
                        </p>
                      </div>

                      <ArrowRight
                        className="mt-1 hidden h-5 w-5 shrink-0 text-[#b4491e] sm:block"
                        aria-hidden="true"
                      />
                    </div>

                    <form
                      className="mt-7 space-y-5"
                      onSubmit={handleSubmit}
                    >
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Input
                          name="name"
                          label="Your Name"
                          placeholder="Your full name"
                          autoComplete="name"
                          required
                        />

                        <Input
                          name="email"
                          label="Email Address"
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                        />
                      </div>

                      <Input
                        name="subject"
                        label="Subject"
                        placeholder="Order Inquiry"
                        required
                      />

                      <Textarea
                        name="message"
                        label="Message"
                        placeholder="How can we help you?"
                        className="min-h-[170px]"
                        required
                      />

                      <div className="flex flex-col gap-3 border-t border-[#ebe6dc] pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-sm text-[11.5px] leading-relaxed text-[#8e8275]">
                          Please do not include passwords,
                          payment credentials or other
                          sensitive information.
                        </p>

                        <Button
                          type="submit"
                          size="lg"
                        >
                          Send Message
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CUSTOM PROJECT CTA
          ============================================================ */}

      <section className="border-t border-[#d9d2c7] bg-[#14120f]">
        <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#d9784b]">
                Have a model ready?
              </p>

              <h2 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.02em] text-[#f7f4ee] sm:text-[28px]">
                Skip the enquiry and request a custom print.
              </h2>

              <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[#f7f4ee]/55">
                Upload your STL or share your requirements
                and get an estimate or manual quotation.
              </p>
            </div>

            <a href="/custom-service">
              <Button
                size="lg"
                className="border-[#f7f4ee] bg-[#f7f4ee] text-[#14120f] hover:bg-white"
              >
                Start a custom print
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}