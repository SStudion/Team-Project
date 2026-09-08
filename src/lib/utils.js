// lib/utils.js
// Merges Tailwind classes safely, resolving conflicts.
// e.g. cn("px-4 px-2") → "px-2"  (last wins)
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format a Firestore timestamp (in any of the shapes it reaches the frontend
// in) to a readable date.
export function formatDate(isoString) {
  if (!isoString) return "—";

  // Client SDK Firestore Timestamp — has a .toDate() method.
  if (isoString?.toDate) {
    return isoString.toDate().toLocaleDateString("en-GB", {
      day:   "numeric",
      month: "short",
      year:  "numeric",
    });
  }

  // Admin SDK Timestamp, once it's been through an API route's
  // Response.json(). JSON.stringify strips its .toDate()/.toJSON() methods,
  // so what actually reaches the client is a plain
  // { _seconds, _nanoseconds } object — every admin page that reads dates
  // from our API routes (not directly from the Firestore client SDK) hits
  // this shape.
  if (typeof isoString?._seconds === "number") {
    return new Date(isoString._seconds * 1000).toLocaleDateString("en-GB", {
      day:   "numeric",
      month: "short",
      year:  "numeric",
    });
  }

  // ISO string normal
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

// Get university name by ID from a list
export function getUniversityName(universityId, universities) {
  const uni = universities.find((u) => u.id === universityId);
  return uni ? uni.name : "Unknown University";
}
