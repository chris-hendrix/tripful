"use client";

/**
 * Authentication Screen - Phone Verification
 *
 * Design: Modern Travel Editorial
 * - Playfair Display headlines with DM Sans body
 * - Ocean-to-sunset gradient background with texture overlay
 * - Asymmetric layout with bold typography
 * - Smooth animations on state transitions
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";

export default function AuthenticationScreen() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-amber-950">
      {/* Texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradient orbs for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Branding */}
          <div className="text-center space-y-4 text-white animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1
              className="text-5xl font-serif leading-tight tracking-tight"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              Plan trips,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-amber-300">
                together
              </span>
            </h1>
            <p className="text-lg text-slate-300 font-light">
              Collaborative trip planning made simple
            </p>
          </div>

          {/* Auth form */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 max-w-md mx-auto border border-slate-200/50">
              {step === "phone" ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
                      Get started
                    </h2>
                    <p className="text-slate-600">
                      Enter your phone number to sign in or create an account
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setStep("code");
                    }}
                    className="space-y-6"
                  >
                    <Field>
                      <FieldLabel
                        htmlFor="phone"
                        className="text-sm font-medium text-slate-900"
                      >
                        Phone number
                      </FieldLabel>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <FieldDescription className="text-xs text-slate-500">
                        We'll send you a verification code via SMS
                      </FieldDescription>
                    </Field>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
                    >
                      Continue
                    </Button>
                  </form>

                  <p className="text-xs text-center text-slate-500">
                    By continuing, you agree to our Terms of Service and Privacy
                    Policy
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
                      Verify your number
                    </h2>
                    <p className="text-slate-600">
                      Enter the 6-digit code sent to
                      <br />
                      <span className="font-medium text-slate-900">
                        {phone}
                      </span>
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="space-y-6"
                  >
                    <Field>
                      <FieldLabel
                        htmlFor="code"
                        className="text-sm font-medium text-slate-900"
                      >
                        Verification code
                      </FieldLabel>
                      <Input
                        id="code"
                        type="text"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={6}
                        className="h-12 text-center text-2xl tracking-widest font-mono border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </Field>

                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
                      >
                        Verify & Continue
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("phone")}
                        className="w-full h-12 border-slate-300 hover:bg-slate-50 rounded-xl"
                      >
                        Change number
                      </Button>
                    </div>
                  </form>

                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    Resend code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
