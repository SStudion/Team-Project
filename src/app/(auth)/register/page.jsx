"use client";
// app/(auth)/register/page.jsx

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import { STUDY_LEVELS } from "@/constants";
import { registerUser } from "@/lib/firebase/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName:      "",
    email:         "",
    password:      "",
    nationality:   "",
    intendedLevel: "",
    privacyPolicy: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await registerUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        nationality: form.nationality.trim(),
        intendedLevelOfStudy: form.intendedLevel,
      });

      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(error?.message || "We couldn't create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent " +
    "placeholder:text-[#64748b]";

  return (
    <>
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">Create your account</h1>
      <p className="text-[#64748b] text-sm mb-6">Start managing your university applications.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-[#1a202c] mb-1">
            Full name
          </label>
          <input
            id="fullName" name="fullName" type="text" required
            disabled={isSubmitting}
            value={form.fullName} onChange={handleChange}
            placeholder="Your full name"
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1a202c] mb-1">
            Email address
          </label>
          <input
            id="email" name="email" type="email" required
            autoComplete="email"
            disabled={isSubmitting}
            value={form.email} onChange={handleChange}
            placeholder="you@email.com"
            className={inputClass}
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-[#1a202c]">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="text-xs text-[#2a5298] hover:underline"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="password" name="password" type={showPass ? "text" : "password"} required
            autoComplete="new-password"
            disabled={isSubmitting}
            value={form.password} onChange={handleChange}
            placeholder="At least 8 characters"
            minLength={8}
            className={inputClass}
          />
        </div>

        {/* Nationality */}
        <div>
          <label htmlFor="nationality" className="block text-sm font-medium text-[#1a202c] mb-1">
            Nationality
          </label>
          <input
            id="nationality" name="nationality" type="text" required
            disabled={isSubmitting}
            value={form.nationality} onChange={handleChange}
            placeholder="e.g. British, Romanian"
            className={inputClass}
          />
        </div>

        {/* Intended level of study */}
        <div>
          <label htmlFor="intendedLevel" className="block text-sm font-medium text-[#1a202c] mb-1">
            Intended level of study
          </label>
          <select
            id="intendedLevel" name="intendedLevel" required
            disabled={isSubmitting}
            value={form.intendedLevel} onChange={handleChange}
            className={inputClass + " bg-white"}
          >
            <option value="">Select a level</option>
            {STUDY_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Privacy policy */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            name="privacyPolicy" type="checkbox" required
            disabled={isSubmitting}
            checked={form.privacyPolicy} onChange={handleChange}
            className="mt-0.5 accent-[#1e3a5f]"
          />
          <span className="text-sm text-[#64748b]">
            I agree to the{" "}
            <Link href="#" className="text-[#2a5298] hover:underline">Privacy Policy</Link>
            {" "}and{" "}
            <Link href="#" className="text-[#2a5298] hover:underline">Terms of Use</Link>
          </span>
        </label>

        {errorMessage && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMessage}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#64748b] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#2a5298] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
