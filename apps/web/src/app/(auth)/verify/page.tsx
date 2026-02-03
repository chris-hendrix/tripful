'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyCodeSchema, type VerifyCodeInput } from '@tripful/shared';
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

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone') || '';
  const { verify, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<VerifyCodeInput>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      phoneNumber,
      code: '',
    },
  });

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  async function onSubmit(data: VerifyCodeInput) {
    try {
      setIsSubmitting(true);
      const result = await verify(data.phoneNumber, data.code);

      if (result.requiresProfile) {
        router.push('/complete-profile');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      form.setError('code', {
        message: error instanceof Error ? error.message : 'Verification failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    try {
      setIsResending(true);
      await login(phoneNumber);
      form.setError('code', {
        message: 'A new code has been sent to your phone',
      });
      form.setValue('code', '');
    } catch (error) {
      form.setError('code', {
        message: error instanceof Error ? error.message : 'Failed to resend code',
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Verify your number
            </h2>
            <p className="text-slate-600">
              Enter the 6-digit code sent to{' '}
              <span className="font-semibold text-slate-900">{phoneNumber}</span>
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-900">
                      Verification code
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="000000"
                        className="h-14 text-2xl font-mono text-center tracking-widest border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isSubmitting}
                        maxLength={6}
                        {...field}
                        ref={(e) => {
                          field.ref(e);
                          inputRef.current = e;
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Check your SMS messages for the code
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
                {isSubmitting ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
          </Form>

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Change number
            </Link>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Sending...' : 'Resend code'}
            </button>
          </div>

          <p className="text-xs text-center text-slate-500">
            Didn&apos;t receive the code? Wait a moment and try resending
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyPageContent />
    </Suspense>
  );
}
