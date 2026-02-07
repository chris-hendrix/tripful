"use client";

/**
 * Mobile Dashboard View
 *
 * Design: Modern Travel Editorial (Mobile-First)
 * - Card-based layout for upcoming and past trips
 * - Large touch targets for mobile interaction
 * - Stacked navigation with bottom tab bar
 * - Optimized for one-handed use
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  organizers: { name: string; avatar: string }[];
  isOrganizing: boolean;
  rsvpStatus?: "going" | "maybe" | "not_going";
  eventCount: number;
}

export default function MobileDashboard() {
  const upcomingTrips: Trip[] = [
    {
      id: "1",
      name: "Bachelor Party Weekend",
      destination: "Miami Beach, FL",
      startDate: "Oct 12",
      endDate: "Oct 14, 2026",
      coverImage:
        "https://images.unsplash.com/photo-1533929736458-ca588d08c8be",
      organizers: [
        { name: "Mike Johnson", avatar: "https://avatar.vercel.sh/mike" },
      ],
      isOrganizing: false,
      rsvpStatus: "going",
      eventCount: 15,
    },
    {
      id: "2",
      name: "Ski Trip - Whistler",
      destination: "Whistler, BC",
      startDate: "Dec 20",
      endDate: "Dec 27, 2026",
      coverImage: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256",
      organizers: [
        { name: "Sarah Chen", avatar: "https://avatar.vercel.sh/sarah" },
        { name: "Tom Rodriguez", avatar: "https://avatar.vercel.sh/tom" },
      ],
      isOrganizing: true,
      rsvpStatus: "going",
      eventCount: 8,
    },
    {
      id: "3",
      name: "Emily's Wedding",
      destination: "Napa Valley, CA",
      startDate: "Jun 5",
      endDate: "Jun 7, 2027",
      coverImage:
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed",
      organizers: [
        { name: "Emily Parker", avatar: "https://avatar.vercel.sh/emily" },
      ],
      isOrganizing: false,
      rsvpStatus: "maybe",
      eventCount: 0,
    },
  ];

  const pastTrips: Trip[] = [
    {
      id: "4",
      name: "Vegas Bachelor Party",
      destination: "Las Vegas, NV",
      startDate: "Mar 15",
      endDate: "Mar 18, 2026",
      coverImage:
        "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d",
      organizers: [
        { name: "Mike Johnson", avatar: "https://avatar.vercel.sh/mike" },
      ],
      isOrganizing: false,
      rsvpStatus: "going",
      eventCount: 12,
    },
  ];

  const getRsvpBadge = (status?: string) => {
    switch (status) {
      case "going":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            Going
          </Badge>
        );
      case "maybe":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            Maybe
          </Badge>
        );
      case "not_going":
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-300">
            Not going
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className="text-3xl font-serif tracking-tight text-slate-900"
                style={{ fontFamily: "Playfair Display, serif" }}
              >
                My Trips
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {upcomingTrips.length} upcoming
              </p>
            </div>

            <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search trips..."
              className="w-full h-11 pl-10 pr-4 bg-slate-100 rounded-xl border-0 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Upcoming trips */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Upcoming trips
          </h2>

          <div className="space-y-4">
            {upcomingTrips.map((trip, index) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm active:scale-[0.98] transition-transform animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Cover image */}
                {trip.coverImage && (
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={trip.coverImage}
                      alt={trip.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Badges overlay */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {trip.isOrganizing && (
                        <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30">
                          Organizing
                        </Badge>
                      )}
                      {trip.rsvpStatus && getRsvpBadge(trip.rsvpStatus)}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {trip.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>{trip.destination}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>
                        {trip.startDate} - {trip.endDate}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {trip.organizers.slice(0, 3).map((org) => (
                          <img
                            key={org.name}
                            src={org.avatar}
                            alt={org.name}
                            className="w-6 h-6 rounded-full ring-2 ring-white"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-600">
                        {trip.organizers[0].name}
                        {trip.organizers.length > 1 &&
                          ` +${trip.organizers.length - 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <span>
                        {trip.eventCount === 0
                          ? "No events yet"
                          : `${trip.eventCount} events`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past trips */}
        {pastTrips.length > 0 && (
          <section className="animate-in fade-in duration-1000 delay-500">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Past trips
            </h2>

            <div className="space-y-4">
              {pastTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white/60 rounded-2xl overflow-hidden border border-slate-200 active:scale-[0.98] transition-transform"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex gap-3">
                      {trip.coverImage && (
                        <img
                          src={trip.coverImage}
                          alt={trip.name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 mb-1 truncate">
                          {trip.name}
                        </h3>
                        <p className="text-sm text-slate-600 truncate mb-2">
                          {trip.destination}
                        </p>
                        <p className="text-xs text-slate-500">
                          {trip.startDate} - {trip.endDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating action button */}
      <button className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-2xl shadow-blue-500/40 active:scale-95 transition-transform flex items-center justify-center">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="flex items-center justify-around px-4 py-3">
          <button className="flex flex-col items-center gap-1 text-blue-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            <span className="text-xs font-medium">Trips</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-slate-400 active:text-slate-600">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-xs font-medium">Search</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-slate-400 active:text-slate-600">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="text-xs font-medium">Alerts</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-slate-400 active:text-slate-600">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
