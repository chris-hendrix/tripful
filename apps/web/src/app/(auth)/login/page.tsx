'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { requestCodeSchema, type RequestCodeInput } from '@tripful/shared';
import { useAuth } from '@/app/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestCodeInput>({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  async function onSubmit(data: RequestCodeInput) {
    try {
      setIsSubmitting(true);
      await login(data.phoneNumber);
      router.push(`/verify?phone=${encodeURIComponent(data.phoneNumber)}`);
    } catch (error) {
      form.setError('phoneNumber', {
        message: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Get started
            </h2>
            <p className="text-slate-600">
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
                    <FormLabel className="text-sm font-medium text-slate-900">
                      Phone number
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      We&apos;ll send you a verification code via SMS
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
                {isSubmitting ? 'Sending...' : 'Continue'}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-slate-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
