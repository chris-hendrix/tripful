"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  completeProfileSchema,
  type CompleteProfileInput,
} from "@tripful/shared";
import { useAuth } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMEZONES } from "@/lib/constants";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { completeProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      displayName: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  async function onSubmit(data: CompleteProfileInput) {
    try {
      setIsSubmitting(true);
      const payload: { displayName: string; timezone?: string } = {
        displayName: data.displayName,
      };
      if (data.timezone) {
        payload.timezone = data.timezone;
      }
      await completeProfile(payload);
      router.push("/dashboard");
    } catch (error) {
      form.setError("displayName", {
        message:
          error instanceof Error && error.message
            ? error.message
            : "Failed to complete profile",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card rounded-3xl shadow-2xl p-8 lg:p-12 border border-border/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              Complete your profile
            </h1>
            <p className="text-muted-foreground">
              Tell us a bit about yourself to get started
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Display name
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring"
                        disabled={isSubmitting}
                        autoComplete="name"
                        aria-required="true"
                        {...field}
                        ref={(e) => {
                          field.ref(e);
                          inputRef.current = e;
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      This is how others will see you on the platform
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Timezone
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          className="h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring"
                        >
                          <SelectValue placeholder="Select your timezone" />
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
                    <FormDescription className="text-xs text-muted-foreground">
                      Used to show you times in your local timezone
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="gradient"
                className="w-full h-12 rounded-xl"
              >
                {isSubmitting ? "Saving..." : "Complete profile"}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-muted-foreground">
            You can update this information later in your settings
          </p>
        </div>
      </div>
    </div>
  );
}
