import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const mockups = [
    {
      title: 'Authentication',
      description: 'Phone verification flow (2 steps)',
      href: '/auth',
      emoji: '🔐',
    },
    {
      title: 'Mobile Dashboard',
      description: 'Trip list with cover images and RSVP status',
      href: '/dashboard',
      emoji: '📱',
    },
    {
      title: 'Create Trip',
      description: 'Multi-step form with live preview',
      href: '/create-trip',
      emoji: '✨',
    },
    {
      title: 'Trip Preview',
      description: 'Public view before RSVP',
      href: '/preview',
      emoji: '👀',
    },
    {
      title: 'Itinerary View',
      description: 'Day-by-day timeline (core feature)',
      href: '/itinerary',
      emoji: '📅',
    },
    {
      title: 'Create Event',
      description: 'Add travel, meals, and activities',
      href: '/create-event',
      emoji: '➕',
    },
    {
      title: 'Transportation',
      description: 'Add traveler arrivals/departures',
      href: '/member-travel',
      emoji: '🛫',
    },
    {
      title: 'Accommodation',
      description: 'Add hotels and lodging',
      href: '/accommodation',
      emoji: '🏨',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl" />
              <div>
                <h1 className="text-4xl font-serif tracking-tight">Tripful</h1>
                <p className="text-sm text-slate-600">Design Mockups</p>
              </div>
            </div>
            <Badge variant="secondary">v1.0</Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mb-12">
          <h2 className="text-5xl font-serif leading-tight tracking-tight text-slate-900 mb-4">
            Modern Travel Editorial
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed">
            Production-grade UI mockups for collaborative trip planning. Click any screen below to
            view the full interactive mockup.
          </p>
        </div>

        {/* Mockup grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockups.map((mockup, index) => (
            <Link
              key={mockup.href}
              href={mockup.href}
              className="group block bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{mockup.emoji}</span>
                  <svg
                    className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{mockup.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{mockup.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
