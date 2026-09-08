"use client";
// app/(student)/layout.jsx
// Layout for all student pages. Renders sidebar + main content area.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import EmailVerificationBanner from "@/components/common/EmailVerificationBanner";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, FileText, PlusCircle, Bell } from "lucide-react";

const studentNavItems = [
  { href: "/dashboard",        label: "Dashboard",       icon: LayoutDashboard },
  { href: "/applications",     label: "My Applications", icon: FileText },
  { href: "/applications/new", label: "New Application", icon: PlusCircle },
  { href: "/notifications",    label: "Notifications",   icon: Bell },
];

export default function StudentLayout({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  // UX/defence-in-depth only — requireStudent-equivalent checks and
  // firestore.rules remain the real authorisation boundary.
  //
  // Only a *confirmed* admin is "wrong" here (not "anything but a confirmed
  // student") — a roleless/profile-error account is deliberately left alone
  // by this layout. The admin layout already redirects anything but a
  // confirmed admin to here, so a roleless user always has somewhere to
  // land; if this layout also redirected them away for not being a
  // confirmed student, the two layouts would bounce that user back and
  // forth forever.
  const isWrongPortal = !loading && !!user && isAdmin;

  useEffect(() => {
    if (isWrongPortal) {
      router.replace("/admin-dashboard");
    }
  }, [isWrongPortal, router]);

  // See the matching comment in (admin)/layout.jsx: rendering the real
  // student shell + page while role is still unresolved is what let a
  // wrong-role user's browser mount protected content before the redirect
  // above could react. Render nothing until the role is actually known.
  if (loading) return null;

  if (isWrongPortal) return null;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8f9fb]">
      <Sidebar navItems={studentNavItems} user={user} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <EmailVerificationBanner />

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-4 sm:px-6 shrink-0">
          <p className="text-sm text-[#64748b] truncate">
            Welcome back,{" "}
            <span className="font-medium text-[#1a202c]">{user?.fullName}</span>
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
