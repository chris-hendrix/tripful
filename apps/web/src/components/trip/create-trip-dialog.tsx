"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTripSchema, type CreateTripInput } from "@tripful/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTripDialog({
  open,
  onOpenChange,
}: CreateTripDialogProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const form = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      name: "",
      destination: "",
      startDate: undefined,
      endDate: undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      description: "",
      coverImageUrl: null,
      allowMembersToAddEvents: true,
      coOrganizerPhones: [],
    },
  });

  const handleContinue = async () => {
    // Validate Step 1 fields before proceeding
    const step1Fields: (keyof CreateTripInput)[] = [
      "name",
      "destination",
      "startDate",
      "endDate",
      "timezone",
    ];

    const isStep1Valid = await form.trigger(step1Fields);

    if (isStep1Valid) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = (data: CreateTripInput) => {
    // Placeholder for Task 4.5: API call will be implemented later
    console.log("Trip data:", data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle
            className="text-3xl font-serif tracking-tight"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            Create a new trip
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-900">
              {currentStep === 1 ? "Basic information" : "Details & settings"}
            </span>
            <span className="text-sm text-slate-500">
              Step {currentStep} of 2
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Step 1 circle */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                currentStep >= 1
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              1
            </div>

            {/* Connecting line */}
            <div
              className={`flex-1 h-0.5 transition-colors ${
                currentStep >= 2
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                  : "bg-slate-200"
              }`}
            />

            {/* Step 2 circle */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                currentStep >= 2
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              2
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Trip Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-900">
                        Trip name
                        <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Bachelor Party in Miami"
                          className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-slate-500">
                        Choose something memorable (3-100 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Destination */}
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-900">
                        Destination
                        <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Miami Beach, FL"
                          className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">
                          Start date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">
                          End date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Timezone */}
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-900">
                        Trip timezone
                        <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-base rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-sm text-slate-500">
                        All trip times will be shown in this timezone
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Continue Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={handleContinue}
                    className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                  <p className="text-lg text-slate-600">
                    Step 2 coming in Task 4.4
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    This will include description, cover image, and settings
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 h-12 rounded-xl border-slate-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
                  >
                    Create trip
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
