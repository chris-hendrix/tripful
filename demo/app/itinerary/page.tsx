'use client';

/**
 * Trip Itinerary View (Day-by-Day)
 *
 * Design: Modern Travel Editorial
 * - Timeline-based layout with date headers
 * - Color-coded event type badges
 * - Expandable event cards with details
 * - Floating action button for adding events
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type EventType = 'arrival' | 'departure' | 'travel' | 'accommodation' | 'meal' | 'activity';

interface Traveler {
  name: string;
  avatar: string;
}

interface TripEvent {
  id: string;
  type: EventType;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
  meetupLocation?: string;
  meetupTime?: string;
  description?: string;
  links?: string[];
  createdBy: Traveler;
  isOptional?: boolean;
  travelerNoLongerAttending?: boolean;
  checkInTime?: string; // For accommodations
  checkOutTime?: string; // For accommodations
}

const eventTypeConfig = {
  arrival: {
    label: 'Arrival',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '🛬',
  },
  departure: {
    label: 'Departure',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '🛫',
  },
  travel: {
    label: 'Travel',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '✈️',
  },
  accommodation: {
    label: 'Accommodation',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: '🏨',
  },
  meal: {
    label: 'Meal',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: '🍽️',
  },
  activity: {
    label: 'Activity',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: '🎉',
  },
};

export default function ItineraryView() {
  const [timezone, setTimezone] = useState<'trip' | 'local'>('trip');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Demo users
  const mike = { name: 'Mike Johnson', avatar: 'https://avatar.vercel.sh/mike' };
  const sarah = { name: 'Sarah Chen', avatar: 'https://avatar.vercel.sh/sarah' };
  const tom = { name: 'Tom Rodriguez', avatar: 'https://avatar.vercel.sh/tom' };
  const alex = { name: 'Alex Kim', avatar: 'https://avatar.vercel.sh/alex' };

  const events: TripEvent[] = [
    {
      id: '1a',
      type: 'arrival',
      title: 'AA 2451',
      date: 'Oct 12, 2026',
      time: '10:30 AM',
      location: 'JFK → MIA',
      description: 'American Airlines flight. Gate B12, Terminal 4. Check in 24hrs before.',
      links: ['https://aa.com/checkin/123'],
      createdBy: mike,
    },
    {
      id: '1b',
      type: 'arrival',
      title: 'AA 2451',
      date: 'Oct 12, 2026',
      time: '10:30 AM',
      location: 'JFK → MIA',
      description: 'American Airlines flight. Gate B12, Terminal 4.',
      links: ['https://aa.com/checkin/123'],
      createdBy: sarah,
    },
    {
      id: '1c',
      type: 'arrival',
      title: 'UA 1845',
      date: 'Oct 12, 2026',
      time: '2:15 PM',
      location: 'ORD → MIA',
      description: 'United Airlines flight from Chicago. Terminal 1.',
      links: ['https://united.com/checkin/456'],
      createdBy: alex,
    },
    {
      id: '2',
      type: 'accommodation',
      title: 'Fontainebleau Miami Beach',
      date: 'Oct 12, 2026',
      endDate: 'Oct 13, 2026',
      allDay: true,
      location: '4441 Collins Ave, Miami Beach, FL',
      description: 'Oceanview rooms on floors 8-10. Confirmation #MB-2847.',
      links: ['https://fontainebleau.com/booking/MB-2847'],
      createdBy: mike,
      checkInTime: '3:00 PM',
      checkOutTime: '11:00 AM',
    },
    {
      id: '3',
      type: 'meal',
      title: "Dinner at Joe's Stone Crab",
      date: 'Oct 12, 2026',
      time: '7:30 PM',
      location: '11 Washington Ave, Miami Beach',
      description: 'Reservation for 8 people. Dress code: Smart casual.',
      links: ['https://joesstonecrab.com'],
      createdBy: sarah,
    },
    {
      id: '4',
      type: 'activity',
      title: 'Private Yacht Charter',
      date: 'Oct 13, 2026',
      time: '11:00 AM',
      endTime: '3:00 PM',
      location: 'Miami Beach Marina',
      meetupLocation: 'Hotel lobby',
      meetupTime: '10:30 AM',
      description:
        '4-hour private yacht cruise. Includes drinks, snacks, water toys. Bring sunscreen!',
      links: ['https://miamiyachts.com/charter/789'],
      createdBy: tom,
      isOptional: true,
    },
    {
      id: '5',
      type: 'activity',
      title: 'Beach Club Day',
      date: 'Oct 13, 2026',
      time: '11:00 AM',
      location: 'Nikki Beach',
      description: 'Alternative option for those not doing the yacht. Reserved daybed section.',
      createdBy: alex,
      isOptional: true,
      travelerNoLongerAttending: true,
    },
    {
      id: '6',
      type: 'travel',
      title: 'Drive to Key West',
      date: 'Oct 13, 2026',
      time: '4:00 PM',
      location: 'Miami → Key West',
      description: '3.5 hour scenic drive down the Overseas Highway. Bring snacks for the road!',
      links: ['https://maps.google.com'],
      createdBy: mike,
    },
    {
      id: '7',
      type: 'accommodation',
      title: 'The Marker Key West',
      date: 'Oct 13, 2026',
      endDate: 'Oct 15, 2026',
      allDay: true,
      location: '200 William St, Key West, FL',
      description: 'Waterfront hotel with pool. Confirmation #KW-9921.',
      links: ['https://themarkerkewest.com/booking'],
      createdBy: mike,
      checkInTime: '8:00 PM',
      checkOutTime: '10:00 AM',
    },
    {
      id: '8',
      type: 'meal',
      title: 'Dinner at Latitudes',
      date: 'Oct 13, 2026',
      time: '9:00 PM',
      endTime: '11:00 PM',
      location: 'Sunset Key, Key West',
      description: 'Waterfront dining on a private island. Boat shuttle from marina included.',
      links: ['https://latitudeskeywest.com'],
      createdBy: sarah,
    },
    {
      id: '9',
      type: 'activity',
      title: 'Duval Street Bar Crawl',
      date: 'Oct 14, 2026',
      time: '8:00 PM',
      location: 'Duval Street, Key West',
      description:
        "Hit the famous bars: Sloppy Joe's, Captain Tony's, Irish Kevin's. Meeting at Sloppy Joe's.",
      createdBy: tom,
    },
    {
      id: '10',
      type: 'travel',
      title: 'Drive back to Miami',
      date: 'Oct 15, 2026',
      time: '10:00 AM',
      location: 'Key West → Miami',
      description: 'Head back to Miami for evening flights. Allow 4 hours with stops.',
      createdBy: mike,
    },
    {
      id: '11',
      type: 'departure',
      title: 'UA 1523',
      date: 'Oct 15, 2026',
      time: '6:00 PM',
      allDay: false,
      location: 'MIA → EWR',
      description:
        'United Airlines flight to Newark. Check-in opens 24hrs before. Terminal 2, Gate D8.',
      createdBy: tom,
    },
    {
      id: '12a',
      type: 'departure',
      title: 'AA 2452',
      date: 'Oct 15, 2026',
      time: '7:15 PM',
      allDay: false,
      location: 'MIA → JFK',
      description:
        'American Airlines flight back to JFK. Same airline as arrival flight. Terminal 3.',
      createdBy: mike,
    },
    {
      id: '12b',
      type: 'departure',
      title: 'AA 2452',
      date: 'Oct 15, 2026',
      time: '7:15 PM',
      allDay: false,
      location: 'MIA → JFK',
      description: 'American Airlines flight back to JFK. Terminal 3.',
      createdBy: sarah,
    },
  ];

  // Expand multi-day events into individual day entries
  const expandMultiDayEvents = (events: TripEvent[]): TripEvent[] => {
    const expanded: TripEvent[] = [];

    events.forEach((event) => {
      if (event.endDate) {
        // Multi-day event - create entry for each day
        const start = new Date(event.date);
        const end = new Date(event.endDate);
        const days: Date[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push(new Date(d));
        }

        days.forEach((d, index) => {
          expanded.push({
            ...event,
            date: d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            // Track if this is first/last day for accommodations
            isFirstDay: index === 0,
            isLastDay: index === days.length - 1,
          } as TripEvent & { isFirstDay?: boolean; isLastDay?: boolean });
        });
      } else {
        // Single day event
        expanded.push(event);
      }
    });

    return expanded;
  };

  const groupByDay = (events: TripEvent[]) => {
    const expandedEvents = expandMultiDayEvents(events);
    const grouped = expandedEvents.reduce(
      (acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      },
      {} as Record<string, TripEvent[]>
    );

    // Sort events within each day: all-day first, then by time
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        // All-day events come first
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;

        // Both all-day or both timed - maintain order or sort by time
        if (!a.allDay && !b.allDay && a.time && b.time) {
          return a.time.localeCompare(b.time);
        }

        return 0;
      });
    });

    return grouped;
  };

  const extractCityFromLocation = (location?: string): string => {
    if (!location) return 'No location';

    // If it's a travel event with arrow notation, return as-is
    if (location.includes('→')) return location;

    // Try to extract city from full address
    // Common patterns: "City, State" or "Address, City, State"
    const parts = location.split(',').map((s) => s.trim());

    // For "Miami Beach Marina" or "Duval Street, Key West"
    if (parts.length >= 2) {
      // Return the second-to-last part (usually the city)
      return parts[parts.length - 2];
    }

    // For simple locations like "Nikki Beach", return first part
    return parts[0];
  };

  const groupEventsByLocation = (dayEvents: TripEvent[]) => {
    const grouped: Record<string, TripEvent[]> = {};

    dayEvents.forEach((event) => {
      const city = extractCityFromLocation(event.location);
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push(event);
    });

    return grouped;
  };

  const separateEventsByType = (dayEvents: TripEvent[]) => {
    const accommodations = dayEvents.filter((e) => e.type === 'accommodation');
    const arrivals = dayEvents.filter((e) => e.type === 'arrival');
    const departures = dayEvents.filter((e) => e.type === 'departure');
    const regularEvents = dayEvents.filter(
      (e) => e.type !== 'accommodation' && e.type !== 'arrival' && e.type !== 'departure'
    );

    return { accommodations, arrivals, departures, regularEvents };
  };

  const eventsByDay = groupByDay(events);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg" />
              <h1
                className="text-2xl font-semibold tracking-tight"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Bachelor Party Weekend
              </h1>
            </div>
            <Button variant="outline" className="rounded-full">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
              Trip settings
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Timezone toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setTimezone('trip')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timezone === 'trip'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Trip time
                </button>
                <button
                  onClick={() => setTimezone('local')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timezone === 'local'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My time
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Showing times in <span className="font-medium text-slate-700">Eastern Time (ET)</span>
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Trip meta */}
        <div className="mb-12 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-slate-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span>Miami Beach, FL</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-slate-400 rounded-full" />
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Oct 12-14, 2026</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-slate-400 rounded-full" />
            <span>{events.length} events</span>
          </div>
        </div>

        {/* Itinerary timeline */}
        <div className="space-y-12">
          {Object.entries(eventsByDay).map(([date, dayEvents], dayIndex) => (
            <div
              key={date}
              className="animate-in fade-in slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: `${dayIndex * 100}ms` }}
            >
              {/* Date header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-blue-500/30">
                    <span className="text-2xl font-bold">{new Date(date).getDate()}</span>
                    <span className="text-xs uppercase tracking-wide">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h2>
                  {/* Event count chip */}
                  {(() => {
                    const regularEventCount = dayEvents.filter(
                      (e) =>
                        e.type !== 'arrival' && e.type !== 'departure' && e.type !== 'accommodation'
                    ).length;
                    return regularEventCount > 0 ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-xs font-medium text-slate-700">
                        <svg
                          className="w-3.5 h-3.5 text-slate-500"
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
                          {regularEventCount} {regularEventCount === 1 ? 'event' : 'events'}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Events for this day */}
              <div className="space-y-4 ml-2 pl-4 sm:ml-3 sm:pl-4 border-l-2 border-slate-200">
                {(() => {
                  const { accommodations, arrivals, departures, regularEvents } =
                    separateEventsByType(dayEvents);

                  return (
                    <>
                      {/* Arrivals - Compact Format (shown first) */}
                      {arrivals.length > 0 && (
                        <div className="space-y-2">
                          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg border border-blue-200 overflow-hidden">
                            <div className="px-4 py-2 bg-blue-100/50 border-b border-blue-200">
                              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                                Arrivals
                              </h3>
                            </div>
                            <div className="divide-y divide-blue-100">
                              {arrivals.map((event) => {
                                const config = eventTypeConfig[event.type];
                                const isExpanded = expandedEvent === event.id;
                                const member = event.createdBy;

                                return (
                                  <div
                                    key={event.id}
                                    className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                                  >
                                    {/* Collapsed: Single line strip */}
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-base flex-shrink-0">
                                          {config.icon}
                                        </span>
                                        <span className="font-semibold text-sm text-slate-900 flex-shrink-0">
                                          {member.name}
                                        </span>
                                        <span className="text-slate-400 flex-shrink-0">•</span>
                                        {event.location && (
                                          <>
                                            <span className="text-xs text-slate-600 flex-shrink-0">
                                              {event.location.includes('→')
                                                ? event.location.split('→')[1].trim().split(' ')[0]
                                                : event.location}
                                            </span>
                                            <span className="text-slate-400 flex-shrink-0">•</span>
                                          </>
                                        )}
                                        <span className="text-xs text-slate-600 flex-shrink-0">
                                          {event.time}
                                        </span>
                                      </div>
                                      <svg
                                        className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
                                          isExpanded ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 9l-7 7-7-7"
                                        />
                                      </svg>
                                    </div>

                                    {/* Expanded: Full details */}
                                    {isExpanded && (
                                      <div className="px-4 pb-3 pt-1 border-t border-blue-100 bg-white/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {event.description && (
                                          <p className="text-sm text-slate-700 leading-relaxed">
                                            {event.description}
                                          </p>
                                        )}

                                        {event.links && event.links.length > 0 && (
                                          <div className="space-y-1.5">
                                            {event.links.map((link, i) => (
                                              <a
                                                key={i}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <svg
                                                  className="w-3.5 h-3.5"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                  />
                                                </svg>
                                                {link}
                                              </a>
                                            ))}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                          <div className="flex items-center gap-2">
                                            <img
                                              src={event.createdBy.avatar}
                                              alt={event.createdBy.name}
                                              className="w-5 h-5 rounded-full"
                                            />
                                            <span className="text-xs text-slate-600">
                                              Added by{' '}
                                              <span className="font-medium text-slate-900">
                                                {event.createdBy.name}
                                              </span>
                                            </span>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-7 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Handle edit
                                            }}
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Accommodation - Compact Format */}
                      {accommodations.length > 0 && (
                        <div className="space-y-2">
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 overflow-hidden">
                            <div className="px-4 py-2 bg-purple-100/50 border-b border-purple-200">
                              <h3 className="text-xs font-semibold text-purple-900 uppercase tracking-wide">
                                Accommodation
                              </h3>
                            </div>
                            <div className="divide-y divide-purple-100">
                              {accommodations.map((event) => {
                                const config = eventTypeConfig[event.type];
                                const isExpanded = expandedEvent === event.id;

                                return (
                                  <div
                                    key={event.id}
                                    className="group hover:bg-purple-50/50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                                  >
                                    {/* Collapsed: Single line strip */}
                                    <div className="px-4 py-2.5">
                                      <div className="flex items-center justify-between gap-3 mb-1">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <span className="text-base flex-shrink-0">
                                            {config.icon}
                                          </span>
                                          <span className="font-semibold text-sm text-slate-900 truncate">
                                            {event.title}
                                          </span>
                                          {(event as any).isFirstDay && event.checkInTime && (
                                            <>
                                              <span className="text-slate-400 flex-shrink-0">
                                                •
                                              </span>
                                              <span className="text-xs text-slate-600 flex-shrink-0">
                                                Check-in {event.checkInTime}
                                              </span>
                                            </>
                                          )}
                                          {(event as any).isLastDay && event.checkOutTime && (
                                            <>
                                              <span className="text-slate-400 flex-shrink-0">
                                                •
                                              </span>
                                              <span className="text-xs text-slate-600 flex-shrink-0">
                                                Check-out {event.checkOutTime}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        <svg
                                          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
                                            isExpanded ? 'rotate-180' : ''
                                          }`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </div>
                                      {event.location && (
                                        <div className="pl-7">
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <svg
                                              className="w-3 h-3"
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
                                            {event.location}
                                          </a>
                                        </div>
                                      )}
                                    </div>

                                    {/* Expanded: Full details */}
                                    {isExpanded && (
                                      <div className="px-4 pb-3 pt-1 border-t border-purple-100 bg-white/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {event.location && (
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <svg
                                              className="w-3 h-3"
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
                                            {event.location}
                                          </a>
                                        )}

                                        {(event.checkInTime || event.checkOutTime) && (
                                          <div className="grid grid-cols-2 gap-3 text-xs">
                                            {event.checkInTime && (
                                              <div>
                                                <span className="text-slate-600">Check-in:</span>
                                                <span className="ml-1 font-medium text-slate-900">
                                                  {event.checkInTime}
                                                </span>
                                              </div>
                                            )}
                                            {event.checkOutTime && (
                                              <div>
                                                <span className="text-slate-600">Check-out:</span>
                                                <span className="ml-1 font-medium text-slate-900">
                                                  {event.checkOutTime}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {event.description && (
                                          <p className="text-sm text-slate-700 leading-relaxed">
                                            {event.description}
                                          </p>
                                        )}

                                        {event.links && event.links.length > 0 && (
                                          <div className="space-y-1.5">
                                            {event.links.map((link, i) => (
                                              <a
                                                key={i}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <svg
                                                  className="w-3.5 h-3.5"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                  />
                                                </svg>
                                                {link}
                                              </a>
                                            ))}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                          <div className="flex items-center gap-2">
                                            <img
                                              src={event.createdBy.avatar}
                                              alt={event.createdBy.name}
                                              className="w-5 h-5 rounded-full"
                                            />
                                            <span className="text-xs text-slate-600">
                                              Added by{' '}
                                              <span className="font-medium text-slate-900">
                                                {event.createdBy.name}
                                              </span>
                                            </span>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-7 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Handle edit
                                            }}
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Itinerary - Regular events in compact format */}
                      {regularEvents.length > 0 && (
                        <div className="space-y-2">
                          <div className="bg-gradient-to-r from-slate-50 to-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-100/50 border-b border-slate-200">
                              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                                Itinerary
                              </h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {regularEvents.map((event) => {
                                const config = eventTypeConfig[event.type];
                                const isExpanded = expandedEvent === event.id;

                                return (
                                  <div
                                    key={event.id}
                                    className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                                  >
                                    {/* Collapsed: Compact view */}
                                    <div className="px-4 py-3">
                                      <div className="flex items-start gap-3">
                                        <span className="text-base flex-shrink-0 mt-0.5">
                                          {config.icon}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          {/* Time */}
                                          <div className="mb-1">
                                            {event.allDay ? (
                                              <span className="text-xs text-slate-600">
                                                All day
                                              </span>
                                            ) : event.endTime ? (
                                              <span className="text-xs font-medium text-slate-700">
                                                {event.time} - {event.endTime}
                                              </span>
                                            ) : (
                                              <span className="text-xs font-medium text-slate-700">
                                                {event.time}
                                              </span>
                                            )}
                                          </div>
                                          {/* Title */}
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm text-slate-900">
                                              {event.title}
                                            </span>
                                            {event.isOptional && (
                                              <Badge
                                                variant="outline"
                                                className="text-slate-600 border-slate-300 text-xs"
                                              >
                                                Optional
                                              </Badge>
                                            )}
                                          </div>
                                          {/* Location */}
                                          {event.location && (
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <svg
                                                className="w-3.5 h-3.5"
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
                                              {event.location}
                                            </a>
                                          )}
                                          {/* Meetup Info */}
                                          {(event.meetupLocation || event.meetupTime) && (
                                            <div className="text-xs text-blue-700 flex items-center gap-1 mt-1">
                                              <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                              </svg>
                                              <span className="font-medium">Meetup:</span>
                                              {event.meetupTime && <span>{event.meetupTime}</span>}
                                              {event.meetupTime && event.meetupLocation && (
                                                <span>•</span>
                                              )}
                                              {event.meetupLocation && (
                                                <span>{event.meetupLocation}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <svg
                                          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
                                            isExpanded ? 'rotate-180' : ''
                                          }`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </div>
                                    </div>

                                    {/* Expanded: Full details */}
                                    {isExpanded && (
                                      <div className="px-4 pb-3 pt-1 border-t border-slate-200 bg-white/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {event.description && (
                                          <p className="text-sm text-slate-700 leading-relaxed">
                                            {event.description}
                                          </p>
                                        )}

                                        {/* Meetup Info */}
                                        {(event.meetupLocation || event.meetupTime) && (
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                                            <div className="flex items-center gap-2">
                                              <svg
                                                className="w-4 h-4 text-blue-600"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                              </svg>
                                              <span className="text-sm font-semibold text-blue-900">
                                                Meetup
                                              </span>
                                            </div>
                                            {event.meetupTime && (
                                              <p className="text-sm text-blue-800 pl-6">
                                                <span className="font-medium">Time:</span>{' '}
                                                {event.meetupTime}
                                              </p>
                                            )}
                                            {event.meetupLocation && (
                                              <p className="text-sm text-blue-800 pl-6">
                                                <span className="font-medium">Location:</span>{' '}
                                                {event.meetupLocation}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {event.links && event.links.length > 0 && (
                                          <div className="space-y-1.5">
                                            {event.links.map((link, i) => (
                                              <a
                                                key={i}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <svg
                                                  className="w-3.5 h-3.5"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                  />
                                                </svg>
                                                {link}
                                              </a>
                                            ))}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                          <div className="flex items-center gap-2">
                                            <img
                                              src={event.createdBy.avatar}
                                              alt={event.createdBy.name}
                                              className="w-5 h-5 rounded-full"
                                            />
                                            <span className="text-xs text-slate-600">
                                              Added by{' '}
                                              <span className="font-medium text-slate-900">
                                                {event.createdBy.name}
                                              </span>
                                            </span>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-7 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Handle edit
                                            }}
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Departures - Compact Format (shown at end of day) */}
                      {departures.length > 0 && (
                        <div className="space-y-2">
                          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg border border-blue-200 overflow-hidden">
                            <div className="px-4 py-2 bg-blue-100/50 border-b border-blue-200">
                              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                                Departures
                              </h3>
                            </div>
                            <div className="divide-y divide-blue-100">
                              {departures.map((event) => {
                                const config = eventTypeConfig[event.type];
                                const isExpanded = expandedEvent === event.id;
                                // For arrivals/departures, show the member (in real app, from member_id field)
                                const member = event.createdBy;

                                return (
                                  <div
                                    key={event.id}
                                    className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                                  >
                                    {/* Collapsed: Single line strip - minimal info only */}
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-base flex-shrink-0">
                                          {config.icon}
                                        </span>
                                        <span className="font-semibold text-sm text-slate-900 flex-shrink-0">
                                          {member.name}
                                        </span>
                                        <span className="text-slate-400 flex-shrink-0">•</span>
                                        {event.location && (
                                          <>
                                            <span className="text-xs text-slate-600 flex-shrink-0">
                                              {event.location.includes('→')
                                                ? event.location.split('→')[0].trim() // For departures, show origin (where they're leaving from)
                                                : event.location}
                                            </span>
                                            <span className="text-slate-400 flex-shrink-0">•</span>
                                          </>
                                        )}
                                        <span className="text-xs text-slate-600 flex-shrink-0">
                                          {event.time}
                                        </span>
                                      </div>
                                      <svg
                                        className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
                                          isExpanded ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 9l-7 7-7-7"
                                        />
                                      </svg>
                                    </div>

                                    {/* Expanded: Full details */}
                                    {isExpanded && (
                                      <div className="px-4 pb-3 pt-1 border-t border-blue-100 bg-white/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* Flight/Travel details */}
                                        {(event.title || event.location) && (
                                          <div className="space-y-1">
                                            {event.title && (
                                              <p className="text-sm font-medium text-slate-900">
                                                {event.title}
                                              </p>
                                            )}
                                            {event.location && (
                                              <p className="text-sm text-slate-600">
                                                {event.location}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {event.description && (
                                          <p className="text-sm text-slate-700 leading-relaxed">
                                            {event.description}
                                          </p>
                                        )}

                                        {event.links && event.links.length > 0 && (
                                          <div className="space-y-1.5">
                                            {event.links.map((link, i) => (
                                              <a
                                                key={i}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <svg
                                                  className="w-3.5 h-3.5"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                  />
                                                </svg>
                                                {link}
                                              </a>
                                            ))}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                          <div className="flex items-center gap-2">
                                            <img
                                              src={event.createdBy.avatar}
                                              alt={event.createdBy.name}
                                              className="w-5 h-5 rounded-full"
                                            />
                                            <span className="text-xs text-slate-600">
                                              Added by{' '}
                                              <span className="font-medium text-slate-900">
                                                {event.createdBy.name}
                                              </span>
                                            </span>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-7 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Handle edit
                                            }}
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating action button */}
      <button className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:scale-110 transition-all duration-200 flex items-center justify-center group">
        <svg
          className="w-7 h-7 group-hover:rotate-90 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
