// api/applications/[applicationId]/resubmit — POST (student)
//
// Sprint 3 — missing document workflow (client decision D-03/D-04). Called
// once the student has uploaded every document the admin flagged as missing;
// moves the application from missing_documents back into under_review so it
// re-enters the admin's queue without the student ever writing `status`
// themselves.
//
// Why this goes through the server instead of a direct client Firestore
// write: firestore.rules only lets a student move their own application
// draft -> submitted today (see the `applications` update rule) — there is
// no branch that lets a student set an arbitrary status, and this route is
// deliberately not asking for one. Every other status transition in this
// app already goes through server code (decisionService.js) specifically so
// there's one consistent audit trail; this keeps that promise instead of
// carving out a second, looser path just for students.

import { requireStudent, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { resubmitMissingDocuments } from "@/lib/server/decisionService";

export async function POST(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;

    if (!applicationId) throw new ApiError(400, "applicationId is required.");

    const result = await resubmitMissingDocuments({ applicationId, student });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
