"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import { STUDY_LEVELS } from "@/constants";
import { createDraftApplication, submitApplication } from "@/lib/firebase/applications";
import { listUniversities } from "@/lib/firebase/universities";
import { CheckCircle } from "lucide-react";

const STEPS = ["Personal Info", "Academic Info", "Course", "Documents"];

const emptyForm = {
  fullName: "", dateOfBirth: "", nationality: "", passportNumber: "",
  highestQualification: "", institution: "", graduationYear: "", gpa: "",
  universityId: "", courseName: "", intendedIntake: "",
  passport: null, transcript: null, certificate: null, englishTest: null,
};

export default function NewApplicationPage() {
  const router = useRouter();
  const [step, setStep]                   = useState(0);
  const [form, setForm]                   = useState(emptyForm);
  const [universities, setUniversities]   = useState([]);
  const [applicationId, setApplicationId] = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [submitted, setSubmitted]         = useState(false);

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

  function handleChange(e) {
    const { name, value, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
    setError("");
  }

  async function handleNext() {
    setError("");

    if (step === 2) {
      if (!form.universityId || !form.courseName || !form.intendedIntake) {
        setError("Please fill in all course fields before continuing.");
        return;
      }
      try {
        setSubmitting(true);
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
        setStep((s) => s + 1);
      } catch (err) {
        setError(err.message || "Could not save your application. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
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
      await submitApplication(applicationId);
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
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">New Application</h1>
      <p className="text-[#64748b] text-sm mb-6">Complete all steps to submit your application.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
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

          {/* Step 0 — Personal Info */}
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

          {/* Step 1 — Academic Info */}
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

          {/* Step 2 — Course */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1a202c] mb-4">Course Information</h2>
              <div>
                <label className="block text-sm font-medium text-[#1a202c] mb-1">University</label>
                <select name="universityId" required value={form.universityId}
                  onChange={handleChange} className={inputClass + " bg-white"}>
                  <option value="">Select university</option>
                  {universities.map((u) => (
                    <option key={u.universityId} value={u.universityId}>{u.name}</option>
                  ))}
                </select>
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

          {/* Step 3 — Documents */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1a202c] mb-4">Document Upload</h2>
              <p className="text-xs text-[#64748b] mb-2">
                Document upload will be available in the next sprint. You can submit your application now and upload documents later.
              </p>
              {[
                { name: "passport",    label: "Passport copy",               required: true  },
                { name: "transcript",  label: "Academic transcripts",         required: true  },
                { name: "certificate", label: "Certificates",                 required: false },
                { name: "englishTest", label: "English language test result", required: false },
              ].map((doc) => (
                <div key={doc.name}>
                  <label className="block text-sm font-medium text-[#1a202c] mb-1">
                    {doc.label}{" "}
                    {!doc.required && (
                      <span className="text-[#64748b] font-normal">(optional)</span>
                    )}
                  </label>
                  <input
                    name={doc.name}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleChange}
                    className="w-full text-sm text-[#64748b] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2a5298]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#e2e8f0]">
            <Button type="button" variant="secondary" onClick={handleBack}
              disabled={step === 0 || submitting}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={submitting}>
                {submitting ? "Saving..." : "Continue"}
              </Button>
            ) : (
              <Button type="submit" variant="accent" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}