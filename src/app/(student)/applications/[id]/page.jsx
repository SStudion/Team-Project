"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { getApplication, deleteDraftApplication } from "@/lib/firebase/applications";
import { getDocumentsForApplication, registerDocument } from "@/lib/firebase/documents";
import { authFetch } from "@/lib/authFetch";
import { DOC_TYPE_LABELS, STATUS } from "@/constants";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, User, GraduationCap, BookOpen, FileText, Trash2, FileWarning, CheckCircle } from "lucide-react";

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

  // Missing-documents action card (Sprint 3, client decision D-03/D-04)
  const [uploadingType, setUploadingType] = useState(null);
  const [uploadError, setUploadError]     = useState("");
  const [resubmitting, setResubmitting]   = useState(false);
  const [resubmitError, setResubmitError] = useState("");
  // Session-only confirmation — not persisted anywhere, just tells the
  // student their resubmit went through in this page visit.
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

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

  async function handleMissingDocUpload(e, fileType) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(fileType);
    setUploadError("");
    // A new upload is presumably an attempt to fix whatever the last resubmit
    // rejected — that error is now stale, so clear it rather than leave it
    // sitting under a document the student just corrected.
    setResubmitError("");
    setResubmitSuccess(false);
    try {
      await registerDocument({ applicationId: id, fileType, file });
      const docs = await getDocumentsForApplication(id);
      setDocuments(docs);
    } catch (err) {
      // Expected until the backend side of this feature ships: firestore.rules
      // still only allows document uploads while status is "draft", so this
      // will fail with a permission error for a MISSING_DOCUMENTS application
      // until that rule is updated (see lib/firebase/documents.js).
      setUploadError(err.message || "Could not upload document. Please try again.");
    } finally {
      setUploadingType(null);
    }
  }

  async function handleResubmit() {
    setResubmitting(true);
    setResubmitError("");
    setResubmitSuccess(false);
    try {
      // Stub endpoint — see src/app/api/applications/[applicationId]/resubmit/route.js
      const res = await authFetch(`/api/applications/${id}/resubmit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not notify the university. Please try again.");
      }
      const refreshed = await getApplication(id);
      setApplication(refreshed);
      setResubmitSuccess(true);
    } catch (err) {
      setResubmitError(err.message || "Could not notify the university. Please try again.");
    } finally {
      setResubmitting(false);
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

  const { personalInfo, academicInfo, courseInfo, createdAt, updatedAt, submittedAt, status, universityName, adminReview } = application;
  const decisionMessage = adminReview?.latestDecisionMessage ?? "";
  const isDraft = status === STATUS.DRAFT;
  const isMissingDocuments = status === STATUS.MISSING_DOCUMENTS;
  // latestDecisionMessage is preserved across missing_documents -> under_review
  // for audit (see decisionService.js), so once resolved it's no longer a
  // current decision to show the student — only offered/rejected are.
  const isFinalDecision = status === STATUS.OFFERED || status === STATUS.REJECTED;
  const missingDocTypes = adminReview?.missingDocumentTypes ?? [];

  // A document only satisfies the CURRENT missing-document request if it was
  // uploaded at or after this request was made (adminReview.reviewedAt) — the
  // same freshness rule the backend enforces in resubmitMissingDocuments().
  // An older document of the right type, from before this request, must not
  // count. If either timestamp isn't a usable Firestore Timestamp, fail
  // closed (not satisfied) rather than guess.
  const reviewedAt = adminReview?.reviewedAt;
  const isCurrentUploadFor = (fileType) =>
    documents.some(
      (d) =>
        d.fileType === fileType &&
        typeof d.uploadedAt?.toMillis === "function" &&
        typeof reviewedAt?.toMillis === "function" &&
        d.uploadedAt.toMillis() >= reviewedAt.toMillis()
    );

  const allMissingDocsUploaded =
    missingDocTypes.length > 0 &&
    missingDocTypes.every((fileType) => isCurrentUploadFor(fileType));

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/applications" className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e3a5f] transition-colors">
          <ArrowLeft size={14} /> Back to Applications
        </Link>
        {isDraft && !confirmDelete && (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} className="w-full sm:w-auto shrink-0">
            <Trash2 size={14} />
            Delete draft
          </Button>
        )}
        {isDraft && confirmDelete && (
          <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#1e3a5f] break-words">{courseInfo?.courseName}</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            {universityName} · {courseInfo?.intendedIntake}
          </p>
        </div>
        <StatusBadge status={status} className="text-sm px-3 py-1 shrink-0" />
      </div>

      {resubmitSuccess && (
        <Card className="border-l-4 border-l-green-500 bg-green-50 py-3">
          <p className="text-sm font-medium text-green-700 flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            Documents submitted successfully. Your application is now back under review.
          </p>
        </Card>
      )}

      {decisionMessage && isFinalDecision && (
        <Card className={`border-l-4 ${status === "offered" ? "border-l-green-500 bg-green-50" : "border-l-red-400 bg-red-50"}`}>
          <p className="text-sm font-medium text-[#1a202c] mb-1">
            {status === "offered" ? "Offer received" : "Decision from university"}
          </p>
          <p className="text-sm text-[#64748b]">{decisionMessage}</p>
        </Card>
      )}

      {isMissingDocuments && (
        <Card className="border-l-4 border-l-orange-400 bg-orange-50">
          <div className="flex items-center gap-2 mb-2">
            <FileWarning size={18} className="text-orange-600 shrink-0" />
            <h2 className="font-semibold text-[#1a202c]">Action needed: missing documents</h2>
          </div>
          <p className="text-sm text-[#64748b] mb-4">
            {decisionMessage ||
              `${universityName ?? "The university"} needs the document(s) below before your application can move forward. The rest of your application stays as you submitted it.`}
          </p>

          {missingDocTypes.length === 0 ? (
            <p className="text-sm text-[#64748b]">
              No specific document types were flagged yet — check back shortly, or contact the university if this doesn&apos;t update.
            </p>
          ) : (
            <div className="space-y-4">
              {missingDocTypes.map((fileType) => {
                const uploaded = isCurrentUploadFor(fileType);
                return (
                  <div key={fileType}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-[#1a202c]">
                        {DOC_TYPE_LABELS[fileType] ?? fileType}
                      </label>
                      {uploaded && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle size={12} /> Uploaded
                        </span>
                      )}
                      {uploadingType === fileType && (
                        <span className="text-xs text-[#64748b]">Uploading...</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploadingType !== null}
                      onChange={(e) => handleMissingDocUpload(e, fileType)}
                      className="w-full text-sm text-[#64748b] file:mr-3 file:py-1.5 file:px-3
                                 file:rounded-lg file:border-0 file:text-xs file:font-medium
                                 file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2a5298]
                                 disabled:opacity-50"
                    />
                  </div>
                );
              })}

              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}

              <Button
                variant="accent"
                className="w-full sm:w-auto"
                onClick={handleResubmit}
                disabled={!allMissingDocsUploaded || resubmitting}
              >
                {resubmitting ? "Notifying university..." : "I've uploaded everything — notify the university"}
              </Button>

              {resubmitError && (
                <p className="text-sm text-red-600">{resubmitError}</p>
              )}
            </div>
          )}
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
              <li key={doc.documentId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[#e2e8f0] bg-[#f8f9fb]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a202c]">
                    {DOC_TYPE_LABELS[doc.fileType] ?? doc.fileType}
                  </p>
                  <p className="text-xs text-[#64748b] break-words">
                    {doc.fileName} · Uploaded {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
            <span className="font-medium text-[#1a202c]">{formatDate(submittedAt ?? createdAt)}</span>
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