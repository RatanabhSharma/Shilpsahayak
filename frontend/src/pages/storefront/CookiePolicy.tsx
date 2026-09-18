import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

/* ============================================================
   COOKIE POLICY — Shilp Sahayak
   Last updated: September 2026
   ============================================================ */

export function CookiePolicy() {
  return (
    <div className="min-h-screen bg-paper text-ink pt-16 lg:pt-20">
      {/* Page Header */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Cookie className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Legal · Cookies
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Cookie Policy
              </h1>
            </div>
          </div>
          <p className="font-sans text-sm text-muted max-w-2xl leading-relaxed">
            This policy explains how Shilp Sahayak uses cookies and browser storage on our
            Platform. We keep things minimal — your privacy is important to us.
          </p>
          <p className="mt-3 font-mono text-xs text-muted">
            Last updated: <strong>September 2026</strong>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <article className="space-y-10 max-w-3xl">

          {/* What is a Cookie */}
          <section className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-ink mb-3 pb-2 border-b border-line">
              1. What Are Cookies?
            </h2>
            <div className="space-y-3 font-sans text-sm text-muted leading-relaxed">
              <p>
                Cookies are small text files that a website saves on your device when you visit
                it. They help websites remember information about your visit, such as your
                preferred language and other settings. Modern browsers also use related
                technologies like <strong className="text-ink">localStorage</strong> and{' '}
                <strong className="text-ink">IndexedDB</strong> for similar purposes.
              </p>
            </div>
          </section>

          {/* What We Use */}
          <section className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-ink mb-3 pb-2 border-b border-line">
              2. What Storage We Use
            </h2>
            <div className="space-y-4 font-sans text-sm text-muted leading-relaxed">
              <p>
                Our Platform uses <strong className="text-ink">no tracking cookies,
                advertising cookies, or analytics cookies.</strong> We have intentionally
                avoided integrating Google Analytics, Meta Pixel, or any behavioural
                advertising networks.
              </p>

              <p>The only browser storage we use is:</p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-shell text-left">
                      <th className="border border-line px-3 py-2 font-bold text-ink">Storage</th>
                      <th className="border border-line px-3 py-2 font-bold text-ink">Provider</th>
                      <th className="border border-line px-3 py-2 font-bold text-ink">Purpose</th>
                      <th className="border border-line px-3 py-2 font-bold text-ink">Category</th>
                      <th className="border border-line px-3 py-2 font-bold text-ink">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[
                      [
                        'localStorage / IndexedDB',
                        'Google Firebase',
                        'Stores your authentication session token so you stay logged in between visits',
                        'Strictly Necessary (Functional)',
                        'Until you log out or clear site data',
                      ],
                      [
                        'localStorage: cart state',
                        'Shilp Sahayak (Zustand)',
                        'Saves your shopping cart items so they persist across page refreshes',
                        'Strictly Necessary (Functional)',
                        'Until you clear site data',
                      ],
                    ].map(([storage, provider, purpose, category, expires]) => (
                      <tr key={storage} className="hover:bg-shell/40">
                        <td className="border border-line px-3 py-2 font-medium text-ink">{storage}</td>
                        <td className="border border-line px-3 py-2 text-muted">{provider}</td>
                        <td className="border border-line px-3 py-2 text-muted">{purpose}</td>
                        <td className="border border-line px-3 py-2">
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 font-mono text-[10px] font-bold">
                            {category}
                          </span>
                        </td>
                        <td className="border border-line px-3 py-2 text-muted">{expires}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs">
                <p className="font-bold text-emerald-800 mb-1">
                  ✓ No Consent Required for Strictly Necessary Storage
                </p>
                <p className="text-emerald-700 leading-relaxed">
                  Under India&rsquo;s IT Act and DPDP Act guidance, &ldquo;strictly necessary&rdquo;
                  functional storage (authentication and shopping cart persistence) does not require
                  explicit cookie consent, as it is essential for the service you have requested.
                  We have no optional cookies or trackers that would require your consent.
                </p>
              </div>
            </div>
          </section>

          {/* Third Parties */}
          <section className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-ink mb-3 pb-2 border-b border-line">
              3. Third-Party Services
            </h2>
            <div className="space-y-3 font-sans text-sm text-muted leading-relaxed">
              <p>
                Our Platform is built on the following third-party infrastructure. Each may set
                their own operational cookies/headers for security and performance:
              </p>
              <ul className="space-y-2 text-xs">
                {[
                  {
                    name: 'Google Firebase',
                    type: 'Auth & database',
                    link: 'https://policies.google.com/privacy',
                  },
                  {
                    name: 'Vercel',
                    type: 'Hosting & CDN (may set __vercel_live_token for previews)',
                    link: 'https://vercel.com/legal/privacy-policy',
                  },
                  {
                    name: 'Cloudflare',
                    type: 'CDN edge security (may set __cf_bm for bot detection)',
                    link: 'https://www.cloudflare.com/privacypolicy/',
                  },
                ].map((item) => (
                  <li key={item.name} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
                    <span className="font-bold text-ink w-40 shrink-0">{item.name}</span>
                    <span className="text-muted flex-1">{item.type}</span>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline font-mono text-[10px] shrink-0"
                    >
                      Privacy Policy ↗
                    </a>
                  </li>
                ))}
              </ul>
              <p>
                We do not embed YouTube videos, Google Maps, Meta widgets, or other third-party
                content that would independently set tracking cookies.
              </p>
            </div>
          </section>

          {/* How to Control */}
          <section className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-ink mb-3 pb-2 border-b border-line">
              4. How to Control or Delete Storage
            </h2>
            <div className="space-y-3 font-sans text-sm text-muted leading-relaxed">
              <p>
                You can clear all browser storage for our site at any time. This will sign you
                out of your account and clear your cart. Instructions by browser:
              </p>
              <ul className="space-y-1.5 text-xs">
                {[
                  ['Chrome / Brave', 'Settings → Privacy & Security → Clear browsing data → Cookies and site data → shilpsahayak.com'],
                  ['Firefox', 'Settings → Privacy & Security → Cookies and Site Data → Manage Exceptions → Clear all for site'],
                  ['Safari (iOS/macOS)', 'Settings → Safari → Advanced → Website Data → Find site → Delete'],
                  ['Edge', 'Settings → Privacy, search and services → Choose what to clear → Cookies and other site data'],
                ].map(([browser, path]) => (
                  <li key={browser} className="rounded-xl border border-line bg-white p-3">
                    <p className="font-bold text-ink">{browser}</p>
                    <p className="text-muted mt-0.5">{path}</p>
                  </li>
                ))}
              </ul>
              <p>
                Note: Clearing site data will log you out of your Shilp Sahayak account and
                remove any unsaved cart items. Your order history is safely stored in our
                database and will be available when you log back in.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-ink mb-3 pb-2 border-b border-line">
              5. Contact
            </h2>
            <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 text-xs space-y-2">
              <p className="font-bold text-ink text-sm">Questions about cookies?</p>
              <p>
                <a href="mailto:hello@shilpsahayak.com" className="text-accent font-mono hover:underline">
                  hello@shilpsahayak.com
                </a>
              </p>
              <p className="text-muted">
                Shilp Sahayak · Patiala, Punjab — 147001, India
              </p>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-line text-xs font-sans">
            <Link to="/privacy-policy" className="text-accent hover:underline font-medium">
              Privacy Policy →
            </Link>
            <Link to="/terms-and-conditions" className="text-accent hover:underline font-medium">
              Terms &amp; Conditions →
            </Link>
            <Link to="/refund-policy" className="text-accent hover:underline font-medium">
              Refund Policy →
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

