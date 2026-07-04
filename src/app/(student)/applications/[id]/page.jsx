"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import { getApplication } from "@/lib/firebase/applications";
import { DOC_TYPE_LABELS } from "@/constants";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, User, GraduationCap, BookOpen, FileText } from "lucide-react";

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-[#64748b] mb-0.5">{label}</dt>
      <dd className="font-medium text-[#1a202c]">{value ?? "—"}</dd>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getApplication(id);
        setApplication(data);
      } catch (err) {
        setError("Application not found.");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl">
        <Card className="text-center py-16">
          <p className="text-[#64748b]">Loading application...</p>
        </Card>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-3xl">
        <Link href="/applications" className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-6">
          <ArrowLeft size={14} /> Back to Applications
        </Link>
        <Card className="text-center py-16">
          <p className="text-[#64748b]">{error || "Application not found."}</p>
        </Card>
      </div>
    );
  }

  const { personalInfo, academicInfo, courseInfo, createdAt, updatedAt, status, universityName, adminReview } = application;
  const decisionMessage = adminReview?.latestDecisionMessage ?? "";

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/applications" className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e3a5f] transition-colors">
        <ArrowLeft size={14} /> Back to Applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{courseInfo?.courseName}</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            {universityName} · {courseInfo?.intendedIntake}
          </p>
        </div>
        <StatusBadge status={status} className="text-sm px-3 py-1" />
      </div>

      {/* Decision message */}
      {decisionMessage && (
        <Card className={`border-l-4 ${status === "offered" ? "border-l-green-500 bg-green-50" : "border-l-red-400 bg-red-50"}`}>
          <p className="text-sm font-medium text-[#1a202c] mb-1">
            {status === "offered" ? "Offer received" : "Decision from university"}
          </p>
          <p className="text-sm text-[#64748b]">{decisionMessage}</p>
        </Card>
      )}

      {/* Personal info */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-[#1e3a5f]" />
          <h2 className="font-semibold text-[#1a202c]">Personal Information</h2>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <InfoRow label="Full name"       value={personalInfo?.fullName} />
          <InfoRow label="Date of birth"   value={formatDate(personalInfo?.dateOfBirth)} />
          <InfoRow label="Nationality"     value={personalInfo?.nationality} />
          <InfoRow label="Passport number" value={personalInfo?.passportNumber} />
        </dl>
      </Card>

      {/* Academic info */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap size={16} className="text-[#1e3a5f]" />
          <h2 className="font-semibold text-[#1a202c]">Academic Information</h2>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <InfoRow label="Highest qualification" value={academicInfo?.highestQualification} />
          <InfoRow label="Institution"           value={academicInfo?.institution} />
          <InfoRow label="Graduation year"       value={academicInfo?.graduationYear} />
          <InfoRow label="GPA / Grade"           value={academicInfo?.gpa} />
        </dl>
      </Card>

      {/* Course info */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-[#1e3a5f]" />
          <h2 className="font-semibold text-[#1a202c]">Course Information</h2>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <InfoRow label="University"      value={universityName} />
          <InfoRow label="Course"          value={courseInfo?.courseName} />
          <InfoRow label="Intended intake" value={courseInfo?.intendedIntake} />
        </dl>
      </Card>

      {/* Documents */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-[#1e3a5f]" />
          <h2 className="font-semibold text-[#1a202c]">Uploaded Documents</h2>
        </div>
        <p className="text-sm text-[#64748b]">Document upload coming in next sprint.</p>
      </Card>

      {/* Timeline */}
      <Card>
        <h2 className="font-semibold text-[#1a202c] mb-3">Timeline</h2>
        <div className="space-y-2 text-xs text-[#64748b]">
          <div className="flex justify-between">
            <span>Submitted</span>
            <span className="font-medium text-[#1a202c]">{formatDate(createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Last updated</span>
            <span className="font-medium text-[#1a202c]">{formatDate(updatedAt)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}