"use client";
// app/(admin)/layout.jsx

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, FileText, Users } from "lucide-react";

const adminNavItems = [
  { href: "/admin-dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin-applications", label: "Applications", icon: FileText },
  { href: "/admin-students", label: "Students", icon: Users },
];

export default function AdminLayout({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  // UX/defence-in-depth only — requireAdmin and firestore.rules remain the
  // real authorisation boundary regardless of this guard.
  //
  // "Wrong portal" is anything but a *confirmed* admin — that includes a
  // real student AND a roleless/profile-error account (AuthContext's catch
  // block falls back to role: null). This mirrors the login page's own
  // "anything but confirmed admin defaults to student" convention, so a
  // broken profile lands on the student portal rather than sitting in the
  // admin one. It's deliberately asymmetric with the student layout below
  // (which only redirects a *confirmed* admin) — that asymmetry is what
  // stops the two layouts from bouncing a roleless user back and forth.
  const isWrongPortal = !loading && !!user && !isAdmin;

  useEffect(() => {
    if (isWrongPortal) {
      router.replace("/dashboard");
    }
  }, [isWrongPortal, router]);

  // While auth/profile resolution is still in flight, `loading` starts
  // `true` on every fresh load (SSR has no access to the browser's Firebase
  // session, and the client's own onAuthStateChanged + profile read are both
  // async) — during that window isWrongPortal above is always false, which
  // previously meant this fell through and rendered the real admin shell +
  // page for anyone, including a student, until the role resolved a moment
  // later. That's the exact bug: the child page (and its own authenticated
  // fetch) had already mounted by the time the redirect fired. Render
  // nothing until we actually know the role.
  if (loading) return null;

  if (isWrongPortal) return null;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8f9fb]">
      <Sidebar navItems={adminNavItems} user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-4 sm:px-6 shrink-0">
          <p className="text-sm text-[#64748b] truncate">
            Admin Portal —{" "}
            <span className="font-medium text-[#1a202c]">Southampton Solent University</span>
          </p>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
