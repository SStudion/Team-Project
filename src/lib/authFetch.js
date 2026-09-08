import { auth } from "@/lib/firebase/config";

export async function authFetch(url, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated Firebase user found.");
  }

  const token = await user.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}