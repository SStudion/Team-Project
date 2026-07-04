"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import Link from "next/link";
import Card from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Users, ClipboardList, CheckCircle, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({ total: 0, under_review: 0, offered: 0, submitted: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!user?.uid) return;

  async function fetchData() {
    try {
      const [appsRes, countsRes] = await Promise.all([
        authFetch("/api/admin/applications"),
        authFetch("/api/admin/applications/counts"),
      ]);

      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data.applications ?? []);
      }

      if (countsRes.ok) {
        const data = await countsRes.json();
        setCounts(
        data.counts ?? data ?? {
        total: 0,
        under_review: 0,
        offered: 0,
        submitted: 0,
      }
    );
  }
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
    }
  }

  fetchData();
}, [user?.uid]);

  const stats = [
    { label: "Total Applications", value: counts.total,        icon: ClipboardList, color: "text-[#1e3a5f]"  },
    { label: "Under Review",       value: counts.under_review, icon: Clock,         color: "text-amber-600" },
    { label: "Offers Made",        value: counts.offered,      icon: CheckCircle,   color: "text-green-600" },
    { label: "Awaiting Review",    value: counts.submitted,    icon: Users,         color: "text-blue-600"  },
  ];

  const recent = applications.slice(0, 5);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Admin Dashboard</h1>
        <p className="text-[#64748b] text-sm mt-0.5">{user?.fullName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex items-start gap-3">
            <stat.icon size={20} className={`${stat.color} shrink-0 mt-0.5`} />
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{stat.value}</p>
              <p className="text-xs text-[#64748b]">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent applications table */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
          <h2 className="font-semibold text-[#1a202c]">Recent Applications</h2>
          <Link href="/admin-applications" className="text-xs text-[#2a5298] hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8f9fb]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">Student</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">Course</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">Updated</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-sm text-[#64748b]">
                  Loading applications...
                </td>
              </tr>
            ) : recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-sm text-[#64748b]">
                  No applications yet.
                </td>
              </tr>
            ) : (
              recent.map((app) => (
                <tr key={app.applicationId ?? app.id} className="hover:bg-[#f8f9fb] transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1a202c]">
                    {app.studentName}
                  </td>
                  <td className="px-5 py-3 text-[#64748b]">
                    {app.courseInfo?.courseName}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-3 text-[#64748b] text-xs">
                    {formatDate(app.updatedAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin-applications/${app.applicationId ?? app.id}`}
                      className="text-xs text-[#2a5298] hover:underline"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}