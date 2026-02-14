"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  createAccommodationSchema,
  type CreateAccommodationInput,
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  useCreateAccommodation,
  getCreateAccommodationErrorMessage,
} from "@/hooks/use-accommodations";

interface CreateAccommodationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSuccess?: () => void;
}

export function CreateAccommodationDialog({
  open,
  onOpenChange,
  tripId,
  onSuccess,
}: CreateAccommodationDialogProps) {
  const { mutate: createAccommodation, isPending } = useCreateAccommodation();
  const [newLink, setNewLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const form = useForm<CreateAccommodationInput>({
    resolver: zodResolver(createAccommodationSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      checkIn: "",
      checkOut: "",
      links: [],
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setNewLink("");
      setLinkError(null);
    }
  }, [open, form]);

  const handleSubmit = (data: CreateAccommodationInput) => {
    createAccommodation(
      { tripId, data },
      {
        onSuccess: () => {
          toast.success("Accommodation created successfully");
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(
            getCreateAccommodationErrorMessage(error) ??
              "An unexpected error occurred.",
          );
        },
      },
    );
  };

  const handleAddLink = () => {
    setLinkError(null);

    if (!newLink.trim()) {
      setLinkError("URL is required");
      return;
    }

    try {
      new URL(newLink);
    } catch {
      setLinkError("Please enter a valid URL");
      return;
    }

    const currentLinks = form.getValues("links") || [];
    if (currentLinks.length >= 10) {
      setLinkError("Maximum 10 links allowed");
      return;
    }

    if (currentLinks.includes(newLink)) {
      setLinkError("This URL is already added");
      return;
    }

    form.setValue("links", [...currentLinks, newLink]);
    setNewLink("");
  };

  const handleRemoveLink = (linkToRemove: string) => {
    const currentLinks = form.getValues("links") || [];
    form.setValue(
      "links",
      currentLinks.filter((link) => link !== linkToRemove),
    );
  };

  const links = form.watch("links") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
            Create a new accommodation
          </DialogTitle>
          <DialogDescription>
            Add an accommodation to your trip itinerary
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Accommodation Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground">
                    Accommodation name
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Oceanview Hotel"
                      className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground">
                    Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="123 Beach Blvd, Miami Beach, FL 33139"
                      className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Check-in and Check-out Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-foreground">
                      Check-in date
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Check-in"
                        aria-label="Check-in date"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-foreground">
                      Check-out date
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Check-out"
                        aria-label="Check-out date"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        placeholder="Tell your group about this accommodation..."
                        className="h-32 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl resize-none"
                        disabled={isPending}
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
                      Optional: Share details about the accommodation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Links */}
            <FormField
              control={form.control}
              name="links"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground">
                    Links
                  </FormLabel>
                  <FormDescription className="text-sm text-muted-foreground">
                    Add related links (booking confirmation, hotel website,
                    etc.)
                  </FormDescription>

                  {/* List of added links */}
                  {links.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {links.map((link) => (
                        <div
                          key={link}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border"
                        >
                          <span className="text-sm font-medium text-foreground truncate">
                            {link}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLink(link)}
                            disabled={isPending}
                            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted"
                            aria-label={`Remove ${link}`}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add link input */}
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        value={newLink}
                        onChange={(e) => {
                          setNewLink(e.target.value);
                          setLinkError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddLink();
                          }
                        }}
                        disabled={isPending}
                        className="flex-1 h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl"
                        aria-label="Link URL"
                      />
                      <Button
                        type="button"
                        onClick={handleAddLink}
                        disabled={isPending}
                        className="h-12 px-4 bg-muted hover:bg-muted text-foreground rounded-xl"
                        variant="outline"
                        aria-label="Add link"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                    {linkError && (
                      <p className="text-sm text-destructive">{linkError}</p>
                    )}
                  </div>

                  <FormMessage />
                </FormItem>
              )}
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
                {isPending ? "Creating..." : "Create accommodation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
