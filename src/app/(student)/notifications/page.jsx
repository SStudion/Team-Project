"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import { formatDate } from "@/lib/utils";
import { Bell } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

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

  async function markAsRead(notifId, e) {
    e.stopPropagation();
    setMarkingId(notifId);
    try {
      await authFetch(`/api/notifications/${notifId}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => n.id === notifId ? { ...n, readStatus: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    } finally {
      setMarkingId(null);
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      await authFetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  }

  function handleNotifClick(notif) {
    if (notif.applicationId) {
      router.push(`/applications/${notif.applicationId}`);
    }
  }

  const unreadCount = notifications.filter((n) => !n.readStatus).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Notifications</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            {loading ? "Loading..." : `${notifications.length} notifications total`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="w-full sm:w-auto shrink-0"
          >
            {markingAll ? "Marking..." : `Mark all as read (${unreadCount})`}
          </Button>
        )}
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
              onClick={() => handleNotifClick(notif)}
              className={`flex items-start gap-4 p-4 transition-colors
                ${!notif.readStatus ? "border-l-4 border-l-[#1e3a5f]" : ""}
                ${notif.applicationId ? "cursor-pointer hover:bg-[#f8f9fb]" : ""}
              `}
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
                  {notif.applicationId && (
                    <span className="ml-2 text-[#2a5298]">View application →</span>
                  )}
                </p>
              </div>
              {!notif.readStatus && (
                <button
                  onClick={(e) => markAsRead(notif.id, e)}
                  disabled={markingId === notif.id}
                  className="text-xs font-medium text-[#2a5298] hover:underline shrink-0 disabled:opacity-50"
                >
                  {markingId === notif.id ? "..." : "Mark as read"}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}