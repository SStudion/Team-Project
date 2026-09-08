// app/page.jsx — Root redirect
// Sprint 1: redirects straight to login.
// Sprint 2: middleware will handle role-based redirects before this runs.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
