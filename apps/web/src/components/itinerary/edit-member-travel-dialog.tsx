"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateMemberTravelSchema,
  type UpdateMemberTravelInput,
} from "@tripful/shared/schemas";
import type { MemberTravel } from "@tripful/shared/types";
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
import {
  useUpdateMemberTravel,
  getUpdateMemberTravelErrorMessage,
  useDeleteMemberTravel,
  getDeleteMemberTravelErrorMessage,
} from "@/hooks/use-member-travel";

interface EditMemberTravelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberTravel: MemberTravel;
  onSuccess?: () => void;
}

export function EditMemberTravelDialog({
  open,
  onOpenChange,
  memberTravel,
  onSuccess,
}: EditMemberTravelDialogProps) {
  const { mutate: updateMemberTravel, isPending } = useUpdateMemberTravel();
  const { mutate: deleteMemberTravel, isPending: isDeleting } =
    useDeleteMemberTravel();

  const form = useForm<UpdateMemberTravelInput>({
    resolver: zodResolver(updateMemberTravelSchema),
    defaultValues: {
      travelType: "arrival",
      time: "",
      location: "",
      details: "",
    },
  });

  // Pre-populate form with existing member travel data when dialog opens
  useEffect(() => {
    if (open && memberTravel) {
      form.reset({
        travelType: memberTravel.travelType,
        time: memberTravel.time
          ? new Date(memberTravel.time).toISOString()
          : "",
        location: memberTravel.location || "",
        details: memberTravel.details || "",
      });
    }
  }, [open, memberTravel, form]);

  const handleSubmit = (data: UpdateMemberTravelInput) => {
    updateMemberTravel(
      { memberTravelId: memberTravel.id, data },
      {
        onSuccess: () => {
          toast.success("Travel details updated successfully");
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(
            getUpdateMemberTravelErrorMessage(error) ??
              "An unexpected error occurred."
          );
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMemberTravel(memberTravel.id, {
      onSuccess: () => {
        toast.success("Travel details deleted");
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(
          getDeleteMemberTravelErrorMessage(error) ??
            "Failed to delete travel details"
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
            Edit travel details
          </DialogTitle>
          <DialogDescription>Update your travel information</DialogDescription>
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
                          disabled={isPending || isDeleting}
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
                          disabled={isPending || isDeleting}
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
                      disabled={isPending || isDeleting}
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
                      disabled={isPending || isDeleting}
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
                        disabled={isPending || isDeleting}
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
                disabled={isPending || isDeleting}
                className="flex-1 h-12 rounded-xl border-input"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || isDeleting}
                variant="gradient"
                className="flex-1 h-12 rounded-xl"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isPending ? "Updating..." : "Update travel details"}
              </Button>
            </div>

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
                    Delete travel details
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete your travel details. You can add them
                      again later.
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
