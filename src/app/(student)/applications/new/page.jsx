"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import { STUDY_LEVELS } from "@/constants";
import { createDraftApplication, updateDraftApplication, getApplication } from "@/lib/firebase/applications";
import { registerDocument } from "@/lib/firebase/documents";
import { listUniversities } from "@/lib/firebase/universities";
import { authFetch } from "@/lib/authFetch";
import { isValidDob } from "@/lib/validation/applicationValidation";
import { CheckCircle } from "lucide-react";

const STEPS = ["Personal Info", "Academic Info", "Course", "Documents"];

// "recommended" reflects what the application actually asks for — it is NOT
// enforced by validateApplicationForSubmit()/the submit route, which accepts
// a submission with zero documents attached. Do not read this as a blocking
// requirement; it exists purely to guide what the student should upload.
const DOC_FIELDS = [
  { name: "passport",    fileType: "passport",     label: "Passport copy",               recommended: true  },
  { name: "transcript",  fileType: "transcript",   label: "Academic transcripts",         recommended: true  },
  { name: "certificate", fileType: "certificate",  label: "Certificates",                 recommended: false },
  { name: "englishTest", fileType: "english_test", label: "English language test result", recommended: false },
];

const emptyForm = {
  fullName: "", dateOfBirth: "", nationality: "", passportNumber: "",
  highestQualification: "", institution: "", graduationYear: "", gpa: "",
  universityId: "", courseName: "", intendedIntake: "",
};

