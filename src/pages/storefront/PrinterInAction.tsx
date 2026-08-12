import React from 'react';
export function PrinterInAction() {
  const videos = [
  {
    title: 'Printing a Lithophane Lamp',
    image:
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800',
    duration: '0:45'
  },
  {
    title: 'Precision Detail on Ganesha Idol',
    image:
    'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?auto=format&fit=crop&q=80&w=800',
    duration: '1:12'
  },
  {
    title: 'Dual-Color Extrusion Process',
    image:
    'https://images.unsplash.com/photo-1580130379624-3a06943c6462?auto=format&fit=crop&q=80&w=800',
    duration: '0:58'
  },
  {
    title: 'Finishing & Quality Check',
    image:
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=800',
    duration: '2:15'
  }];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-4">
          Printer in Action
        </h1>
        <p className="text-lg text-charcoal-light max-w-2xl mx-auto">
          Take a peek inside our studio. Watch how we turn digital designs into
          physical, heirloom-quality objects layer by layer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {videos.map((video, i) =>
        <div key={i} className="group cursor-pointer">
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-surface-dark mb-4">
              <img
              src={video.image}
              alt={video.title}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
            
              <div className="absolute inset-0 bg-charcoal/20 group-hover:bg-charcoal/40 transition-colors flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-brand-500 transform group-hover:scale-110 transition-transform">
                  <svg
                  className="w-8 h-8 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24">
                  
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 bg-charcoal/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded">
                {video.duration}
              </div>
            </div>
            <h3 className="font-serif font-semibold text-xl text-charcoal group-hover:text-brand-500 transition-colors">
              {video.title}
            </h3>
          </div>
        )}
      </div>
    </div>);

}