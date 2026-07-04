// components/common/StatusBadge.jsx
//
// Displays an application status as a coloured pill badge.
// Uses STATUS_LABELS and STATUS_STYLES from constants
// so the UI always stays in sync with Firestore values.

import { STATUS_LABELS, STATUS_STYLES } from "@/constants";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, className }) {
  const label = STATUS_LABELS[status] ?? status;
  const styles = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}
