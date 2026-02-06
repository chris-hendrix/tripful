"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTripSchema, type CreateTripInput } from "@tripful/shared";
import { useCreateTrip, getCreateTripErrorMessage } from "@/hooks/use-trips";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/trip/image-upload";
import { Plus, X, Loader2 } from "lucide-react";

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
  const [newCoOrganizerPhone, setNewCoOrganizerPhone] = useState("");
  const [coOrganizerError, setCoOrganizerError] = useState<string | null>(null);

  const { mutate: createTrip, isPending, error } = useCreateTrip();
  const errorMessage = getCreateTripErrorMessage(error);

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
    // Create trip via TanStack Query mutation
    // This will trigger optimistic update, API call, and redirect on success
    createTrip(data, {
      onSuccess: () => {
        // Close dialog on successful creation (before redirect)
        onOpenChange(false);
      },
    });
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{6,13}$/;
    return phoneRegex.test(phone);
  };

  const handleAddCoOrganizer = () => {
    setCoOrganizerError(null);

    if (!newCoOrganizerPhone.trim()) {
      setCoOrganizerError("Phone number is required");
      return;
    }

    if (!validatePhoneNumber(newCoOrganizerPhone)) {
      setCoOrganizerError(
        "Phone number must be in E.164 format (e.g., +14155552671)",
      );
      return;
    }

    const currentPhones = form.getValues("coOrganizerPhones") || [];
    if (currentPhones.includes(newCoOrganizerPhone)) {
      setCoOrganizerError("This phone number is already added");
      return;
    }

    form.setValue("coOrganizerPhones", [...currentPhones, newCoOrganizerPhone]);
    setNewCoOrganizerPhone("");
  };

  const handleRemoveCoOrganizer = (phoneToRemove: string) => {
    const currentPhones = form.getValues("coOrganizerPhones") || [];
    form.setValue(
      "coOrganizerPhones",
      currentPhones.filter((phone) => phone !== phoneToRemove),
    );
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
          <DialogDescription>
            Plan your next adventure with friends and family
          </DialogDescription>
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
                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => {
                    const charCount = field.value?.length || 0;
                    const showCounter = charCount >= 1600;

                    return (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell your group about this trip..."
                            className="h-32 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl resize-none"
                            disabled={isPending}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        {showCounter && (
                          <div className="text-xs text-slate-500 text-right">
                            {charCount} / 2000 characters
                          </div>
                        )}
                        <FormDescription className="text-sm text-slate-500">
                          Optional: Share details about the trip
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Cover Image */}
                <FormField
                  control={form.control}
                  name="coverImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-900">
                        Cover image
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value ?? null}
                          onChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-slate-500">
                        Optional: Upload a cover image for your trip
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Allow Members to Add Events */}
                <FormField
                  control={form.control}
                  name="allowMembersToAddEvents"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-slate-200 p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isPending}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Allow members to add events"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base font-semibold text-slate-900 cursor-pointer">
                          Allow members to add events
                        </FormLabel>
                        <FormDescription className="text-sm text-slate-500">
                          Let trip members create and propose events for the
                          itinerary
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Co-Organizers */}
                <FormField
                  control={form.control}
                  name="coOrganizerPhones"
                  render={({ field }) => {
                    const phones = field.value || [];

                    return (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">
                          Co-organizers
                        </FormLabel>
                        <FormDescription className="text-sm text-slate-500">
                          Add phone numbers of people who can help organize this
                          trip
                        </FormDescription>

                        {/* List of added co-organizers */}
                        {phones.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {phones.map((phone, index) => (
                              <div
                                key={`${phone}-${index}`}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                              >
                                <span className="text-sm font-medium text-slate-900">
                                  {phone}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCoOrganizer(phone)}
                                  disabled={isPending}
                                  className="p-1 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label={`Remove ${phone}`}
                                >
                                  <X className="w-4 h-4 text-slate-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add co-organizer input */}
                        <div className="space-y-2 mt-2">
                          <div className="flex gap-2">
                            <Input
                              type="tel"
                              placeholder="+14155552671"
                              value={newCoOrganizerPhone}
                              onChange={(e) => {
                                setNewCoOrganizerPhone(e.target.value);
                                setCoOrganizerError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddCoOrganizer();
                                }
                              }}
                              disabled={isPending}
                              className="flex-1 h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                              aria-label="Co-organizer phone number"
                            />
                            <Button
                              type="button"
                              onClick={handleAddCoOrganizer}
                              disabled={isPending}
                              className="h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                              variant="outline"
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
                          </div>
                          {coOrganizerError && (
                            <p className="text-sm text-red-600">
                              {coOrganizerError}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            Format: E.164 (e.g., +14155552671)
                          </p>
                        </div>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Error message */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isPending}
                    className="flex-1 h-12 rounded-xl border-slate-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    {isPending ? "Creating trip..." : "Create trip"}
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
