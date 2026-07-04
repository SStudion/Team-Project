"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import Card from "@/components/common/Card";
import { useAuth } from "@/context/AuthContext";
import { STATUS, STATUS_LABELS } from "@/constants";
import { formatDate } from "@/lib/utils";
import { Search } from "lucide-react";

const ALL = "all";
const filterOptions = [
  { value: ALL,                 label: "All" },
  { value: STATUS.SUBMITTED,    label: STATUS_LABELS.submitted },
  { value: STATUS.UNDER_REVIEW, label: STATUS_LABELS.under_review },
  { value: STATUS.OFFERED,      label: STATUS_LABELS.offered },
  { value: STATUS.REJECTED,     label: STATUS_LABELS.rejected },
];

export default function AdminApplicationsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchApplications() {
      try {
        const res = await authFetch("/api/admin/applications");

        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications ?? []);
        }
      } catch (error) {
        console.error("Failed to load applications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [user?.uid]);

  const filtered = applications
    .filter((a) => filter === ALL || a.status === filter)
    .filter((a) => {
      const q = search.toLowerCase();
      return (
        a.studentName?.toLowerCase().includes(q) ||
        a.applicationId?.toLowerCase().includes(q) ||
        a.courseInfo?.courseName?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Applications</h1>
        <p className="text-sm text-[#64748b] mt-0.5">
          {loading ? "Loading..." : `${applications.length} total applications`}
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search by name, course or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${filter === opt.value
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#1e3a5f]"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8f9fb]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                Student
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                Course
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                Intake
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                Updated
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>

          <tbody className="divide-y divide-[#e2e8f0]">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#64748b] text-sm">
                  Loading applications...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#64748b] text-sm">
                  No applications found.
                </td>
              </tr>
            ) : (
              filtered.map((app) => (
                <tr key={app.applicationId} className="hover:bg-[#f8f9fb] transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1a202c]">
                    {app.studentName}
                  </td>
                  <td className="px-5 py-3 text-[#64748b]">
                    {app.courseInfo?.courseName}
                  </td>
                  <td className="px-5 py-3 text-[#64748b] text-xs">
                    {app.courseInfo?.intendedIntake}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-3 text-[#64748b] text-xs">
                    {formatDate(app.updatedAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin-applications/${app.applicationId}`}
                      className="text-xs font-medium text-[#2a5298] hover:underline"
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