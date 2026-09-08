"use client";
// components/common/EmailVerificationBanner.jsx
//
// Shown at the top of the student area for any account whose email isn't
// verified yet. Lets the student resend the link and re-check their status
// without having to sign out/in again.
//
// Rendered by the (student) layout, above the header, so it appears on every
// page inside that route group as long as the account is unverified.

import { useEffect, useRef, useState } from "react";
import { Mail, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { resendVerificationEmail } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN_SECONDS = 60;
const DISMISS_KEY = "uaams:verification-banner-dismissed";

export default function EmailVerificationBanner() {
  const { user, loading, refreshUser } = useAuth();

  // Computed once, synchronously, during the first render — a lazy
  // useState initializer rather than an effect, so there's no extra render
  // pass and no post-mount flash where the real dismissed value briefly
  // differs from what's shown.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "success" | "error", text }
  const intervalRef = useRef(null);

  // The per-session dismissal is read once above (lazy useState initializer).
  // A student who closes the banner shouldn't have it pop back up on every
  // click while they're still finishing registration — but it comes back
  // next time they sign in if they're still unverified, since it's
  // sessionStorage, not localStorage.

  // If the student verifies in another tab and comes back to this one,
  // silently re-check so the banner clears itself without them having to
  // click anything.
  useEffect(() => {
    function handleFocus() {
      if (user && !user.emailVerified) refreshUser();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, refreshUser]);

  useEffect(() => {
    if (cooldown <= 0) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [cooldown]);

  if (loading || !user || user.emailVerified || dismissed) return null;

  async function handleResend() {
    setFeedback(null);
    setIsSending(true);
    try {
      await resendVerificationEmail();
      setFeedback({ type: "success", text: "Verification email sent — check your inbox." });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setFeedback({ type: "error", text: error?.message || "Couldn't send the email. Try again shortly." });
    } finally {
      setIsSending(false);
    }
  }

  async function handleCheckAgain() {
    setFeedback(null);
    setIsChecking(true);
    try {
      // refreshUser() reloads the Firebase user and returns the fresh flag —
      // we use that return value directly rather than reading `user` again,
      // since the context update from this same call hasn't re-rendered us
      // yet at this point in the function.
      const verified = await refreshUser();
      if (!verified) {
        setFeedback({ type: "error", text: "Still not verified — check your inbox (and spam folder)." });
      }
    } catch {
      setFeedback({ type: "error", text: "Couldn't check right now. Try again shortly." });
    } finally {
      setIsChecking(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // sessionStorage can be unavailable (private mode, etc.) — dismissal
      // just won't persist across pages, which is a fine fallback.
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
      <div className="flex items-start gap-3">
        <Mail size={18} className="text-amber-600 mt-0.5 shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Please verify your email.</span>{" "}
            We sent a confirmation link to{" "}
            <span className="font-medium">{user.email}</span>. You can keep using UAAMS in the
            meantime, but verify soon to make sure you don&apos;t miss application updates.
          </p>

          {feedback && (
            <p className={cn("text-xs mt-1", feedback.type === "success" ? "text-green-700" : "text-red-700")}>
              {feedback.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
              className="text-xs font-medium text-amber-800 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
            >
              {isSending
                ? "Sending..."
                : cooldown > 0
                ? `Resend email (${cooldown}s)`
                : "Resend verification email"}
            </button>

            <button
              type="button"
              onClick={handleCheckAgain}
              disabled={isChecking}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={isChecking ? "animate-spin" : ""} />
              {isChecking ? "Checking..." : "I've verified — check again"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-amber-500 hover:text-amber-700 shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
