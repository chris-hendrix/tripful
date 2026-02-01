"use client"

/**
 * Trip Itinerary View (Day-by-Day)
 *
 * Design: Modern Travel Editorial
 * - Timeline-based layout with date headers
 * - Color-coded event type badges
 * - Expandable event cards with details
 * - Floating action button for adding events
 * - Toggle between day-by-day and type views
 */

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type EventType = 'travel' | 'accommodation' | 'meal' | 'activity'

interface User {
  name: string
  avatar: string
}

interface TripEvent {
  id: string
  type: EventType
  title: string
  date: string
  endDate?: string
  time?: string
  endTime?: string
  allDay?: boolean
  location?: string
  description?: string
  links?: string[]
  createdBy: User
  assignedTo: 'all' | User[]
  isOptional?: boolean
  memberNoLongerAttending?: boolean
}

const eventTypeConfig = {
  travel: {
    label: 'Travel',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '✈️'
  },
  accommodation: {
    label: 'Accommodation',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: '🏨'
  },
  meal: {
    label: 'Meal',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: '🍽️'
  },
  activity: {
    label: 'Activity',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: '🎉'
  }
}

export default function ItineraryView() {
  const [viewMode, setViewMode] = useState<'day' | 'type'>('day')
  const [timezone, setTimezone] = useState<'trip' | 'local'>('trip')
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  // Demo users
  const mike = { name: 'Mike Johnson', avatar: 'https://avatar.vercel.sh/mike' }
  const sarah = { name: 'Sarah Chen', avatar: 'https://avatar.vercel.sh/sarah' }
  const tom = { name: 'Tom Rodriguez', avatar: 'https://avatar.vercel.sh/tom' }
  const alex = { name: 'Alex Kim', avatar: 'https://avatar.vercel.sh/alex' }

  const events: TripEvent[] = [
    {
      id: '1',
      type: 'travel',
      title: 'Flight to Miami (AA 2451)',
      date: 'Oct 12, 2026',
      time: '10:30 AM',
      location: 'JFK → MIA',
      description: 'American Airlines flight. Gate info TBD - check 24hrs before.',
      links: ['https://aa.com/checkin/123'],
      createdBy: mike,
      assignedTo: [mike, sarah, alex] // Group flight
    },
    {
      id: '2',
      type: 'accommodation',
      title: 'Fontainebleau Miami Beach',
      date: 'Oct 12, 2026',
      endDate: 'Oct 13, 2026',
      allDay: true,
      location: '4441 Collins Ave, Miami Beach, FL',
      description: 'Check-in at 3pm. Oceanview rooms on floors 8-10. Confirmation #MB-2847.',
      links: ['https://fontainebleau.com/booking/MB-2847'],
      createdBy: mike,
      assignedTo: 'all' // Everyone
    },
    {
      id: '3',
      type: 'meal',
      title: 'Dinner at Joe\'s Stone Crab',
      date: 'Oct 12, 2026',
      time: '7:30 PM',
      location: '11 Washington Ave, Miami Beach',
      description: 'Reservation for 8 people. Dress code: Smart casual.',
      links: ['https://joesstonecrab.com'],
      createdBy: sarah,
      assignedTo: 'all' // Everyone
    },
    {
      id: '4',
      type: 'activity',
      title: 'Private Yacht Charter',
      date: 'Oct 13, 2026',
      time: '11:00 AM',
      endTime: '3:00 PM',
      location: 'Miami Beach Marina',
      description: '4-hour private yacht cruise. Includes drinks, snacks, water toys. Bring sunscreen!',
      links: ['https://miamiyachts.com/charter/789'],
      createdBy: tom,
      assignedTo: [mike, sarah, tom], // Tom's event, most people
      isOptional: true
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
      assignedTo: [alex], // Just Alex
      isOptional: true,
      memberNoLongerAttending: true
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
      assignedTo: 'all' // Everyone
    },
    {
      id: '7',
      type: 'accommodation',
      title: 'The Marker Key West',
      date: 'Oct 13, 2026',
      endDate: 'Oct 15, 2026',
      allDay: true,
      location: '200 William St, Key West, FL',
      description: 'Check-in at 8pm. Waterfront hotel with pool. Confirmation #KW-9921.',
      links: ['https://themarkerkewest.com/booking'],
      createdBy: mike,
      assignedTo: 'all' // Everyone
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
      assignedTo: [mike, sarah, tom] // Most people - not Alex
    },
    {
      id: '9',
      type: 'activity',
      title: 'Duval Street Bar Crawl',
      date: 'Oct 14, 2026',
      time: '8:00 PM',
      location: 'Duval Street, Key West',
      description: 'Hit the famous bars: Sloppy Joe\'s, Captain Tony\'s, Irish Kevin\'s. Meeting at Sloppy Joe\'s.',
      createdBy: tom,
      assignedTo: 'all' // Everyone
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
      assignedTo: [mike, sarah, tom] // Not Alex
    },
    {
      id: '11',
      type: 'travel',
      title: 'Tom\'s Flight Home (UA 1523)',
      date: 'Oct 15, 2026',
      time: '6:00 PM',
      allDay: false,
      location: 'MIA → EWR',
      description: 'United Airlines flight to Newark. Check-in opens 24hrs before.',
      createdBy: mike,
      assignedTo: [tom] // Just Tom - example of organizer adding someone's specific flight
    },
    {
      id: '12',
      type: 'travel',
      title: 'Mike & Sarah\'s Flight Home (AA 2452)',
      date: 'Oct 15, 2026',
      time: '7:15 PM',
      allDay: false,
      location: 'MIA → JFK',
      description: 'American Airlines flight back to JFK. Same airline as arrival flight.',
      createdBy: mike,
      assignedTo: [mike, sarah] // Mike and Sarah on same flight
    }
  ]

  // Expand multi-day events into individual day entries
  const expandMultiDayEvents = (events: TripEvent[]): TripEvent[] => {
    const expanded: TripEvent[] = []

    events.forEach(event => {
      if (event.endDate) {
        // Multi-day event - create entry for each day
        const start = new Date(event.date)
        const end = new Date(event.endDate)

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          expanded.push({
            ...event,
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          })
        }
      } else {
        // Single day event
        expanded.push(event)
      }
    })

    return expanded
  }

  const groupByDay = (events: TripEvent[]) => {
    const expandedEvents = expandMultiDayEvents(events)
    const grouped = expandedEvents.reduce((acc, event) => {
      if (!acc[event.date]) acc[event.date] = []
      acc[event.date].push(event)
      return acc
    }, {} as Record<string, TripEvent[]>)

    // Sort events within each day: all-day first, then by time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        // All-day events come first
        if (a.allDay && !b.allDay) return -1
        if (!a.allDay && b.allDay) return 1

        // Both all-day or both timed - maintain order or sort by time
        if (!a.allDay && !b.allDay && a.time && b.time) {
          return a.time.localeCompare(b.time)
        }

        return 0
      })
    })

    return grouped
  }

  const extractCityFromLocation = (location?: string): string => {
    if (!location) return 'No location'

    // If it's a travel event with arrow notation, return as-is
    if (location.includes('→')) return location

    // Try to extract city from full address
    // Common patterns: "City, State" or "Address, City, State"
    const parts = location.split(',').map(s => s.trim())

    // For "Miami Beach Marina" or "Duval Street, Key West"
    if (parts.length >= 2) {
      // Return the second-to-last part (usually the city)
      return parts[parts.length - 2]
    }

    // For simple locations like "Nikki Beach", return first part
    return parts[0]
  }

  const groupEventsByLocation = (dayEvents: TripEvent[]) => {
    const grouped: Record<string, TripEvent[]> = {}

    dayEvents.forEach(event => {
      const city = extractCityFromLocation(event.location)
      if (!grouped[city]) grouped[city] = []
      grouped[city].push(event)
    })

    return grouped
  }

  const eventsByDay = groupByDay(events)

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              Trip settings
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'day'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Day by day
                </button>
                <button
                  onClick={() => setViewMode('type')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'type'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By type
                </button>
              </div>

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Miami Beach, FL</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-slate-400 rounded-full" />
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                    <span className="text-2xl font-bold">
                      {new Date(date).getDate()}
                    </span>
                    <span className="text-xs uppercase tracking-wide">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h2>
                  {/* Chips: event count + locations */}
                  <div className="flex flex-wrap gap-2">
                    {/* Event count chip */}
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-xs font-medium text-slate-700">
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}</span>
                    </div>

                    {/* Location chips */}
                    {Object.entries(groupEventsByLocation(dayEvents)).map(([location, locationEvents], locationIndex) => (
                      <div key={`${date}-${location}`} className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-xs font-medium text-slate-700">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Events for this day */}
              <div className="space-y-4 ml-4 pl-6 sm:ml-6 sm:pl-6 border-l-2 border-slate-200">
                {dayEvents.map((event, eventIndex) => {
                      const config = eventTypeConfig[event.type]
                      const isExpanded = expandedEvent === event.id

                      return (
                    <div
                      key={event.id}
                      className="relative group animate-in fade-in slide-in-from-left-4 duration-500"
                      style={{ animationDelay: `${(dayIndex * 100) + (eventIndex * 50)}ms` }}
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[29px] sm:-left-[33px] top-6 w-3 h-3 bg-white border-2 border-blue-500 rounded-full group-hover:scale-150 transition-transform" />

                      {/* Event card */}
                      <div
                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                        onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-2 sm:gap-3">
                            {/* Time */}
                            <div className="flex-shrink-0 text-right min-w-[70px]">
                              {event.allDay ? (
                                <Badge variant="outline" className="text-xs text-slate-600 border-slate-300 whitespace-nowrap">
                                  All day
                                </Badge>
                              ) : event.endTime ? (
                                <div className="text-xs font-semibold text-slate-900 leading-tight">
                                  <div>{event.time}</div>
                                  <div>{event.endTime}</div>
                                </div>
                              ) : (
                                <p className="text-xs font-semibold text-slate-900">
                                  {event.time}
                                </p>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className={`${config.color} border font-medium text-xs`}
                                    >
                                      {config.icon} {config.label}
                                    </Badge>
                                    {event.endDate && (
                                      <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs">
                                        Multi-day
                                      </Badge>
                                    )}
                                    {event.isOptional && (
                                      <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs">
                                        Optional
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="text-base font-semibold text-slate-900 mb-0.5">
                                    {event.title}
                                  </h3>
                                  {event.location && (
                                    <p className="text-xs text-slate-600 flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {event.location}
                                    </p>
                                  )}

                                  {/* Assigned to - Avatar stack or "Everyone" badge */}
                                  <div className="flex items-center gap-1.5 mt-2">
                                    {event.assignedTo === 'all' ? (
                                      <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs">
                                        👥 Everyone
                                      </Badge>
                                    ) : (
                                      <div className="flex -space-x-2">
                                        {event.assignedTo.map((user, idx) => (
                                          <div
                                            key={idx}
                                            className="relative group/avatar"
                                            title={user.name}
                                          >
                                            <img
                                              src={user.avatar}
                                              alt={user.name}
                                              className="w-6 h-6 rounded-full ring-2 ring-white hover:scale-110 transition-transform cursor-pointer"
                                            />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-10">
                                              {user.name}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Expand icon */}
                                <svg
                                  className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>

                              {/* Expanded content */}
                              {isExpanded && (
                                <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  {event.description && (
                                    <p className="text-slate-700 leading-relaxed">
                                      {event.description}
                                    </p>
                                  )}

                                  {event.links && event.links.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-slate-900">Links</p>
                                      {event.links.map((link, i) => (
                                        <a
                                          key={i}
                                          href={link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
                                        className="w-6 h-6 rounded-full"
                                      />
                                      <span className="text-sm text-slate-600">
                                        Added by <span className="font-medium text-slate-900">{event.createdBy.name}</span>
                                        {event.memberNoLongerAttending && (
                                          <Badge variant="outline" className="ml-2 text-xs text-amber-700 border-amber-300 bg-amber-50">
                                            Member no longer attending
                                          </Badge>
                                        )}
                                      </span>
                                    </div>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-lg"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Handle edit
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating action button */}
      <button className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:scale-110 transition-all duration-200 flex items-center justify-center group">
        <svg className="w-7 h-7 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
