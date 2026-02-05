"use client"

/**
 * Create Event Page
 *
 * Design: Modern Travel Editorial
 * - Event type selection with colored backgrounds
 * - Comprehensive form with validation
 * - Member assignment with avatar selection
 * - Mobile-optimized with sticky footer
 */

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type EventType = 'travel' | 'meal' | 'activity'

const eventTypeConfig = {
  travel: {
    label: 'Travel',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    selectedBg: 'bg-blue-100',
    icon: '✈️',
    placeholder: 'e.g., Drive to Key West',
    locationPlaceholder: 'Miami → Key West'
  },
  meal: {
    label: 'Meal',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    selectedBg: 'bg-amber-100',
    icon: '🍽️',
    placeholder: 'e.g., Dinner at Joe\'s',
    locationPlaceholder: 'Restaurant name and address'
  },
  activity: {
    label: 'Activity & Other',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    selectedBg: 'bg-emerald-100',
    icon: '🎉',
    placeholder: 'e.g., Boat tour',
    locationPlaceholder: 'Venue or meeting point'
  }
}

export default function CreateEventPage() {
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [eventName, setEventName] = useState('')
  const [startDate, setStartDate] = useState('2026-10-12')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('10:30')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [showEndDate, setShowEndDate] = useState(false)
  const [location, setLocation] = useState('')
  const [meetupLocation, setMeetupLocation] = useState('')
  const [meetupTime, setMeetupTime] = useState('')
  const [description, setDescription] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [isOptional, setIsOptional] = useState(false)

  // Update defaults when event type changes
  const handleEventTypeChange = (type: EventType) => {
    setEventType(type)
  }

  const addLink = () => {
    if (links.length < 10) {
      setLinks([...links, ''])
    }
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links]
    newLinks[index] = value
    setLinks(newLinks)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In real app, would submit to API
    console.log({
      eventType,
      eventName,
      startDate,
      endDate: endDate || null,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : (endTime || null),
      allDay,
      location,
      meetupLocation,
      meetupTime,
      description,
      links: links.filter(l => l),
      isOptional
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-slate-900">Add Event</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-32">
        <div className="space-y-8">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Event Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(eventTypeConfig) as EventType[]).map((type) => {
                const config = eventTypeConfig[type]
                const isSelected = eventType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleEventTypeChange(type)}
                    className={`
                      h-20 rounded-xl border-2 transition-all duration-200
                      flex flex-col items-center justify-center gap-1
                      ${isSelected
                        ? `${config.selectedBg} ${config.color.split(' ')[2]}`
                        : 'bg-white border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <span className="text-2xl">{config.icon}</span>
                    <span className={`text-sm font-medium ${isSelected ? config.color.split(' ')[1] : 'text-slate-700'}`}>
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Event Name */}
          <div>
            <label htmlFor="eventName" className="block text-sm font-semibold text-slate-700 mb-2">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              id="eventName"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder={eventType ? eventTypeConfig[eventType].placeholder : 'Select event type first'}
              className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              required
              minLength={3}
              maxLength={200}
            />
            <p className="text-xs text-slate-500 mt-1">
              {eventName.length}/200 characters
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>

            {/* Start Date */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              required
            />

            {/* End Date (optional) */}
            {showEndDate ? (
              <div className="space-y-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="End date"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowEndDate(false)
                    setEndDate('')
                  }}
                  className="text-sm text-slate-600 hover:text-slate-700 font-medium"
                >
                  Remove end date
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowEndDate(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add end date (for multi-day events)
              </button>
            )}
          </div>

          {/* Time */}
          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Time
            </label>

            {/* Time Range */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={allDay}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1">Start time</p>
              </div>
              <span className="text-slate-400 mt-[-20px]">—</span>
              <div className="flex-1">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={allDay}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1">End time (optional)</p>
              </div>
            </div>

            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">All day</span>
            </label>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-2">
              Location <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={eventType ? eventTypeConfig[eventType].locationPlaceholder : 'Enter location'}
                className="w-full h-12 pl-12 pr-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
            </div>
            {eventType === 'travel' && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <span>💡</span>
                <span>Use → to show route (e.g., JFK → MIA)</span>
              </p>
            )}
          </div>

          {/* Meetup Location & Time */}
          <div>
            <label htmlFor="meetupLocation" className="block text-sm font-semibold text-slate-700 mb-2">
              Meetup Location <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              id="meetupLocation"
              type="text"
              value={meetupLocation}
              onChange={(e) => setMeetupLocation(e.target.value)}
              placeholder="e.g., Hotel lobby, Coffee shop at 123 Main St"
              className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
            <p className="text-xs text-slate-500 mt-2">Where the group will meet before the event</p>
          </div>

          <div>
            <label htmlFor="meetupTime" className="block text-sm font-semibold text-slate-700 mb-2">
              Meetup Time <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              id="meetupTime"
              type="time"
              value={meetupTime}
              onChange={(e) => setMeetupTime(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">When to meet (can be before the event start time)</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
              Description <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, confirmation numbers, special instructions..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            {description.length >= 1800 && (
              <p className="text-xs text-slate-500 mt-1">
                {description.length}/2000 characters
              </p>
            )}
          </div>

          {/* Links */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Links <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateLink(index, e.target.value)}
                      placeholder="https://example.com"
                      className="w-full h-12 pl-12 pr-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {links.length < 10 && (
                <button
                  type="button"
                  onClick={addLink}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another link
                </button>
              )}
            </div>
          </div>

          {/* Optional */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isOptional}
                onChange={(e) => setIsOptional(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700">Optional event</span>
                <p className="text-xs text-slate-500 mt-0.5">Members can choose whether to attend</p>
              </div>
            </label>
          </div>
        </div>
      </form>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-lg border-slate-300 hover:bg-slate-50 sm:min-w-[120px]"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!eventType || !eventName}
            className="h-12 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:min-w-[120px]"
          >
            Add Event
          </Button>
        </div>
      </div>
    </div>
  )
}
