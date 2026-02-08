"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createMemberTravelSchema,
  type CreateMemberTravelInput,
} from "@tripful/shared/schemas";
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
import { Button } from "@/components/ui/button";
import {
  useCreateMemberTravel,
  getCreateMemberTravelErrorMessage,
} from "@/hooks/use-member-travel";

interface CreateMemberTravelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSuccess?: () => void;
}

export function CreateMemberTravelDialog({
  open,
  onOpenChange,
  tripId,
  onSuccess,
}: CreateMemberTravelDialogProps) {
  const { mutate: createMemberTravel, isPending } = useCreateMemberTravel();

  const form = useForm<CreateMemberTravelInput>({
    resolver: zodResolver(createMemberTravelSchema),
    defaultValues: {
      travelType: "arrival",
      time: "",
      location: "",
      details: "",
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const handleSubmit = (data: CreateMemberTravelInput) => {
    createMemberTravel(
      { tripId, data },
      {
        onSuccess: () => {
          toast.success("Travel details added successfully");
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(
            getCreateMemberTravelErrorMessage(error) ??
              "An unexpected error occurred."
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
            Add your travel details
          </DialogTitle>
          <DialogDescription>
            Share your arrival or departure information with the group
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Travel Type */}
            <FormField
              control={form.control}
              name="travelType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-semibold text-foreground">
                    Travel type
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-4" role="radiogroup" aria-labelledby="travel-type-label">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="arrival"
                          checked={field.value === "arrival"}
                          onChange={() => field.onChange("arrival")}
                          disabled={isPending}
                          className="w-4 h-4"
                          aria-label="Arrival"
                        />
                        <span className="text-sm font-medium">Arrival</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="departure"
                          checked={field.value === "departure"}
                          onChange={() => field.onChange("departure")}
                          disabled={isPending}
                          className="w-4 h-4"
                          aria-label="Departure"
                        />
                        <span className="text-sm font-medium">Departure</span>
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time */}
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground">
                    Time
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
                      disabled={isPending}
                      value={
                        field.value
                          ? new Date(field.value).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) => {
                        const dateValue = e.target.value
                          ? new Date(e.target.value).toISOString()
                          : "";
                        field.onChange(dateValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground">
                    Location
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Miami International Airport (MIA)"
                      className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-muted-foreground">
                    Optional: Airport, station, or meeting point
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Details */}
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => {
                const charCount = field.value?.length || 0;
                const showCounter = charCount >= 400;

                return (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-foreground">
                      Details
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Flight number, terminal, or other relevant details..."
                        className="h-32 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl resize-none"
                        disabled={isPending}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    {showCounter && (
                      <div className="text-xs text-muted-foreground text-right">
                        {charCount} / 500 characters
                      </div>
                    )}
                    <FormDescription className="text-sm text-muted-foreground">
                      Optional: Share additional travel details
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="flex-1 h-12 rounded-xl border-input"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                variant="gradient"
                className="flex-1 h-12 rounded-xl"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isPending ? "Adding..." : "Add travel details"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
