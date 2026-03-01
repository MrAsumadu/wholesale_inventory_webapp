"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";

type FormState = "idle" | "submitting" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("submitting");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setFormState("error");
      setErrorMessage(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-[360px] stagger-children">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground tracking-tight">
          Sign in
        </h2>
        <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
          Enter your credentials to access the dashboard.
        </p>
      </div>

      {/* Auth error from callback */}
      {authError && formState === "idle" && (
        <div className="mt-6 flex items-center gap-2.5 text-sm text-destructive animate-fade-in-up">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Authentication failed. Please try again.</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={formState === "submitting"}
              className="pl-10 h-11"
              autoComplete="email"
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={formState === "submitting"}
              className="pl-10 h-11"
              autoComplete="current-password"
            />
          </div>
        </div>

        {/* Error */}
        {formState === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive animate-fade-in-up">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {errorMessage || "Something went wrong. Please try again."}
            </span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 press-effect"
          disabled={formState === "submitting"}
        >
          {formState === "submitting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  );
}
