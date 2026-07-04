// lib/utils.js
// Merges Tailwind classes safely, resolving conflicts.
// e.g. cn("px-4 px-2") → "px-2"  (last wins)
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format a Firestore ISO timestamp to readable date
export function formatDate(isoString) {
  if (!isoString) return "—";
  
  // Firestore Timestamp object — are .toDate() method
  if (isoString?.toDate) {
    return isoString.toDate().toLocaleDateString("en-GB", {
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
