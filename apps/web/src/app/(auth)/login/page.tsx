"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { requestCodeSchema, type RequestCodeInput } from "@tripful/shared";
import { useAuth } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestCodeInput>({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  async function onSubmit(data: RequestCodeInput) {
    try {
      setIsSubmitting(true);
      await login(data.phoneNumber);
      router.push(`/verify?phone=${encodeURIComponent(data.phoneNumber)}`);
    } catch (error) {
      form.setError("phoneNumber", {
        message: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card rounded-3xl shadow-2xl p-8 lg:p-12 border border-border/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              Get started
            </h1>
            <p className="text-muted-foreground">
              Enter your phone number to sign in or create an account
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Phone number
                    </FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder="(555) 123-4567"
                        className="h-12 text-base"
                        defaultCountry="US"
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      We&apos;ll send you a verification code via SMS
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
                {isSubmitting ? "Sending..." : "Continue"}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
