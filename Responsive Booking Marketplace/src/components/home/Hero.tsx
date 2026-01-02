import { Button } from '../ui/button';
import { ArrowRight, Search, Calendar as CalendarIcon, MapPin, Clock, Users, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface HeroProps {
  onSearch: (params: any) => void;
}

export function Hero({ onSearch }: HeroProps) {

  const handleSearch = () => {
  onSearch({}); // Send empty object to show all results
};

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50/50 via-white to-cyan-50/50">
      {/* Soft Gradient Blobs - Matching Reference */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gradient-to-br from-purple-200/40 via-pink-200/30 to-transparent rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-gradient-to-tl from-cyan-200/40 via-blue-200/30 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-pink-200/20 via-purple-200/20 to-transparent rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Content - Centered, Minimal */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Small Label */}
          <div className="mb-8 animate-fade-in">
            <span className="text-sm tracking-wider text-[var(--color-text-secondary)] uppercase font-bold">
              Booklyn Booking Platform
            </span>
          </div>

          {/* Large Bold Heading */}
          <h1 className="mb-8 text-[5.5rem] leading-[1] tracking-[-0.04em] animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Book Your
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Perfect Spot
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-[var(--color-text-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Discover and reserve premium salons, restaurants, and sports venues
            <br />
            across Kuala Lumpur with instant confirmation
          </p>

          {/* Futuristic Search Bar */}
          <div className="max-w-5xl mx-auto mb-16 animate-fade-in relative" style={{ animationDelay: '0.3s' }}>
            {/* Animated Gradient Border Wrapper */}
            <div className="relative p-[2px] rounded-[2rem] bg-transparent shadow-[0_0_40px_rgba(147,51,234,0.15)]">
              {/* Inner Container with Glassmorphism */}
              <div className="bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-2xl rounded-[calc(2rem-2px)] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-8 relative overflow-hidden">
                {/* Floating Glow Orbs Inside */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }} />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }} />
                

                {/* Enhanced Futuristic Search Button */}
                <div className="relative z-10">
                  <Button
                    onClick={handleSearch}
                    className="w-full h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl transition-all duration-500 shadow-[0_10px_40px_rgba(147,51,234,0.4)] hover:shadow-[0_15px_50px_rgba(147,51,234,0.6)] hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                  >
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    
                    <Search className="mr-3 w-6 h-6 relative z-10" />
                    <span className="text-lg relative z-10">Search Venues</span>
                    <ArrowRight className="ml-3 w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Floating Tech Particles */}
            <div className="absolute -top-4 -right-4 w-3 h-3 bg-purple-500 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute -bottom-4 -left-4 w-3 h-3 bg-blue-500 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 -right-2 w-2 h-2 bg-pink-500 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          </div>

          {/* Feature Pills */}

        </div>

        {/* Stats - Subtle */}
        <div className="grid grid-cols-3 gap-8 mt-32 text-center max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div>
            <div className="text-5xl mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">500+</div>
            <div className="text-sm text-[var(--color-text-secondary)]">Verified Venues</div>
          </div>
          <div>
            <div className="text-5xl mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">50k+</div>
            <div className="text-sm text-[var(--color-text-secondary)]">Happy Customers</div>
          </div>
          <div>
            <div className="text-5xl mb-3 bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">24/7</div>
            <div className="text-sm text-[var(--color-text-secondary)]">Support Available</div>
          </div>
        </div>
      </div>
    </div>
  );
}
