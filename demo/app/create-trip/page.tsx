"use client";

/**
 * Trip Creation Form
 *
 * Design: Modern Travel Editorial
 * - Multi-step form with elegant transitions
 * - Large image preview with overlay
 * - Refined spacing and typography hierarchy
 * - Gradient accents and soft shadows
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function CreateTripScreen() {
  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [coverImage, setCoverImage] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg" />
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              Tripful
            </h1>
          </div>
          <Button variant="outline" className="rounded-full">
            Cancel
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-900">
              Create your trip
            </span>
            <span className="text-sm text-slate-500">Step 1 of 2</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full transition-all duration-500"
              style={{ width: "50%" }}
            />
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <h2
              className="text-5xl font-serif leading-tight tracking-tight text-slate-900"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              Let's start with
              <br />
              the basics
            </h2>
            <p className="text-lg text-slate-600">
              Tell us about your trip. You can always change these later.
            </p>
          </div>

          <form className="space-y-6">
            {/* Trip Name */}
            <Field>
              <FieldLabel
                htmlFor="trip-name"
                className="text-base font-semibold text-slate-900"
              >
                Trip name
                <span className="text-red-500 ml-1">*</span>
              </FieldLabel>
              <Input
                id="trip-name"
                type="text"
                placeholder="Bachelor Party in Miami"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
              />
              <FieldDescription className="text-sm text-slate-500">
                Choose something memorable (3-100 characters)
              </FieldDescription>
            </Field>

            {/* Destination */}
            <Field>
              <FieldLabel
                htmlFor="destination"
                className="text-base font-semibold text-slate-900"
              >
                Destination
                <span className="text-red-500 ml-1">*</span>
              </FieldLabel>
              <Input
                id="destination"
                type="text"
                placeholder="Miami Beach, FL"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
              />
            </Field>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="start-date"
                  className="text-base font-semibold text-slate-900"
                >
                  Start date
                </FieldLabel>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="end-date"
                  className="text-base font-semibold text-slate-900"
                >
                  End date
                </FieldLabel>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                />
              </Field>
            </div>

            {/* Timezone */}
            <Field>
              <FieldLabel
                htmlFor="timezone"
                className="text-base font-semibold text-slate-900"
              >
                Trip timezone
                <span className="text-red-500 ml-1">*</span>
              </FieldLabel>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger
                  id="timezone"
                  className="h-12 text-base rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">
                    Eastern Time (ET)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central Time (CT)
                  </SelectItem>
                  <SelectItem value="America/Denver">
                    Mountain Time (MT)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time (PT)
                  </SelectItem>
                  <SelectItem value="America/Anchorage">
                    Alaska Time (AKT)
                  </SelectItem>
                  <SelectItem value="Pacific/Honolulu">
                    Hawaii Time (HT)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription className="text-sm text-slate-500">
                All trip times will be shown in this timezone
              </FieldDescription>
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel
                htmlFor="description"
                className="text-base font-semibold text-slate-900"
              >
                Description
                <Badge variant="secondary" className="ml-2 text-xs">
                  Optional
                </Badge>
              </FieldLabel>
              <Textarea
                id="description"
                placeholder="Add details about the trip..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl resize-none"
              />
              <FieldDescription className="text-sm text-slate-500">
                Up to 2000 characters
              </FieldDescription>
            </Field>

            {/* Action buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl border-slate-300"
              >
                Save as draft
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
              >
                Continue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
