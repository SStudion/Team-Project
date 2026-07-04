"use client";

import Card from "@/components/common/Card";
import { Users } from "lucide-react";

export default function AdminStudentsPage() {
  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Students</h1>
        <p className="text-sm text-[#64748b] mt-0.5">Student management coming soon.</p>
      </div>
      <Card className="text-center py-16">
        <Users size={32} className="text-[#e2e8f0] mx-auto mb-3" />
        <p className="text-[#64748b]">Student directory will be available in the next sprint.</p>
      </Card>
    </div>
  );
}