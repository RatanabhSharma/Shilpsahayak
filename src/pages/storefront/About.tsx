import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CheckIcon,
  FactoryIcon,
  Layers3Icon,
  RulerIcon,
  WrenchIcon,
} from 'lucide-react';

type LayoutProps = {
  children: React.ReactNode;
  className?: string;
};

type ButtonProps = LayoutProps & {
  to: string;
  variant?: 'primary' | 'secondary';
};

function Shell({ children, className = '' }: LayoutProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

function Button({ children, to, variant = 'primary' }: ButtonProps) {
  return (
    <Link
      to={to}
      className={
        variant === 'secondary'
          ? 'inline-flex items-center gap-2 border border-line-strong bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-paper'
          : 'inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-ink-700'
      }
    >
      {children}
    </Link>
  );
}

const IMG = {
  workshop:
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=1200',
  fallback:
    'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=1200',
};


const CAPABILITIES = [
  {
    icon: FactoryIcon,
    title: '3D printing',
    body:
      'Functional parts, prototypes, enclosures, fixtures and small production runs made to the dimensions that matter.',
  },
  {
    icon: WrenchIcon,
    title: 'Prototyping',
    body:
      'Turn an early CAD model into a physical part quickly, test the fit, revise the design and move toward a working build.',
  },
  {
    icon: RulerIcon,
    title: 'Design for manufacture',
    body:
      'We help identify printability issues, material constraints, tolerances and practical changes before a part goes into production.',
  },
  {
    icon: Layers3Icon,
    title: 'Small-batch production',
    body:
      'Repeatable parts without committing to expensive tooling when your quantity is still too small for conventional manufacturing.',
  },
];


const PRINCIPLES = [
  'Useful parts over decorative complexity.',
  'Clear pricing before production whenever possible.',
  'Materials chosen for the actual application.',
  'Practical tolerances rather than unrealistic specifications.',
  'Fast communication when a model needs clarification.',
  'Repeatable results for parts that need to be made again.',
];


export function About() {
  return (
    <div className="bg-paper text-ink">

      {/* ============================================================
          HERO
      ============================================================ */}

      <section className="border-b border-line bg-white">
        <Shell className="py-14 sm:py-18 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">

            <div className="lg:col-span-7">
              <p className="label-tech">
                About the workshop
              </p>

              <h1 className="mt-4 max-w-4xl font-display text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[54px] lg:text-[68px]">
                We turn digital
                <br />
                designs into
                <br />
                useful parts.
              </h1>

              <p className="mt-7 max-w-2xl text-[15.5px] leading-7 text-ink-600">
                Shilp Sahayak is a working 3D printing and
                prototyping shop built around one simple idea:
                make it easier to go from a digital model to
                something you can actually hold, test and use.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button to="/catalog">
                  Browse our prints
                  <ArrowRightIcon
                    className="h-3.5 w-3.5"
                    aria-hidden
                  />
                </Button>

                <Button
                  to="/custom-service"
                  variant="secondary"
                >
                  Start a custom print
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative overflow-hidden border border-line-strong bg-ink">
                <img
                  src={IMG.workshop}
                  onError={(event) => {
                    event.currentTarget.src = IMG.fallback;
                  }}
                  alt="3D printing workshop"
                  className="h-[320px] w-full object-cover opacity-85 sm:h-[390px]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="font-mono text-2xs uppercase tracking-[0.14em] text-paper/50">
                    Workshop / Pune
                  </p>

                  <p className="mt-1.5 font-display text-[20px] font-semibold text-paper">
                    From file to finished part.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </Shell>
      </section>


      {/* ============================================================
          INTRO / STORY
      ============================================================ */}

      <section className="border-b border-line">
        <Shell className="py-14 sm:py-18 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">

            <div className="lg:col-span-4">
              <p className="label-tech">
                What we do
              </p>

              <h2 className="mt-3 font-display text-[28px] font-semibold tracking-[-0.025em]">
                A workshop, not just a printer.
              </h2>
            </div>

            <div className="space-y-5 lg:col-span-7 lg:col-start-6">
              <p className="text-[15px] leading-7 text-ink-700">
                A 3D printer is only one part of making a good
                component. The model, orientation, material,
                tolerances, layer strategy and finishing all affect
                whether the final object is actually useful.
              </p>

              <p className="text-[15px] leading-7 text-ink-700">
                That is why our work sits between digital design
                and physical manufacturing. You can bring us a
                finished STL, ask for help with a prototype, or
                come with an idea that still needs to be worked
                out.
              </p>

              <p className="text-[15px] leading-7 text-ink-700">
                We work with engineers, students, designers,
                studios, robotics builders and makers who need
                something physical without turning every small
                project into a large manufacturing exercise.
              </p>
            </div>

          </div>
        </Shell>
      </section>


      {/* ============================================================
          CAPABILITIES
      ============================================================ */}

      <section className="border-b border-line bg-white">
        <Shell className="py-14 sm:py-18 lg:py-20">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-tech">
                Capabilities
              </p>

              <h2 className="mt-3 font-display text-[28px] font-semibold tracking-[-0.025em]">
                What happens in the workshop.
              </h2>
            </div>

            <p className="max-w-md text-[13.5px] leading-relaxed text-ink-600">
              From one-off prototypes to repeat parts, the
              workflow stays focused on practical manufacturing.
            </p>
          </div>

          <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="bg-paper p-6 sm:p-7"
                >
                  <div className="flex h-10 w-10 items-center justify-center border border-line-strong bg-white text-clay-600">
                    <Icon
                      className="h-4.5 w-4.5"
                      aria-hidden
                    />
                  </div>

                  <h3 className="mt-6 font-display text-[18px] font-semibold text-ink">
                    {item.title}
                  </h3>

                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-600">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>

        </Shell>
      </section>


      {/* ============================================================
          WORKFLOW
      ============================================================ */}

      <section className="border-b border-line">
        <Shell className="py-14 sm:py-18 lg:py-20">

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">

            <div className="lg:col-span-5">
              <p className="label-tech">
                How we work
              </p>

              <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.025em]">
                A straightforward path from CAD to part.
              </h2>

              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-600">
                The exact workflow changes with the job, but the
                goal remains the same: reduce unnecessary back and
                forth and get you a usable physical result.
              </p>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <div className="divide-y divide-line border-y border-line">

                {[
                  {
                    number: '01',
                    title: 'Share the model',
                    body:
                      'Upload your STL or other supported file, or tell us what you are trying to make.',
                  },
                  {
                    number: '02',
                    title: 'Review the requirements',
                    body:
                      'We look at dimensions, material, quantity, printability and any application-specific requirements.',
                  },
                  {
                    number: '03',
                    title: 'Print and inspect',
                    body:
                      'The part is produced, checked and prepared according to the agreed requirements.',
                  },
                  {
                    number: '04',
                    title: 'Dispatch',
                    body:
                      'Finished parts are packed and sent across India, or made ready for collection where applicable.',
                  },
                ].map((step) => (
                  <div
                    key={step.number}
                    className="grid grid-cols-[48px_1fr] gap-4 py-5"
                  >
                    <span className="font-mono text-2xs tracking-[0.12em] text-clay-600">
                      {step.number}
                    </span>

                    <div>
                      <h3 className="text-[15px] font-medium text-ink">
                        {step.title}
                      </h3>

                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}

              </div>
            </div>

          </div>

        </Shell>
      </section>


      {/* ============================================================
          PRINCIPLES
      ============================================================ */}

      <section className="bg-ink text-paper">
        <Shell className="py-14 sm:py-18 lg:py-20">

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">

            <div className="lg:col-span-5">
              <p className="font-mono text-2xs uppercase tracking-[0.14em] text-clay-200">
                Our approach
              </p>

              <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.025em]">
                Practical manufacturing decisions.
              </h2>

              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-paper/60">
                Good 3D printing is not about adding technology
                for its own sake. It is about choosing the simplest
                process that produces the right result.
              </p>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {PRINCIPLES.map((principle) => (
                  <li
                    key={principle}
                    className="flex gap-3 py-4"
                  >
                    <CheckIcon
                      className="mt-0.5 h-4 w-4 shrink-0 text-clay-300"
                      aria-hidden
                    />

                    <span className="text-[14px] leading-relaxed text-paper/75">
                      {principle}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </Shell>
      </section>


      {/* ============================================================
          CTA
      ============================================================ */}

      <section className="border-b border-line bg-white">
        <Shell className="py-14 sm:py-18 lg:py-20">
          <div className="border border-line-strong bg-paper p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">

            <div>
              <p className="label-tech">
                Have something to make?
              </p>

              <h2 className="mt-3 max-w-2xl font-display text-[28px] font-semibold tracking-[-0.025em]">
                Bring the file. We will take it from there.
              </h2>

              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-600">
                Upload a model for a custom print, or browse
                ready-to-buy parts from the catalogue.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
              <Button to="/custom-service">
                Start a custom print
                <ArrowRightIcon
                  className="h-3.5 w-3.5"
                  aria-hidden
                />
              </Button>

              <Button
                to="/contact"
                variant="secondary"
              >
                Talk to the workshop
              </Button>
            </div>

          </div>
        </Shell>
      </section>

    </div>
  );
}