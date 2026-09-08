"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import { loginUser } from "@/lib/firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]             = useState({ email: "", password: "" });
  const [showPass, setShowPass]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const firebaseUser = await loginUser(form.email.trim(), form.password);
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      const role = userDoc.exists() ? userDoc.data().role : null;

      if (role === "university_admin") {
        router.push("/admin-dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      setErrorMessage(error?.message || "We couldn't sign you in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">Welcome back</h1>
      <p className="text-[#64748b] text-sm mb-6">Sign in to your account to continue.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1a202c] mb-1">
            Email address
          </label>
          <input
            id="email" name="email" type="email" required
            autoComplete="email" disabled={isSubmitting}
            value={form.email} onChange={handleChange}
            placeholder="you@email.com"
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent
                       placeholder:text-[#64748b]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-[#1a202c]">
              Password
            </label>
            <button type="button" onClick={() => setShowPass((s) => !s)}
              className="text-xs text-[#2a5298] hover:underline">
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="password" name="password" type={showPass ? "text" : "password"} required
            autoComplete="current-password" disabled={isSubmitting}
            value={form.password} onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent
                       placeholder:text-[#64748b]"
          />
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-[#2a5298] hover:underline">
            Forgot your password?
          </Link>
        </div>

        {errorMessage && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMessage}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#64748b] mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#2a5298] font-medium hover:underline">
          Register here
        </Link>
      </p>
    </>
  );
}