"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { getApplication, deleteDraftApplication } from "@/lib/firebase/applications";
import { getDocumentsForApplication } from "@/lib/firebase/documents";
import { DOC_TYPE_LABELS, STATUS } from "@/constants";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, User, GraduationCap, BookOpen, FileText, Trash2 } from "lucide-react";

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
  const router = useRouter();
  const [application, setApplication]     = useState(null);
  const [documents, setDocuments]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [documentsError, setDocumentsError] = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const appData = await getApplication(id);
        setApplication(appData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Application not found.");
        setLoading(false);
        return;
      }

      try {
        const docs = await getDocumentsForApplication(id);
        setDocuments(docs);
      } catch (err) {
        // Don't swallow this — a missing composite index or a Firestore
        // rules mismatch both throw here, and both look identical to "no
        // documents yet" if we just log and move on. Surface it instead.
        console.error("Documents error:", err);
        setDocumentsError(err.message || "Could not load documents.");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDraftApplication(id);
      router.push("/applications");
    } catch (err) {
      console.error("Failed to delete:", err);
      setError("Could not delete this application. Please try again.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

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
  const isDraft = status === STATUS.DRAFT;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/applications" className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e3a5f] transition-colors">
          <ArrowLeft size={14} /> Back to Applications
        </Link>
        {isDraft && !confirmDelete && (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} />
            Delete draft
          </Button>
        )}
        {isDraft && confirmDelete && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-red-600">Are you sure?</p>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, delete"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{courseInfo?.courseName}</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            {universityName} · {courseInfo?.intendedIntake}
          </p>
        </div>
        <StatusBadge status={status} className="text-sm px-3 py-1" />
      </div>

      {decisionMessage && (
        <Card className={`border-l-4 ${status === "offered" ? "border-l-green-500 bg-green-50" : "border-l-red-400 bg-red-50"}`}>
          <p className="text-sm font-medium text-[#1a202c] mb-1">
            {status === "offered" ? "Offer received" : "Decision from university"}
          </p>
          <p className="text-sm text-[#64748b]">{decisionMessage}</p>
        </Card>
      )}

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

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-[#1e3a5f]" />
          <h2 className="font-semibold text-[#1a202c]">Uploaded Documents</h2>
        </div>
        {documentsError ? (
          <p className="text-sm text-red-600">{documentsError}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-[#64748b]">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.documentId} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#e2e8f0] bg-[#f8f9fb]">
                <div>
                  <p className="text-sm font-medium text-[#1a202c]">
                    {DOC_TYPE_LABELS[doc.fileType] ?? doc.fileType}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {doc.fileName} · Uploaded {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.isDummyFile && (
                    <span className="text-xs text-[#64748b] bg-[#e2e8f0] px-2 py-0.5 rounded-full">
                      Demo file
                    </span>
                  )}
                  {doc.fileURL && (
                    <a
                      href={doc.fileURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#2a5298] hover:underline"
                    >
                      {doc.isDummyFile ? "View demo file" : "Download"}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

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