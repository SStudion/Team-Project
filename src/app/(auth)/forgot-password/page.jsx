"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import Button from "@/components/common/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSubmitted(true);
    } catch {
      setError(
        "Could not send reset email. Please check the address and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <>
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">
          Check your inbox
        </h1>

        <p className="text-[#64748b] text-sm mb-6">
          We&apos;ve sent a password reset link to <strong>{email}</strong>.
          Check your inbox and follow the link to reset your password.
        </p>

        <Link href="/login">
          <Button className="w-full">Back to Sign in</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">
        Forgot your password?
      </h1>

      <p className="text-[#64748b] text-sm mb-6">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#1a202c] mb-1"
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="you@email.com"
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent
                       placeholder:text-[#64748b]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#64748b] mt-6">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-[#2a5298] font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}