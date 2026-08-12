import React, { memo } from 'react';
export function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-6">
            Crafting memories with precision.
          </h1>
          <div className="space-y-6 text-charcoal-light text-lg leading-relaxed">
            <p>
              Shilp Sahayak began in a small Mumbai studio with a simple idea:
              what if we could turn digital memories and ideas into tangible,
              heirloom-quality objects?
            </p>
            <p>
              We are not an industrial factory. We are a boutique 3D printing
              studio that treats every print as a piece of art. From the careful
              calibration of our printers to the hand-finishing of our
              lithophane lamps, we blend modern engineering with artisan care.
            </p>
            <p>
              Our name, "Shilp Sahayak" (Craft Assistant), reflects our mission.
              We are here to assist you in bringing your ideas to life, whether
              it's a personalized gift for a loved one or a custom prototype for
              your next big project.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <img
            src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=600"
            alt="3D Printer in action"
            className="rounded-2xl w-full h-64 object-cover" />
          
          <img
            src="https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?auto=format&fit=crop&q=80&w=600"
            alt="Finished 3D printed vase"
            className="rounded-2xl w-full h-64 object-cover mt-8" />
          
        </div>
      </div>
    </div>);

}