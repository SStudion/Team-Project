// ─────────────────────────────────────────────────────────
// mock/data.js
//
// All mock data for Sprint 1.
// IMPORTANT: Field names here must exactly match Firestore.
// When Firebase is connected in Sprint 2, this file is deleted
// and replaced by real Firestore queries — nothing else changes.
// ─────────────────────────────────────────────────────────

// ── Mock: Current logged-in student ──────────────────────
export const mockStudent = {
  uid:            "student_001",
  email:          "sample.student@email.com",
  fullName:       "Sample Student",
  role:           "student",
  nationality:    "Romanian",
  intendedLevel:  "Master",
  universityId:   null,
  emailVerified:  true,
  createdAt:      "2024-01-10T09:00:00Z",
};

// ── Mock: Current logged-in admin ────────────────────────
export const mockAdmin = {
  uid:            "admin_001",
  email:          "admin@solent.ac.uk",
  fullName:       "Dr. James Carter",
  role:           "university_admin",
  nationality:    null,
  intendedLevel:  null,
  universityId:   "uni_001",
  emailVerified:  true,
  createdAt:      "2023-09-01T08:00:00Z",
};

// ── Mock: Universities ────────────────────────────────────
export const mockUniversities = [
  {
    id:           "uni_001",
    name:         "Southampton Solent University",
    adminUserIds: ["admin_001"],
  },
  {
    id:           "uni_002",
    name:         "University of Southampton",
    adminUserIds: ["admin_002"],
  },
  {
    id:           "uni_003",
    name:         "University of Portsmouth",
    adminUserIds: ["admin_003"],
  },
];

// ── Mock: Applications ────────────────────────────────────
export const mockApplications = [
  {
    id:           "app_001",
    studentId:    "student_001",
    universityId: "uni_001",
    status:       "submitted",
    personalInfo: {
      fullName:       "Sample Student",
      dateOfBirth:    "1998-05-12",
      nationality:    "Romanian",
      passportNumber: "AB123456",
    },
    academicInfo: {
      highestQualification: "Bachelor's Degree",
      institution:          "Solent University",
      graduationYear:       2022,
      gpa:                  "3.8",
    },
    courseInfo: {
      universityId:   "uni_001",
      courseName:     "MSc Computer Science",
      intendedIntake: "September 2025",
    },
    adminNotes:      "",
    decisionMessage: "",
    createdAt:       "2024-01-15T10:00:00Z",
    updatedAt:       "2024-01-20T14:00:00Z",
  },
  {
    id:           "app_002",
    studentId:    "student_001",
    universityId: "uni_002",
    status:       "under_review",
    personalInfo: {
      fullName:       "Sample Student",
      dateOfBirth:    "1998-05-12",
      nationality:    "Romanian",
      passportNumber: "AB123456",
    },
    academicInfo: {
      highestQualification: "Bachelor's Degree",
      institution:          "Solent University",
      graduationYear:       2022,
      gpa:                  "3.8",
    },
    courseInfo: {
      universityId:   "uni_002",
      courseName:     "MSc Data Science",
      intendedIntake: "September 2025",
    },
    adminNotes:      "Strong candidate, awaiting reference.",
    decisionMessage: "",
    createdAt:       "2024-01-18T11:00:00Z",
    updatedAt:       "2024-02-01T09:00:00Z",
  },
  {
    id:           "app_003",
    studentId:    "student_001",
    universityId: "uni_003",
    status:       "offered",
    personalInfo: {
      fullName:       "Sample Student",
      dateOfBirth:    "1998-05-12",
      nationality:    "Romanian",
      passportNumber: "AB123456",
    },
    academicInfo: {
      highestQualification: "Bachelor's Degree",
      institution:          "Solent University",
      graduationYear:       2022,
      gpa:                  "3.8",
    },
    courseInfo: {
      universityId:   "uni_003",
      courseName:     "MSc Artificial Intelligence",
      intendedIntake: "January 2025",
    },
    adminNotes:      "Excellent profile.",
    decisionMessage: "We are pleased to offer you a place on this programme.",
    createdAt:       "2024-01-05T08:00:00Z",
    updatedAt:       "2024-01-28T16:00:00Z",
  },
  {
    id:           "app_004",
    studentId:    "student_001",
    universityId: "uni_001",
    status:       "draft",
    personalInfo: {
      fullName:       "Sample Student",
      dateOfBirth:    "1998-05-12",
      nationality:    "Romanian",
      passportNumber: "AB123456",
    },
    academicInfo: {
      highestQualification: "Bachelor's Degree",
      institution:          "Solent University",
      graduationYear:       2022,
      gpa:                  "3.8",
    },
    courseInfo: {
      universityId:   "uni_001",
      courseName:     "MSc Cybersecurity",
      intendedIntake: "September 2025",
    },
    adminNotes:      "",
    decisionMessage: "",
    createdAt:       "2024-02-10T12:00:00Z",
    updatedAt:       "2024-02-10T12:00:00Z",
  },
];