// useSearchParams() requires a Suspense boundary for the production build
// (Next.js bails the whole route to client-only rendering otherwise) — the
// actual component is unchanged below, just wrapped by the default export.
function NewApplicationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");

  const [step, setStep]                   = useState(0);
  const [form, setForm]                   = useState(emptyForm);
  const [universities, setUniversities]   = useState([]);
  const [applicationId, setApplicationId] = useState(null);
  // The authoritative university once a draft exists — set once (on create or
  // on loading an existing draft) and never changed afterward. courseInfo.universityId
  // is always written from this, never from the (disabled, but don't trust that alone)
  // university <select>, so it can't drift from the application's real top-level
  // universityId, which is frozen server-side once the draft is created.
  const [lockedUniversityId, setLockedUniversityId] = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [loadingDraft, setLoadingDraft]   = useState(false);
  const [error, setError]                 = useState("");
  const [submitted, setSubmitted]         = useState(false);
  const [uploadedDocs, setUploadedDocs]   = useState({});
  const [uploadingDoc, setUploadingDoc]   = useState(null);

  useEffect(() => {
    async function fetchUniversities() {
      try {
        const data = await listUniversities();
        setUniversities(data);
      } catch (err) {
        console.error("Failed to load universities:", err);
      }
    }
    fetchUniversities();
  }, []);

  useEffect(() => {
    if (!draftId) return;

    async function loadDraft() {
      setLoadingDraft(true);
      try {
        const app = await getApplication(draftId);
        if (!app) return;

        if (app.status !== "draft") {
          router.push(`/applications/${draftId}`);
          return;
        }

        setApplicationId(draftId);
        // The authoritative university is the application's top-level
        // universityId, not courseInfo.universityId — read from there so the
        // form displays (and, once locked below, can only ever save) the
        // real university even if courseInfo had already drifted.
        setLockedUniversityId(app.universityId ?? null);
        setForm({
          fullName:             app.personalInfo?.fullName ?? "",
          dateOfBirth:          app.personalInfo?.dateOfBirth ?? "",
          nationality:          app.personalInfo?.nationality ?? "",
          passportNumber:       app.personalInfo?.passportNumber ?? "",
          highestQualification: app.academicInfo?.highestQualification ?? "",
          institution:          app.academicInfo?.institution ?? "",
          graduationYear:       app.academicInfo?.graduationYear?.toString() ?? "",
          gpa:                  app.academicInfo?.gpa ?? "",
          universityId:         app.universityId ?? "",
          courseName:           app.courseInfo?.courseName ?? "",
          intendedIntake:       app.courseInfo?.intendedIntake ?? "",
        });
        setStep(3);
      } catch (err) {
        console.error("Failed to load draft:", err);
        setError("Could not load your draft. Please start a new application.");
      } finally {
        setLoadingDraft(false);
      }
    }

    loadDraft();
  }, [draftId, router]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  }

  async function handleFileChange(e, fileType) {
    const file = e.target.files?.[0];
    if (!file || !applicationId) return;

    setUploadingDoc(fileType);
    setError("");

    try {
      await registerDocument({ applicationId, fileType, file });
      setUploadedDocs((prev) => ({ ...prev, [fileType]: true }));
    } catch (err) {
      setError(err.message || "Could not upload document. Please try again.");
    } finally {
      setUploadingDoc(null);
    }
  }

  async function handleNext() {
    setError("");

    // "Continue" is type="button", so native HTML `required` validation
    // never fires for it (that only happens on a real form submit) — these
    // explicit checks are what actually gate each step.
    if (step === 0 && (
      !form.fullName.trim() ||
      !form.dateOfBirth.trim() ||
      !form.nationality.trim() ||
      !form.passportNumber.trim()
    )) {
      setError("Please fill in all personal information fields before continuing.");
      return;
    }

    if (step === 0 && !isValidDob(form.dateOfBirth)) {
      setError("Please enter a valid date of birth (a real date, not in the future).");
      return;
    }

    if (step === 1 && (
      !form.highestQualification.trim() ||
      !form.institution.trim() ||
      !form.graduationYear.trim() ||
      !form.gpa.trim()
    )) {
      setError("Please fill in all academic information fields before continuing.");
      return;
    }

    if (step === 2 && (!form.universityId || !form.courseName || !form.intendedIntake)) {
      setError("Please fill in all course fields before continuing.");
      return;
    }

    // Persist this step's section before advancing. Without this, going Back
    // on an existing draft, editing a field and continuing left Firestore
    // holding the old values — the final submit then validated stale data.
    if (step === 0 || step === 1 || step === 2) {
      try {
        setSubmitting(true);

        if (!applicationId) {
          // First pass through a brand new application: nothing to persist
          // yet for steps 0/1 — personalInfo/academicInfo are bundled into
          // this single create call once the course step completes, exactly
          // as before. No draft is created before step 2, and only one draft
          // is ever created here.
          if (step === 2) {
            const id = await createDraftApplication({
              universityId: form.universityId,
              personalInfo: {
                fullName:       form.fullName,
                dateOfBirth:    form.dateOfBirth,
                nationality:    form.nationality,
                passportNumber: form.passportNumber,
              },
              academicInfo: {
                highestQualification: form.highestQualification,
                institution:          form.institution,
                graduationYear:       Number(form.graduationYear),
                gpa:                  form.gpa,
              },
              courseInfo: {
                universityId:   form.universityId,
                courseName:     form.courseName,
                intendedIntake: form.intendedIntake,
              },
            });
            setApplicationId(id);
            // Locked in from this point on — see the state declaration above.
            setLockedUniversityId(form.universityId);
          }
        } else {
          // An existing draft (just created above, or loaded via ?draft=) —
          // persist only the section for the step being left.
          if (step === 0) {
            await updateDraftApplication(applicationId, {
              personalInfo: {
                fullName:       form.fullName,
                dateOfBirth:    form.dateOfBirth,
                nationality:    form.nationality,
                passportNumber: form.passportNumber,
              },
            });
          } else if (step === 1) {
            await updateDraftApplication(applicationId, {
              academicInfo: {
                highestQualification: form.highestQualification,
                institution:          form.institution,
                graduationYear:       Number(form.graduationYear),
                gpa:                  form.gpa,
              },
            });
          } else {
            // Defence in depth: always save the locked, authoritative
            // university, never form.universityId — the <select> is disabled
            // once a draft exists, but this way a manipulated client can't
            // make courseInfo.universityId diverge from the real one even by
            // bypassing the disabled control.
            await updateDraftApplication(applicationId, {
              courseInfo: {
                universityId:   lockedUniversityId,
                courseName:     form.courseName,
                intendedIntake: form.intendedIntake,
              },
            });
          }
        }
      } catch (err) {
        setError(err.message || "Could not save your application. Please try again.");
        return;
      } finally {
        setSubmitting(false);
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!applicationId) {
      setError("Something went wrong. Please go back and try again.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await authFetch(`/api/applications/${applicationId}/submit`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fieldMessages = data?.fieldErrors
          ? Object.values(data.fieldErrors).filter(Boolean)
          : [];
        const message = fieldMessages.length > 0
          ? `Please complete all required fields before submitting. ${fieldMessages.join(" ")}`
          : data?.error || "Could not submit your application. Please try again.";
        throw new Error(message);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Could not submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent " +
    "placeholder:text-[#64748b]";

  if (loadingDraft) {
    return (
      <div className="max-w-2xl">
        <Card className="text-center py-16">
          <p className="text-[#64748b]">Loading your draft application...</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Application submitted!</h2>
        <p className="text-[#64748b] text-sm mb-6">
          We&apos;ve received your application. You can track its status from your dashboard.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">
        {draftId ? "Continue Application" : "New Application"}
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        {draftId
          ? "Upload your documents and submit your application."
          : "Complete all steps to submit your application."}
      </p>

      {/* Mobile: compact "Step X of Y" indicator — the full graphical stepper below
          needs more width than a phone screen has for 4 nowrap labels. */}
      <p className="sm:hidden text-sm font-medium text-[#1e3a5f] mb-4">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>

      <div className="hidden sm:flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${i < step ? "bg-green-500 text-white"
                  : i === step ? "bg-[#1e3a5f] text-white"
                  : "bg-[#e2e8f0] text-[#64748b]"}`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? "text-[#1e3a5f] font-medium" : "text-[#64748b]"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? "bg-green-500" : "bg-[#e2e8f0]"}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <form onSubmit={handleSubmit}>

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1a202c] mb-4">Personal Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a202c] mb-1">Full name</label>
                  <input name="fullName" required value={form.fullName} onChange={handleChange}
                    placeholder="Anna Smith" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a202c] mb-1">Date of birth</label>
                  <input name="dateOfBirth" type="date" required value={form.dateOfBirth}
                    onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a202c] mb-1">Nationality</label>
                  <input name="nationality" required value={form.nationality} onChange={handleChange}
                    placeholder="e.g. Romanian" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a202c] mb-1">Passport number</label>
                  <input name="passportNumber" required value={form.passportNumber} onChange={handleChange}
                    placeholder="AB123456" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1a202c] mb-4">Academic Information</h2>
              <div>
                <label className="block text-sm font-medium text-[#1a202c] mb-1">Highest qualification</label>
                <select name="highestQualification" required value={form.highestQualification}
                  onChange={handleChange} className={inputClass + " bg-white"}>
                  <option value="">Select qualification</option>
                  {STUDY_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}&apos;s Degree</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a202c] mb-1">Institution name</label>
                <input name="institution" required value={form.institution} onChange={handleChange}
                  placeholder="University name" className={inputClass} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a202c] mb-1">Graduation year</label>
                  <input name="graduationYear" type="number" required value={form.graduationYear}
                    onChange={handleChange} placeholder="2023" min="1990" max="2030"
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a202c] mb-1">GPA / Grade</label>
                  <input name="gpa" required value={form.gpa} onChange={handleChange}
                    placeholder="e.g. 3.8 or First Class" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1a202c] mb-4">Course Information</h2>
              <div>
                <label className="block text-sm font-medium text-[#1a202c] mb-1">University</label>
                <select name="universityId" required value={form.universityId}
                  onChange={handleChange} disabled={!!applicationId}
                  className={inputClass + " bg-white" + (applicationId ? " opacity-60 cursor-not-allowed" : "")}>
                  <option value="">Select university</option>
                  {universities.map((u) => (
                    <option key={u.universityId} value={u.universityId}>{u.name}</option>
                  ))}
                </select>
                {applicationId && (
                  <p className="text-xs text-[#64748b] mt-1">
                    University cannot be changed after the application draft has been created.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a202c] mb-1">Course name</label>
                <input name="courseName" required value={form.courseName} onChange={handleChange}
                  placeholder="e.g. MSc Computer Science" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a202c] mb-1">Intended intake</label>
                <input name="intendedIntake" required value={form.intendedIntake} onChange={handleChange}
                  placeholder="e.g. September 2025" className={inputClass} />
              </div>
              <p className="text-xs text-[#64748b]">
                Your application will be saved as a draft when you continue.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1a202c] mb-4">Document Upload</h2>
              <p className="text-xs text-[#64748b] mb-2">
                Select your files below. Documents are saved immediately when selected.
              </p>
              {DOC_FIELDS.map((doc) => (
                <div key={doc.name}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-[#1a202c]">
                      {doc.label}{" "}
                      <span className="text-[#64748b] font-normal">
                        {doc.recommended ? "(recommended)" : "(optional)"}
                      </span>
                    </label>
                    {uploadedDocs[doc.fileType] && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle size={12} /> Saved
                      </span>
                    )}
                    {uploadingDoc === doc.fileType && (
                      <span className="text-xs text-[#64748b]">Saving...</span>
                    )}
                  </div>
                  <input
                    name={doc.name}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploadingDoc !== null}
                    onChange={(e) => handleFileChange(e, doc.fileType)}
                    className="w-full text-sm text-[#64748b] file:mr-3 file:py-1.5 file:px-3
                               file:rounded-lg file:border-0 file:text-xs file:font-medium
                               file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2a5298]
                               disabled:opacity-50"
                  />
                </div>
              ))}
              <p className="text-xs text-[#64748b] pt-2 border-t border-[#e2e8f0]">
                Passport copy and academic transcripts are recommended before submitting — you can still
                submit without them and add documents later if needed. Files are stored securely.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-4 border-t border-[#e2e8f0]">
            <Button type="button" variant="secondary" onClick={handleBack}
              disabled={step === 0 || submitting || uploadingDoc !== null}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={submitting}>
                {submitting ? "Saving..." : "Continue"}
              </Button>
            ) : (
              <Button type="submit" variant="accent" disabled={submitting || uploadingDoc !== null}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function NewApplicationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl">
          <Card className="text-center py-16">
            <p className="text-[#64748b]">Loading...</p>
          </Card>
        </div>
      }
    >
      <NewApplicationPageInner />
    </Suspense>
  );
}