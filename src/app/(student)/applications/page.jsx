"use client";
// app/(student)/applications/page.jsx

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/common/Button";
import ApplicationCard from "@/components/student/ApplicationCard";
import Card from "@/components/common/Card";
import { getMyApplications } from "@/lib/firebase/applications";
import { STATUS, STATUS_LABELS } from "@/constants";
import { PlusCircle, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ALL = "all";
const filterOptions = [
  { value: ALL,                 label: "All" },
  { value: STATUS.DRAFT,        label: STATUS_LABELS.draft },
  { value: STATUS.SUBMITTED,    label: STATUS_LABELS.submitted },
  { value: STATUS.UNDER_REVIEW, label: STATUS_LABELS.under_review },
  { value: STATUS.OFFERED,      label: STATUS_LABELS.offered },
  { value: STATUS.REJECTED,     label: STATUS_LABELS.rejected },
];

export default function ApplicationsPage() {
  const [activeFilter, setActiveFilter] = useState(ALL);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
      if (!user?.uid) return;
      
      async function fetchApplications() {
        try {
          const data = await getMyApplications();
          setApplications(data);
        } catch (error) {
          console.error("Failed to load applications:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchApplications();
    }, [user?.uid]);

  const filtered = activeFilter === ALL
    ? applications
    : applications.filter((a) => a.status === activeFilter);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">My Applications</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            {loading ? "Loading..." : `${applications.length} applications total`}
          </p>
        </div>
        <Link href="/applications/new">
          <Button>
            <PlusCircle size={16} />
            New Application
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${activeFilter === opt.value
                ? "bg-[#1e3a5f] text-white"
                : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#1e3a5f]"
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <Card className="text-center py-16">
          <p className="text-sm text-[#64748b]">Loading applications...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search size={32} className="text-[#e2e8f0] mx-auto mb-3" />
          <p className="text-[#64748b]">
            {activeFilter === ALL ? "No applications yet." : "No applications for this filter."}
          </p>
          {activeFilter === ALL && (
            <Link href="/applications/new" className="mt-3 inline-block">
              <Button size="sm">Start your first application</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((app) => (
            <ApplicationCard key={app.applicationId} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}