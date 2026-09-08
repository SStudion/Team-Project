"use client";
// app/(admin)/admin-students/page.jsx
//
// Sprint 3 frontend item 3: list of students who applied to this university,
// derived server-side from their applications (see adminStudentService.js —
// there's no separate `students` collection in the data contract).

import { useState, useEffect } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/authFetch";
import Card from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import { Search, Users } from "lucide-react";

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchStudents() {
      try {
        const res = await authFetch("/api/admin/students");
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students ?? []);
        } else {
          setError(`Failed to load students (${res.status}).`);
        }
      } catch (err) {
        console.error("Failed to load students:", err);
        setError(err.message || "Failed to load students.");
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [user?.uid]);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.studentName?.toLowerCase().includes(q) ||
      s.studentEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Students</h1>
        <p className="text-sm text-[#64748b] mt-0.5">
          {loading ? "Loading..." : `${students.length} students have applied`}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && students.length === 0 ? (
        <Card className="text-center py-16">
          <Users size={32} className="text-[#e2e8f0] mx-auto mb-3" />
          <p className="text-[#64748b]">No students have applied to your university yet.</p>
        </Card>
      ) : (
        <>
          {/* Table — desktop/tablet (md and up) */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8f9fb]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                      Student
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                      Email
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                      Applications
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                      Latest status
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">
                      Last activity
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#64748b] text-sm">
                        Loading students...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#64748b] text-sm">
                        No students match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.studentId} className="hover:bg-[#f8f9fb] transition-colors">
                        <td className="px-5 py-3 font-medium text-[#1a202c]">{s.studentName}</td>
                        <td className="px-5 py-3 text-[#64748b]">{s.studentEmail}</td>
                        <td className="px-5 py-3 text-[#64748b]">{s.applicationsCount}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={s.latestStatus} />
                        </td>
                        <td className="px-5 py-3 text-[#64748b] text-xs">
                          {formatDate(s.lastActivityAt)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/admin-applications?q=${encodeURIComponent(s.studentName ?? "")}`}
                            className="text-xs font-medium text-[#2a5298] hover:underline"
                          >
                            View applications →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cards — phones and small tablets (below md) */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <Card className="text-center py-12 text-sm text-[#64748b]">Loading students...</Card>
            ) : filtered.length === 0 ? (
              <Card className="text-center py-12 text-sm text-[#64748b]">No students match your search.</Card>
            ) : (
              filtered.map((s) => (
                <Card key={s.studentId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#1a202c] truncate">{s.studentName}</p>
                      <p className="text-sm text-[#64748b] truncate">{s.studentEmail}</p>
                    </div>
                    <StatusBadge status={s.latestStatus} className="shrink-0" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e2e8f0]">
                    <p className="text-xs text-[#64748b]">
                      {s.applicationsCount} application{s.applicationsCount === 1 ? "" : "s"} · Last activity{" "}
                      {formatDate(s.lastActivityAt)}
                    </p>
                  </div>
                  <Link
                    href={`/admin-applications?q=${encodeURIComponent(s.studentName ?? "")}`}
                    className="block text-center mt-3 text-xs font-medium text-[#2a5298] hover:underline"
                  >
                    View applications →
                  </Link>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
