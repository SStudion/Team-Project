"use client";
// app/(student)/layout.jsx
// Layout for all student pages. Renders sidebar + main content area.

import Sidebar from "@/components/common/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, FileText, PlusCircle, Bell } from "lucide-react";

const studentNavItems = [
  { href: "/dashboard",        label: "Dashboard",       icon: LayoutDashboard },
  { href: "/applications",     label: "My Applications", icon: FileText },
  { href: "/applications/new", label: "New Application", icon: PlusCircle },
  { href: "/notifications",    label: "Notifications",   icon: Bell },
];

export default function StudentLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#f8f9fb]">
      <Sidebar navItems={studentNavItems} user={user} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-6 shrink-0">
          <p className="text-sm text-[#64748b]">
            Welcome back,{" "}
            <span className="font-medium text-[#1a202c]">{user?.fullName}</span>
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
