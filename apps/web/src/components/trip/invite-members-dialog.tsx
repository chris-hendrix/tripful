"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createInvitationsSchema,
  PHONE_REGEX,
  type CreateInvitationsInput,
} from "@tripful/shared/schemas";
import {
  useInviteMembers,
  getInviteMembersErrorMessage,
} from "@/hooks/use-invitations";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { Loader2, X, UserPlus, Phone } from "lucide-react";
import { formatPhoneNumber } from "@/lib/format";

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
}

export function InviteMembersDialog({
  open,
  onOpenChange,
  tripId,
}: InviteMembersDialogProps) {
  const [currentPhone, setCurrentPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const { mutate: inviteMembers, isPending } = useInviteMembers(tripId);

  const form = useForm<CreateInvitationsInput>({
    resolver: zodResolver(createInvitationsSchema),
    defaultValues: {
      phoneNumbers: [],
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({ phoneNumbers: [] });
      setCurrentPhone("");
      setPhoneError(null);
    }
  }, [open, form]);

  const handleAddPhone = () => {
    setPhoneError(null);

    if (!currentPhone.trim()) {
      setPhoneError("Phone number is required");
      return;
    }

    if (!PHONE_REGEX.test(currentPhone)) {
      setPhoneError(
        "Phone number must be in E.164 format (e.g., +14155552671)",
      );
      return;
    }

    const currentPhones = form.getValues("phoneNumbers") || [];
    if (currentPhones.includes(currentPhone)) {
      setPhoneError("This phone number is already added");
      return;
    }

    form.setValue("phoneNumbers", [...currentPhones, currentPhone]);
    setCurrentPhone("");
  };

  const handleRemovePhone = (phoneToRemove: string) => {
    const currentPhones = form.getValues("phoneNumbers") || [];
    form.setValue(
      "phoneNumbers",
      currentPhones.filter((phone) => phone !== phoneToRemove),
    );
  };

  const handleSubmit = (data: CreateInvitationsInput) => {
    inviteMembers(data, {
      onSuccess: (response) => {
        const invitedCount = response.invitations.length;
        const skippedCount = response.skipped.length;
        let message = `${invitedCount} invitation${invitedCount !== 1 ? "s" : ""} sent`;
        if (skippedCount > 0) {
          message += ` (${skippedCount} already invited)`;
        }
        toast.success(message);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(
          getInviteMembersErrorMessage(error) ??
            "An unexpected error occurred.",
        );
      },
    });
  };

  const phoneNumbers = form.watch("phoneNumbers");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
            Invite members
          </SheetTitle>
          <SheetDescription>
            Add phone numbers of people you want to invite to this trip
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6 pb-6"
            >
              <FormField
                control={form.control}
                name="phoneNumbers"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-foreground">
                      Phone numbers
                    </FormLabel>

                    {/* Phone chips */}
                    {phoneNumbers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {phoneNumbers.map((phone) => (
                          <Badge
                            key={phone}
                            variant="secondary"
                            className="px-3 py-1.5 text-sm gap-1.5"
                          >
                            <Phone className="w-3 h-3" />
                            {formatPhoneNumber(phone)}
                            <button
                              type="button"
                              onClick={() => handleRemovePhone(phone)}
                              disabled={isPending}
                              className="ml-1 hover:text-destructive transition-colors"
                              aria-label={`Remove ${phone}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Phone input */}
                    <div className="space-y-2 mt-2">
                      <div
                        className="flex gap-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPhone();
                          }
                        }}
                      >
                        <FormControl>
                          <PhoneInput
                            value={currentPhone}
                            onChange={(val) => {
                              setCurrentPhone(val || "");
                              setPhoneError(null);
                            }}
                            disabled={isPending}
                            placeholder="Enter phone number"
                            className="flex-1 h-12 rounded-xl"
                            aria-describedby={
                              phoneError ? "invite-phone-error" : undefined
                            }
                          />
                        </FormControl>
                        <Button
                          type="button"
                          onClick={handleAddPhone}
                          disabled={isPending}
                          variant="outline"
                          className="h-12 px-4 rounded-xl"
                        >
                          <UserPlus className="w-5 h-5" />
                          Add
                        </Button>
                      </div>
                      {phoneError && (
                        <p
                          id="invite-phone-error"
                          aria-live="polite"
                          className="text-sm text-destructive"
                        >
                          {phoneError}
                        </p>
                      )}
                      {phoneNumbers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {phoneNumbers.length} phone number
                          {phoneNumbers.length !== 1 ? "s" : ""} added
                        </p>
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
                  disabled={isPending || phoneNumbers.length === 0}
                  variant="gradient"
                  className="flex-1 h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {isPending ? "Sending invitations..." : "Send invitations"}
                </Button>
              </div>
            </form>
          </Form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
