"use client";
// components/common/Sidebar.jsx
//
// Shared sidebar shell. Receives navItems as a prop so
// student and admin layouts can pass their own navigation.
//
// Responsive: at lg (1024px) and up this renders as the classic static
// column. Below that — phones and most tablets in portrait — it becomes a
// slide-in drawer behind a hamburger button, because a permanently-visible
// 256px column leaves almost nothing for content on a 375px phone screen.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { GraduationCap, Menu, X } from "lucide-react";
import { auth } from "@/lib/firebase/config";

export default function Sidebar({ navItems, user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // A tap on a nav link should close the drawer — otherwise the overlay is
  // still up behind the page that just loaded. Adjusted during render
  // (React's own pattern for "reset state when a prop/value changes")
  // rather than in an effect — this fires before paint, on the very render
  // where pathname changes, instead of one render later via a post-commit
  // effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  return (
    <>
      {/* Mobile top bar — only rendered below lg, replaces the static sidebar's logo row */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#1e3a5f] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-[#c8973a] rounded-md flex items-center justify-center shrink-0">
            <GraduationCap size={16} className="text-white" />
          </div>
          <p className="text-white font-semibold text-sm truncate">UAAMS</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-white/90 hover:text-white p-1 shrink-0"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop behind the open drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          aria-hidden="true"
        />
      )}

      {/* The sidebar itself: fixed slide-in drawer below lg, static column from lg up */}
      <aside
        className={cn(
          "w-64 bg-[#1e3a5f] flex flex-col shrink-0 z-50",
          "fixed inset-y-0 left-0 transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0 lg:min-h-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo (desktop) / close button (mobile) */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-[#c8973a] rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">UAAMS</p>
              <p className="text-white/50 text-xs truncate">
                {user?.role === "university_admin" ? "Admin Portal" : "Student Portal"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="lg:hidden text-white/70 hover:text-white shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        {user && (
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c8973a] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {user.fullName?.charAt(0) ?? "U"}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-xs font-medium truncate">{user.fullName}</p>
                <p className="text-white/50 text-xs truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-white/80 hover:text-white hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