// ── Mock: Applications for admin view (all students) ──────
export const mockAdminApplications = [
  ...mockApplications,
  {
    id:           "app_005",
    studentId:    "student_002",
    universityId: "uni_001",
    status:       "submitted",
    personalInfo: {
      fullName:       "Marcus Johnson",
      dateOfBirth:    "1997-03-22",
      nationality:    "British",
      passportNumber: "CD789012",
    },
    academicInfo: {
      highestQualification: "Bachelor's Degree",
      institution:          "University of Brighton",
      graduationYear:       2021,
      gpa:                  "3.5",
    },
    courseInfo: {
      universityId:   "uni_001",
      courseName:     "MSc Computer Science",
      intendedIntake: "September 2025",
    },
    adminNotes:      "",
    decisionMessage: "",
    createdAt:       "2024-02-05T14:00:00Z",
    updatedAt:       "2024-02-05T14:00:00Z",
  },
  {
    id:           "app_006",
    studentId:    "student_003",
    universityId: "uni_001",
    status:       "rejected",
    personalInfo: {
      fullName:       "Priya Patel",
      dateOfBirth:    "1999-11-08",
      nationality:    "Indian",
      passportNumber: "EF345678",
    },
    academicInfo: {
      highestQualification: "Bachelor's Degree",
      institution:          "University of Delhi",
      graduationYear:       2023,
      gpa:                  "2.9",
    },
    courseInfo: {
      universityId:   "uni_001",
      courseName:     "MSc Data Science",
      intendedIntake: "January 2025",
    },
    adminNotes:      "GPA below minimum requirement.",
    decisionMessage: "We regret that we are unable to offer you a place at this time.",
    createdAt:       "2024-01-20T10:00:00Z",
    updatedAt:       "2024-01-25T11:00:00Z",
  },
];

// ── Mock: Notifications ───────────────────────────────────
export const mockNotifications = [
  {
    id:          "notif_001",
    userId:      "student_001",
    message:     "Your application to University of Portsmouth has been updated.",
    readStatus:  false,
    createdAt:   "2024-01-28T16:00:00Z",
  },
  {
    id:          "notif_002",
    userId:      "student_001",
    message:     "Your application to University of Southampton is now under review.",
    readStatus:  false,
    createdAt:   "2024-02-01T09:00:00Z",
  },
  {
    id:          "notif_003",
    userId:      "student_001",
    message:     "Your application to Southampton Solent University was received.",
    readStatus:  true,
    createdAt:   "2024-01-20T14:00:00Z",
  },
];


// ── Mock: Documents per application ──────────────────────
export const mockDocuments = [
  // app_001 — Anna, MSc Computer Science
  { id: "doc_001", applicationId: "app_001", fileType: "passport",    uploadedAt: "2024-01-15T10:00:00Z" },
  { id: "doc_002", applicationId: "app_001", fileType: "transcript",  uploadedAt: "2024-01-15T10:01:00Z" },
  { id: "doc_003", applicationId: "app_001", fileType: "certificate", uploadedAt: "2024-01-15T10:02:00Z" },

  // app_002 — Anna, MSc Data Science
  { id: "doc_004", applicationId: "app_002", fileType: "passport",    uploadedAt: "2024-01-18T11:00:00Z" },
  { id: "doc_005", applicationId: "app_002", fileType: "transcript",  uploadedAt: "2024-01-18T11:01:00Z" },

  // app_003 — Anna, MSc AI (offered)
  { id: "doc_006", applicationId: "app_003", fileType: "passport",    uploadedAt: "2024-01-05T08:00:00Z" },
  { id: "doc_007", applicationId: "app_003", fileType: "transcript",  uploadedAt: "2024-01-05T08:01:00Z" },
  { id: "doc_008", applicationId: "app_003", fileType: "english_test",uploadedAt: "2024-01-05T08:02:00Z" },

  // app_004 — Anna, draft (niciun document încă)

  // app_005 — Marcus Johnson
  { id: "doc_009", applicationId: "app_005", fileType: "passport",    uploadedAt: "2024-02-05T14:00:00Z" },
  { id: "doc_010", applicationId: "app_005", fileType: "transcript",  uploadedAt: "2024-02-05T14:01:00Z" },

  // app_006 — Priya Patel
  { id: "doc_011", applicationId: "app_006", fileType: "passport",    uploadedAt: "2024-01-20T10:00:00Z" },
  { id: "doc_012", applicationId: "app_006", fileType: "transcript",  uploadedAt: "2024-01-20T10:01:00Z" },
  { id: "doc_013", applicationId: "app_006", fileType: "certificate", uploadedAt: "2024-01-20T10:02:00Z" },
];