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
      <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Complete your profile
            </h2>
            <p className="text-slate-600">
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
                    <FormLabel className="text-sm font-medium text-slate-900">
                      Display name
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isSubmitting}
                        {...field}
                        ref={(e) => {
                          field.ref(e);
                          inputRef.current = e;
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
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
                    <FormLabel className="text-sm font-medium text-slate-900">
                      Timezone
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      {...(field.value ? { defaultValue: field.value } : {})}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500">
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
                    <FormDescription className="text-xs text-slate-500">
                      Used to show you times in your local timezone
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
              >
                {isSubmitting ? "Saving..." : "Complete profile"}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-slate-500">
            You can update this information later in your settings
          </p>
        </div>
      </div>
    </div>
  );
}
