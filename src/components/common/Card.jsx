// components/common/Card.jsx
import { cn } from "@/lib/utils";

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
