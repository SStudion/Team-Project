"use client";
// app/(student)/notifications/page.jsx

import { useState, useEffect } from "react";
import Card from "@/components/common/Card";
import { formatDate } from "@/lib/utils";
import { Bell } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.uid) return;
      try {
        const snap = await getDocs(
          query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          )
        );
        setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, [user?.uid]);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Notifications</h1>
        <p className="text-sm text-[#64748b] mt-0.5">
          {loading ? "Loading..." : `${notifications.length} notifications total`}
        </p>
      </div>

      {loading ? (
        <Card className="text-center py-16">
          <p className="text-sm text-[#64748b]">Loading notifications...</p>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-16">
          <Bell size={32} className="text-[#e2e8f0] mx-auto mb-3" />
          <p className="text-[#64748b]">No notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`flex items-start gap-4 p-4 ${
                !notif.readStatus ? "border-l-4 border-l-[#1e3a5f]" : ""
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <div className={`w-2 h-2 rounded-full mt-1 ${
                  !notif.readStatus ? "bg-[#1e3a5f]" : "bg-[#e2e8f0]"
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#1a202c] leading-relaxed">
                  {notif.message}
                </p>
                <p className="text-xs text-[#64748b] mt-1">
                  {formatDate(notif.createdAt)}
                </p>
              </div>
              {!notif.readStatus && (
                <span className="text-xs font-medium text-[#2a5298] shrink-0">
                  New
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}