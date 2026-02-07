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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ImageUpload } from "@/components/trip/image-upload";
import { Trash2, Loader2 } from "lucide-react";
import { TIMEZONES } from "@/lib/constants";

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onSuccess?: () => void;
}

export function EditTripDialog({
  open,
  onOpenChange,
  trip,
  onSuccess,
}: EditTripDialogProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const { mutate: updateTrip, isPending } = useUpdateTrip();
  const { mutate: cancelTrip, isPending: isDeleting } = useCancelTrip();

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
  };

  const handleSubmit = (data: UpdateTripInput) => {
    form.clearErrors("root");
    updateTrip(
      { tripId: trip.id, data },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          form.setError("root", {
            message:
              getUpdateTripErrorMessage(error) ??
              "An unexpected error occurred.",
          });
        },
      },
    );
  };

  const handleDelete = () => {
    cancelTrip(trip.id, {
      onError: (error) => {
        form.setError("root", {
          message:
            getCancelTripErrorMessage(error) ?? "An unexpected error occurred.",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
            Edit trip
          </DialogTitle>
          <DialogDescription>
            Update your trip details and settings
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              {currentStep === 1 ? "Basic information" : "Details & settings"}
            </span>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 2
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Step 1 circle */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                currentStep >= 1
                  ? "bg-gradient-to-r from-primary to-accent text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              1
            </div>

            {/* Connecting line */}
            <div
              className={`flex-1 h-0.5 transition-colors ${
                currentStep >= 2
                  ? "bg-gradient-to-r from-primary to-accent"
                  : "bg-muted"
              }`}
            />

            {/* Step 2 circle */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                currentStep >= 2
                  ? "bg-gradient-to-r from-primary to-accent text-white"
                  : "bg-muted text-muted-foreground"
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
                      <FormLabel className="text-base font-semibold text-foreground">
                        Trip name
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Bachelor Party in Miami"
                          className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
                          disabled={isPending || isDeleting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
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
                      <FormLabel className="text-base font-semibold text-foreground">
                        Destination
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Miami Beach, FL"
                          className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
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
                        <FormLabel className="text-base font-semibold text-foreground">
                          Start date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
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
                        <FormLabel className="text-base font-semibold text-foreground">
                          End date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
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
                    return (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-foreground">
                          Trip timezone
                          <span className="text-destructive ml-1">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          disabled={isPending || isDeleting}
                        >
                          <FormControl>
                            <SelectTrigger
                              ref={field.ref}
                              onBlur={field.onBlur}
                              className="h-12 text-base rounded-xl"
                            >
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
                        <FormDescription className="text-sm text-muted-foreground">
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
                    variant="gradient"
                    className="h-12 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <FormLabel className="text-base font-semibold text-foreground">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell your group about this trip..."
                            className="h-32 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl resize-none"
                            disabled={isPending || isDeleting}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        {showCounter && (
                          <div className="text-xs text-muted-foreground text-right">
                            {charCount} / 2000 characters
                          </div>
                        )}
                        <FormDescription className="text-sm text-muted-foreground">
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
                      <FormLabel className="text-base font-semibold text-foreground">
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
                      <FormDescription className="text-sm text-muted-foreground">
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          name={field.name}
                          disabled={isPending || isDeleting}
                          aria-label="Allow members to add events"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base font-semibold text-foreground cursor-pointer">
                          Allow members to add events
                        </FormLabel>
                        <FormDescription className="text-sm text-muted-foreground">
                          Let trip members create and propose events for the
                          itinerary
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Root error message */}
                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                )}

                {/* Delete Button with AlertDialog */}
                <div className="pt-4 border-t border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        disabled={isPending || isDeleting}
                        variant="destructive"
                        className="w-full h-12 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete trip
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to delete this trip?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          {isDeleting && (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          )}
                          {isDeleting ? "Deleting..." : "Yes, delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isPending || isDeleting}
                    className="flex-1 h-12 rounded-xl border-input"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || isDeleting}
                    variant="gradient"
                    className="flex-1 h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
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
