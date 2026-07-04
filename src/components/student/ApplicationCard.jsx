// components/student/ApplicationCard.jsx

import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Calendar, Building2 } from "lucide-react";

export default function ApplicationCard({ application }) {
  const { applicationId, id, status, courseInfo, universityName, createdAt, updatedAt } = application;
  const appId = applicationId || id;

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-[#64748b] mb-0.5 font-medium uppercase tracking-wide">
            {courseInfo?.intendedIntake}
          </p>
          <h3 className="text-[#1a202c] font-semibold text-sm truncate">
            {courseInfo?.courseName}
          </h3>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* University */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748b] mb-4">
        <Building2 size={12} />
        <span>{universityName ?? "—"}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-[#64748b]">
          <Calendar size={11} />
          <span>Updated {formatDate(updatedAt)}</span>
        </div>
        <Link
          href={`/applications/${appId}`}
          className="flex items-center gap-1 text-xs font-medium text-[#2a5298] hover:underline"
        >
          View <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}