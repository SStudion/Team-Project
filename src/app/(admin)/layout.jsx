"use client";
// app/(admin)/layout.jsx

import Sidebar from "@/components/common/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, FileText, Users } from "lucide-react";

const adminNavItems = [
  { href: "/admin-dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin-applications", label: "Applications", icon: FileText },
  { href: "/admin-students", label: "Students", icon: Users },
];

export default function AdminLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#f8f9fb]">
      <Sidebar navItems={adminNavItems} user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-6 shrink-0">
          <p className="text-sm text-[#64748b]">
            Admin Portal —{" "}
            <span className="font-medium text-[#1a202c]">Southampton Solent University</span>
          </p>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
