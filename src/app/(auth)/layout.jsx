// app/(auth)/layout.jsx
// Layout for Login and Register pages.
// Clean centered layout — no sidebar, no nav.

import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2a5298] flex flex-col items-center justify-center p-4">
      {/* Brand mark */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#c8973a] rounded-xl flex items-center justify-center">
          <GraduationCap size={22} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">UAAMS</p>
          <p className="text-white/60 text-xs">University Application Management</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {children}
      </div>

      <p className="text-white/40 text-xs mt-6">
        © 2025 UAAMS. All rights reserved.
      </p>
    </div>
  );
}
