"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateTripSchema, type UpdateTripInput } from "@tripful/shared";
import {
  useUpdateTrip,
  getUpdateTripErrorMessage,
  useCancelTrip,
  getCancelTripErrorMessage,
  type Trip,
} from "@/hooks/use-trips";
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
import { Trash2 } from "lucide-react";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
}

export function EditTripDialog({
  open,
  onOpenChange,
  trip,
}: EditTripDialogProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { mutate: updateTrip, isPending, error } = useUpdateTrip();
  const {
    mutate: cancelTrip,
    isPending: isDeleting,
    error: deleteError,
  } = useCancelTrip();

  const errorMessage = getUpdateTripErrorMessage(error);
  const deleteErrorMessage = getCancelTripErrorMessage(deleteError);

  const form = useForm<UpdateTripInput>({
    resolver: zodResolver(updateTripSchema),
    defaultValues: {
      name: "",
      destination: "",
      startDate: undefined,
      endDate: undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      description: "",
      coverImageUrl: null,
      allowMembersToAddEvents: true,
    },
  });

  // Pre-populate form with existing trip data when dialog opens
  useEffect(() => {
    if (open && trip) {
      form.reset({
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate || undefined,
        endDate: trip.endDate || undefined,
        timezone: trip.preferredTimezone,
        description: trip.description || "",
        coverImageUrl: trip.coverImageUrl,
        allowMembersToAddEvents: trip.allowMembersToAddEvents,
      });
      // Reset step to 1 when dialog opens
      setCurrentStep(1);
      setShowDeleteConfirm(false);
    }
  }, [open, trip, form]);

  const handleContinue = async () => {
    // Validate Step 1 fields before proceeding
    const step1Fields: (keyof UpdateTripInput)[] = [
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
    setShowDeleteConfirm(false);
  };

  const handleSubmit = (data: UpdateTripInput) => {
    // Update trip via TanStack Query mutation
    // This will trigger optimistic update, API call, and close dialog on success
    updateTrip(
      { tripId: trip.id, data },
      {
        onSuccess: () => {
          // Close dialog on successful update
          onOpenChange(false);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    // Delete trip via TanStack Query mutation
    // This will trigger optimistic update, API call, and redirect on success
    cancelTrip(trip.id);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle
            className="text-3xl font-serif tracking-tight"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            Edit trip
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
                          disabled={isPending || isDeleting}
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
                          disabled={isPending || isDeleting}
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
                            disabled={isPending || isDeleting}
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
                            disabled={isPending || isDeleting}
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
                  render={({ field }) => {
                    const selectProps = field.value
                      ? { value: field.value }
                      : {};
                    return (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">
                          Trip timezone
                          <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          {...selectProps}
                          disabled={isPending || isDeleting}
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
                    );
                  }}
                />

                {/* Continue Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={handleContinue}
                    disabled={isPending || isDeleting}
                    className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={isPending || isDeleting}
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
                          tripId={trip.id}
                          disabled={isPending || isDeleting}
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
                          disabled={isPending || isDeleting}
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

                {/* Error messages */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  </div>
                )}

                {deleteErrorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{deleteErrorMessage}</p>
                  </div>
                )}

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm font-medium text-amber-900 mb-3">
                      Are you sure you want to delete this trip? This action
                      cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleCancelDelete}
                        disabled={isDeleting}
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-slate-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        variant="destructive"
                        className="flex-1 h-10 rounded-xl"
                      >
                        {isDeleting ? "Deleting..." : "Yes, delete"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delete Button */}
                {!showDeleteConfirm && (
                  <div className="pt-4 border-t border-slate-200">
                    <Button
                      type="button"
                      onClick={handleDelete}
                      disabled={isPending || isDeleting}
                      variant="destructive"
                      className="w-full h-12 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete trip
                    </Button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isPending || isDeleting}
                    className="flex-1 h-12 rounded-xl border-slate-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || isDeleting}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Updating trip..." : "Update trip"}
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
