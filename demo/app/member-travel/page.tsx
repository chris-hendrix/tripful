"use client"

/**
 * Transportation Page - Arrivals & Departures
 *
 * Design: Modern Travel Editorial
 * - Simple form for individual traveler transportation
 * - Arrival vs Departure toggle
 * - Traveler selection
 * - Transportation details
 */

import { useState } from 'react'
import { Button } from "@/components/ui/button"

type TravelDirection = 'arrival' | 'departure'

interface Traveler {
  id: string
  name: string
  avatar: string
}

export default function TransportationPage() {
  // Demo: Current logged-in user is Mike Johnson (organizer)
  const currentUserId = '1' // Mike Johnson
  const isOrganizer = true // Mike is the organizer in this demo

  const [direction, setDirection] = useState<TravelDirection>('arrival')
  const [selectedTraveler, setSelectedTraveler] = useState<string>(currentUserId) // Default to current user
  const [date, setDate] = useState('2026-10-12')
  const [departingFrom, setDepartingFrom] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [arrivingAt, setArrivingAt] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [transportationMethod, setTransportationMethod] = useState('')
  const [details, setDetails] = useState('')
  const [links, setLinks] = useState<string[]>([''])

  // Demo trip travelers
  const travelers: Traveler[] = [
    { id: '1', name: 'Mike Johnson', avatar: 'https://avatar.vercel.sh/mike' },
    { id: '2', name: 'Sarah Chen', avatar: 'https://avatar.vercel.sh/sarah' },
    { id: '3', name: 'Tom Rodriguez', avatar: 'https://avatar.vercel.sh/tom' },
    { id: '4', name: 'Alex Kim', avatar: 'https://avatar.vercel.sh/alex' },
  ]

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
    console.log({
      direction,
      selectedTraveler,
      date,
      departingFrom,
      departureTime,
      arrivingAt,
      arrivalTime,
      transportationMethod,
      details,
      links: links.filter(l => l)
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
            <h1 className="text-xl font-semibold text-slate-900">Add Transportation</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-32">
        <div className="space-y-8">
          {/* Arrival vs Departure */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Travel Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('arrival')}
                className={`
                  h-20 rounded-xl border-2 transition-all duration-200
                  flex flex-col items-center justify-center gap-1
                  ${direction === 'arrival'
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <span className="text-2xl">🛬</span>
                <span className={`text-sm font-medium ${direction === 'arrival' ? 'text-blue-700' : 'text-slate-700'}`}>
                  Arrival
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('departure')}
                className={`
                  h-20 rounded-xl border-2 transition-all duration-200
                  flex flex-col items-center justify-center gap-1
                  ${direction === 'departure'
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <span className="text-2xl">🛫</span>
                <span className={`text-sm font-medium ${direction === 'departure' ? 'text-blue-700' : 'text-slate-700'}`}>
                  Departure
                </span>
              </button>
            </div>
          </div>

          {/* Traveler Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Who is traveling? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {travelers.map((traveler) => {
                const isSelected = selectedTraveler === traveler.id
                const isDisabled = !isOrganizer && traveler.id !== currentUserId
                return (
                  <button
                    key={traveler.id}
                    type="button"
                    onClick={() => isOrganizer && setSelectedTraveler(traveler.id)}
                    disabled={isDisabled}
                    className={`
                      relative p-3 rounded-xl border-2 transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isDisabled
                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <img
                          src={traveler.avatar}
                          alt={traveler.name}
                          className={`w-12 h-12 rounded-full ${(!isSelected || isDisabled) && 'grayscale'}`}
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                        {traveler.name.split(' ')[0]}
                        {traveler.id === currentUserId && (
                          <span className="block text-[10px] text-slate-500">(You)</span>
                        )}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            {isOrganizer && (
              <p className="text-xs text-slate-500 mt-2">
                As organizer, you can add transportation for any traveler
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Departing From & Time */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Departing From {direction === 'departure' && <span className="text-slate-500 font-normal">(optional)</span>}
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={departingFrom}
                onChange={(e) => setDepartingFrom(e.target.value)}
                placeholder="e.g., JFK, New York"
                className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={200}
              />
              <div>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={direction === 'departure'}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Departure time {direction === 'arrival' ? '(optional)' : '(required)'}
                </p>
              </div>
            </div>
          </div>

          {/* Arriving At & Time */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Arriving At {direction === 'arrival' && <span className="text-slate-500 font-normal">(optional)</span>}
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={arrivingAt}
                onChange={(e) => setArrivingAt(e.target.value)}
                placeholder="e.g., MIA, Miami"
                className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={200}
              />
              <div>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={direction === 'arrival'}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Arrival time {direction === 'departure' ? '(optional)' : '(required)'}
                </p>
              </div>
            </div>
          </div>

          {/* Transportation Method */}
          <div>
            <label htmlFor="transportationMethod" className="block text-sm font-semibold text-slate-700 mb-2">
              Transportation Method <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              id="transportationMethod"
              type="text"
              value={transportationMethod}
              onChange={(e) => setTransportationMethod(e.target.value)}
              placeholder="e.g., AA 2451, Greyhound, Driving"
              className="w-full h-12 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              maxLength={200}
            />
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <span>💡</span>
              <span>Flight number, bus line, or transportation mode</span>
            </p>
          </div>

          {/* Details */}
          <div>
            <label htmlFor="details" className="block text-sm font-semibold text-slate-700 mb-2">
              Details <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Gate info, terminal, confirmation number, additional notes..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
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
                      placeholder="https://airline.com/checkin"
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
            disabled={
              !selectedTraveler ||
              (direction === 'arrival' && !arrivalTime) ||
              (direction === 'departure' && !departureTime)
            }
            className="h-12 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:min-w-[120px]"
          >
            Add {direction === 'arrival' ? 'Arrival' : 'Departure'}
          </Button>
        </div>
      </div>
    </div>
  )
}
