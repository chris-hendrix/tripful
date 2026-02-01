"use client"

/**
 * Trip Preview Screen (Before RSVP)
 *
 * Design: Modern Travel Editorial
 * - Hero image with gradient overlay
 * - Large, inviting RSVP actions
 * - Organizer showcase with profile images
 * - Elegant spacing and typography
 */

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function TripPreviewScreen() {
  const trip = {
    name: "Bachelor Party Weekend",
    destination: "Miami Beach, FL",
    startDate: "Oct 12, 2026",
    endDate: "Oct 14, 2026",
    description: "Three days of sun, fun, and unforgettable memories. We've got beach clubs, boat day, and nightlife planned. Optional activities for those who want a more chill vibe.",
    coverImage: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be",
    organizers: [
      { name: "Mike Johnson", avatar: "https://avatar.vercel.sh/mike" },
      { name: "Sarah Chen", avatar: "https://avatar.vercel.sh/sarah" }
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg" />
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Tripful
            </h1>
          </div>
          <Button variant="outline" className="rounded-full">
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero section with cover image */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src={trip.coverImage}
          alt={trip.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Floating badge */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
          <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 px-4 py-2 text-sm font-medium">
            You're invited!
          </Badge>
        </div>

        {/* Trip title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-2xl mx-auto">
            <h1
              className="text-5xl lg:text-7xl font-serif mb-4 leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {trip.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-lg animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{trip.destination}</span>
              </div>
              <div className="w-1 h-1 bg-white/60 rounded-full" />
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{trip.startDate} - {trip.endDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
            {/* Description */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h2 className="text-2xl font-semibold text-slate-900">About this trip</h2>
              <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                {trip.description}
              </p>
            </div>

            {/* Organizers */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <h2 className="text-2xl font-semibold text-slate-900">Organized by</h2>
              <div className="flex flex-wrap gap-4">
                {trip.organizers.map((organizer) => (
                  <div
                    key={organizer.name}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 pr-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <img
                      src={organizer.avatar}
                      alt={organizer.name}
                      className="w-12 h-12 rounded-full ring-2 ring-blue-100"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{organizer.name}</p>
                      <p className="text-sm text-slate-500">Organizer</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Placeholder for locked itinerary */}
            <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-12 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  RSVP to see the full itinerary
                </h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Let the organizers know if you're coming to unlock access to the day-by-day schedule, activities, and all trip details.
                </p>
              </div>
            </div>

          {/* RSVP Card */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  Will you be attending?
                </h3>
                <p className="text-sm text-slate-600">
                  Your response helps organizers plan ahead
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  I'm going
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 border-slate-300 hover:bg-slate-50 rounded-xl font-medium"
                >
                  Maybe
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 border-slate-300 hover:bg-slate-50 rounded-xl font-medium"
                >
                  Can't go
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">7 people attending</span>
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <img
                        key={i}
                        src={`https://avatar.vercel.sh/person${i}`}
                        alt=""
                        className="w-8 h-8 rounded-full ring-2 ring-white"
                      />
                    ))}
                    <div className="w-8 h-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                      +3
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Share card */}
            <div className="mt-6 bg-gradient-to-br from-slate-100 to-blue-100/50 rounded-2xl border border-slate-200 p-6 space-y-4">
              <h4 className="font-semibold text-slate-900">Know someone else?</h4>
              <p className="text-sm text-slate-600">
                Share this trip with friends who should join
              </p>
              <Button
                variant="outline"
                className="w-full h-10 bg-white hover:bg-slate-50 rounded-xl font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share trip
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
