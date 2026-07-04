"use client";
// components/common/Sidebar.jsx
//
// Shared sidebar shell. Receives navItems as a prop so
// student and admin layouts can pass their own navigation.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";
import { auth } from "@/lib/firebase/config";

export default function Sidebar({ navItems, user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  return (
    <aside className="w-64 min-h-screen bg-[#1e3a5f] flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-[#c8973a] rounded-lg flex items-center justify-center shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">UAAMS</p>
          <p className="text-white/50 text-xs">
            {user?.role === "university_admin" ? "Admin Portal" : "Student Portal"}
          </p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
  );
}
