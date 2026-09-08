"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { STATUS, STATUS_LABELS, DOC_TYPE_LABELS } from "@/constants";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft, User, GraduationCap, BookOpen,
  FileText, MessageSquare, CheckCircle,
  XCircle, Clock, FileWarning,
} from "lucide-react";

const DECISION_OPTIONS = [
  { value: STATUS.UNDER_REVIEW,      label: STATUS_LABELS.under_review,      icon: Clock,       color: "border-amber-400  text-amber-700  bg-amber-50"  },
  { value: STATUS.MISSING_DOCUMENTS, label: STATUS_LABELS.missing_documents, icon: FileWarning, color: "border-orange-400 text-orange-700 bg-orange-50" },
  { value: STATUS.OFFERED,           label: STATUS_LABELS.offered,           icon: CheckCircle, color: "border-green-400  text-green-700  bg-green-50"  },
  { value: STATUS.REJECTED,          label: STATUS_LABELS.rejected,          icon: XCircle,     color: "border-red-400    text-red-700    bg-red-50"   },
];

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-[#64748b] mb-0.5">{label}</dt>
      <dd className="font-medium text-[#1a202c]">{value ?? "—"}</dd>
    </div>
  );
}

export default function AdminApplicationDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [application, setApplication]         = useState(null);
  const [documents, setDocuments]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedStatus, setSelectedStatus]   = useState(STATUS.UNDER_REVIEW);
  const [notes, setNotes]                     = useState("");
  const [internalNotes, setInternalNotes]     = useState([]);
  const [decisionMessage, setDecisionMessage] = useState("");
  // Which document types to flag as missing — only relevant when
  // selectedStatus is MISSING_DOCUMENTS. Pre-filled from
  // adminReview.missingDocumentTypes so reopening an application that's
  // already in missing_documents shows what was previously requested.
  const [missingDocTypes, setMissingDocTypes] = useState([]);
  const [saved, setSaved]                     = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState("");

  useEffect(() => {
    if (!id) return;

    // Wait for Firebase Auth to finish restoring the session before firing
    // authFetch — auth.currentUser is null for a brief moment on load, and
    // authFetch throws immediately if it sees that, which was silently
    // aborting this fetch (see catch below) and leaving the page stuck on
    // an empty "loaded" state instead of ever calling the API.
    if (authLoading) return;

    // Not signed in once auth has resolved — rendered directly from `user`
    // below, so there's nothing to fetch and nothing to set here.
    if (!user) return;

    async function fetchApplication() {
      try {
        const res = await authFetch(`/api/admin/applications/${id}`);
        if (res.ok) {
          const data = await res.json();
          const app = data.application;
          setApplication(app);
          setDocuments(data.documents ?? []);
          setSelectedStatus(app.status ?? STATUS.UNDER_REVIEW);
          setNotes(app.adminReview?.internalNotes ?? "");
          setInternalNotes(data.internalNotes ?? []);
          setDecisionMessage(app.adminReview?.latestDecisionMessage ?? "");
          setMissingDocTypes(app.adminReview?.missingDocumentTypes ?? []);
        } else {
          setError(`Failed to load application (${res.status}).`);
        }
      } catch (err) {
        console.error("Failed to load application:", err);
        setError(err.message || "Failed to load application.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
  }, [id, authLoading, user]);

  function toggleMissingDocType(fileType) {
    setMissingDocTypes((prev) =>
      prev.includes(fileType) ? prev.filter((t) => t !== fileType) : [...prev, fileType]
    );
  }

  async function handleSaveDecision() {
    if (selectedStatus === STATUS.MISSING_DOCUMENTS && missingDocTypes.length === 0) {
      setError("Select at least one document type before requesting missing documents.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let endpoint, method, body;

      if (selectedStatus === STATUS.UNDER_REVIEW) {
        endpoint = `/api/admin/applications/${id}/status`;
        method = "PATCH";
        body = { status: selectedStatus };
      } else if (selectedStatus === STATUS.MISSING_DOCUMENTS) {
        endpoint = `/api/admin/applications/${id}/request-documents`;
        method = "POST";
        body = { missingDocumentTypes: missingDocTypes, message: decisionMessage };
      } else {
        endpoint = `/api/admin/applications/${id}/decision`;
        method = "POST";
        body = { decision: selectedStatus, decisionMessage };
      }

      const res = await authFetch(endpoint, { method, body: JSON.stringify(body) });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || data?.message ||
          "This decision could not be saved. If the application already has a final decision, further changes require academic representative review."
        );
      }

      setApplication((current) =>
        current ? {
          ...current,
          status: selectedStatus,
          adminReview: {
            ...(current.adminReview ?? {}),
            latestDecisionMessage: decisionMessage,
            ...(selectedStatus === STATUS.MISSING_DOCUMENTS
              ? { missingDocumentTypes: missingDocTypes }
              : {}),
          },
        } : current
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`/api/admin/applications/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ noteText: notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes.");

      // Refetch from the same scoped endpoint the page already loads from,
      // so the newly saved note appears in the list without a full reload.
      const refreshed = await authFetch(`/api/admin/applications/${id}`);
      if (refreshed.ok) {
        const data = await refreshed.json();
        setInternalNotes(data.internalNotes ?? []);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const loadingCard = (
    <div className="max-w-4xl">
      <Card className="text-center py-16">
        <p className="text-[#64748b]">Loading application...</p>
      </Card>
    </div>
  );

  // Still resolving the Firebase Auth session — same loading treatment as a
  // slow application fetch, since visually there's no distinction to show.
  if (authLoading) return loadingCard;

  // Auth has resolved and there's no signed-in user — derived directly from
  // `user` at render time rather than mirrored into state inside the effect.
  if (!user) {
    return (
      <div className="max-w-4xl">
        <Link href="/admin-applications" className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-6">
          <ArrowLeft size={14} /> Back to Applications
        </Link>
        <Card className="text-center py-16">
          <p className="text-[#64748b]">You need to be signed in to view this application.</p>
        </Card>
      </div>
    );
  }

  if (loading) return loadingCard;

  if (!application) {
    return (
      <div className="max-w-4xl">
        <Link href="/admin-applications" className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-6">
          <ArrowLeft size={14} /> Back to Applications
        </Link>
        <Card className="text-center py-16">
          <p className="text-[#64748b]">{error || "Application not found."}</p>
        </Card>
      </div>
    );
  }

  const { personalInfo, academicInfo, courseInfo, createdAt, updatedAt, submittedAt, universityName } = application;

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/admin-applications" className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e3a5f] transition-colors">
        <ArrowLeft size={14} /> Back to Applications
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#1e3a5f] break-words">{application.studentName}</h1>
          <p className="text-sm text-[#64748b] mt-0.5 break-words">
            Application ID: <span className="font-mono">{id}</span>
            {" · "}Submitted {formatDate(submittedAt ?? createdAt)}
          </p>
        </div>
        <StatusBadge status={application.status} className="text-sm px-3 py-1 shrink-0" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

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
              <InfoRow label="Institution"           value={academicInfo?.institutionName ?? academicInfo?.institution} />
              <InfoRow label="Graduation year"       value={academicInfo?.graduationYear} />
              <InfoRow label="GPA / Grade"           value={academicInfo?.gpaOrGrade ?? academicInfo?.gpa} />
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
            {documents.length === 0 ? (
              <p className="text-sm text-[#64748b]">No documents uploaded by the student yet.</p>
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
        </div>

        {/* Right column */}
        <div className="space-y-5">

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-[#1e3a5f]" />
              <h2 className="font-semibold text-[#1a202c]">Decision</h2>
            </div>
            <p className="text-xs text-[#64748b] mb-3">Set application status</p>
            <div className="space-y-2 mb-4">
              {DECISION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedStatus === opt.value
                      ? opt.color
                      : "border-[#e2e8f0] text-[#64748b] bg-white hover:border-[#1e3a5f]/30"
                    }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={selectedStatus === opt.value}
                    onChange={() => setSelectedStatus(opt.value)}
                    className="sr-only"
                  />
                  <opt.icon size={15} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>

            {selectedStatus === STATUS.MISSING_DOCUMENTS && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#1a202c] mb-2">
                  Which documents are missing?
                </label>
                <div className="space-y-2 mb-3">
                  {Object.entries(DOC_TYPE_LABELS).map(([fileType, label]) => (
                    <label key={fileType} className="flex items-center gap-2 text-sm text-[#1a202c] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={missingDocTypes.includes(fileType)}
                        onChange={() => toggleMissingDocType(fileType)}
                        className="accent-[#c8973a]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <label className="block text-xs font-medium text-[#1a202c] mb-1">
                  Message to student (optional)
                </label>
                <textarea
                  rows={3}
                  value={decisionMessage}
                  onChange={(e) => setDecisionMessage(e.target.value)}
                  placeholder="e.g. Your transcript is unreadable — please re-upload a clearer scan."
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none
                             placeholder:text-[#64748b]"
                />
                <p className="text-xs text-[#64748b] mt-1">
                  The student can only upload these documents — nothing else on the application becomes editable.
                </p>
              </div>
            )}

            {(selectedStatus === STATUS.OFFERED || selectedStatus === STATUS.REJECTED) && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#1a202c] mb-1">
                  Message to student
                </label>
                <textarea
                  rows={3}
                  value={decisionMessage}
                  onChange={(e) => setDecisionMessage(e.target.value)}
                  placeholder={
                    selectedStatus === STATUS.OFFERED
                      ? "e.g. We are pleased to offer you a place..."
                      : "e.g. We regret that we are unable to offer..."
                  }
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none
                             placeholder:text-[#64748b]"
                />
                <p className="text-xs text-[#64748b] mt-1">
                  This message will be emailed to the student.
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSaveDecision}
              disabled={saving}
              variant={
                selectedStatus === STATUS.OFFERED ? "accent"
                : selectedStatus === STATUS.REJECTED ? "danger"
                : "primary"
              }
            >
              {saved ? "✓ Saved" : saving ? "Saving..." : "Save Decision"}
            </Button>
          </Card>

          <Card>
            <h2 className="font-semibold text-[#1a202c] mb-3">Internal Notes</h2>
            <p className="text-xs text-[#64748b] mb-2">Visible to admins only.</p>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this application..."
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none
                         placeholder:text-[#64748b]"
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full"
              onClick={handleSaveNotes}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Notes"}
            </Button>

            {internalNotes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                <h3 className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">
                  Previous Notes
                </h3>
                <ul className="space-y-3">
                  {internalNotes.map((note) => (
                    <li key={note.noteId} className="text-sm border-b border-[#e2e8f0] pb-3 last:border-b-0 last:pb-0">
                      <p className="text-xs text-[#64748b] mb-1">
                        {note.createdByName ?? "University Admin"} · {formatDate(note.createdAt)}
                      </p>
                      <p className="text-[#1a202c] whitespace-pre-wrap break-words">{note.noteText}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold text-[#1a202c] mb-3">Timeline</h2>
            <div className="space-y-3 text-xs text-[#64748b]">
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
      </div>
    </div>
  );
}