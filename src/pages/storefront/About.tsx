import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Factory,
  Compass,
} from 'lucide-react';

import { Button } from '../../components/ui';

const CAPABILITIES = [
  {
    icon: Factory,
    title: 'Precision 3D Fabrication',
    body: 'Industrial FDM and SLA additive manufacturing with micron-level tolerances across PLA, PETG, ABS, and UV resins.',
  },
  {
    icon: Cpu,
    title: 'Robotics & Mechanical Prototyping',
    body: 'Custom gears, robotic chassis, modular brackets, and sensor enclosures fabricated for college research, makers, and startups.',
  },
  {
    icon: Compass,
    title: 'Design for Additive (DFAM)',
    body: 'Pre-flight model analysis, overhang optimization, wall-thickness reinforcement, and infill geometry tuning to maximize part strength.',
  },
  {
    icon: Layers,
    title: 'Small-Batch Production',
    body: 'Repeatable, tooling-free small runs (10 to 500+ pieces) with rapid turnaround, avoiding high injection molding startup costs.',
  },
];

const PRINCIPLES = [
  'Transparent, weight-based pricing (₹4.5/g vs industry ₹10–15/g).',
  'Make in India ethos engineered at our Patiala studio.',
  'Application-specific material matching (heat, impact, or aesthetic finish).',
  'Strict dimensional verification before packaging & dispatch.',
  '100% confidential handling of customer proprietary CAD files.',
  'Shock-proof multi-layer packing with pan-India tracked delivery.',
];

export function About() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-charcoal">
      {/* Hero Header */}
      <section className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-700">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                <span>Patiala Engineering Studio</span>
              </div>

              <h1 className="font-serif text-3xl font-bold tracking-tight text-charcoal sm:text-5xl lg:text-6xl leading-[1.1]">
                Turning Digital Imaginations Into{' '}
                <span className="text-brand-500">Precision Reality.</span>
              </h1>

              <p className="text-sm text-charcoal-light sm:text-base leading-relaxed max-w-2xl">
                Shilp Sahayak is a custom 3D printing and digital fabrication studio founded in Patiala, Punjab. We bridge the gap between abstract computer models and physical reality with one simple promise: <strong className="text-charcoal font-semibold">&ldquo;If you can imagine it, we can print it.&rdquo;</strong>
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/catalog">
                  <Button size="lg" className="font-bold shadow-md shadow-brand-500/20">
                    Browse Studio Pieces
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/custom-service">
                  <Button size="lg" variant="outline" className="font-bold">
                    Start Custom Print
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-[#0b0f17] p-8 text-white shadow-xl">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
                
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 block mb-2">
                  The Shilp Sahayak Promise
                </span>
                
                <h3 className="font-serif text-2xl font-bold text-white mb-4">
                  Democratizing Additive Fabrication for India
                </h3>

                <p className="text-xs text-zinc-300 leading-relaxed mb-6">
                  Too often, students, engineers, and creators are held back by exorbitant 3D printing charges. By optimizing our Patiala print farm and slicer pipelines, we deliver top-tier prints at just ₹4.5/gram.
                </p>

                <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-5 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Base Rate</span>
                    <span className="font-bold text-brand-400 text-base">₹4.5 / gram</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Tolerance</span>
                    <span className="font-bold text-white text-base">±0.1 mm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story & Ethos Section */}
      <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 items-start">
          <div className="lg:col-span-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
              Our Journey & Roots
            </span>
            <h2 className="mt-2 font-serif text-2xl font-bold text-charcoal sm:text-3xl">
              Engineered in Patiala, Serving Creators Nationwide.
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-4 text-xs sm:text-sm text-charcoal-light leading-relaxed">
            <p>
              A 3D printer is only as good as the engineering discipline behind it. Orientation, infill patterns, cooling curves, nozzle temperatures, and mechanical calibration dictate whether a printed gear can withstand high torque or if an architectural scale model will display crisp facade details.
            </p>
            <p>
              At Shilp Sahayak, our workshop combines cutting-edge additive hardware with hands-on post-processing expertise. Whether you provide a finalized STL file, a CAD assembly from SolidWorks/Fusion 360, or simply reference photographs of a discontinued mechanical part, we help translate your vision into a durable, tangible part.
            </p>
            <p>
              We proudly support engineering students, architectural firms, medical researchers, robotics teams, artisanal lamp designers, and DIY enthusiasts across every corner of India.
            </p>
          </div>
        </div>
      </section>

      {/* Workshop Capabilities */}
      <section className="border-y border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
              Core Studio Pillars
            </span>
            <h2 className="mt-1 font-serif text-2xl font-bold text-charcoal sm:text-4xl">
              Comprehensive Additive Solutions
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-charcoal-light">
              From one-off mechanical prototypes to full product manufacturing batches.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="rounded-3xl border border-zinc-200 bg-[#faf9f6] p-7 transition-all hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-5">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-charcoal mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-charcoal-light leading-relaxed">
                    {cap.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Engineering Principles (Dark Theme) */}
      <section className="border-b border-zinc-800 bg-[#0b0f17] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 block">
                Quality & Standards
              </span>
              <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
                The Workshop Principles We Stand By
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                We believe in straightforward engineering without hidden surcharges or compromises on structural integrity.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {PRINCIPLES.map((principle, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-400 mt-0.5" />
                    <span className="text-xs text-zinc-300 leading-relaxed font-medium">
                      {principle}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10">
          <div className="rounded-3xl border border-zinc-200 bg-[#faf9f6] p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                Ready to Fabricate?
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold text-charcoal sm:text-3xl">
                Have a 3D File Ready to Print?
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-charcoal-light leading-relaxed">
                Upload your STL file to calculate exact volume, weight, and price in seconds, or speak with our engineers for custom projects.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Link to="/custom-service">
                <Button size="lg" className="font-bold shadow-md shadow-brand-500/20">
                  Upload 3D Model
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="font-bold">
                  Contact Studio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}