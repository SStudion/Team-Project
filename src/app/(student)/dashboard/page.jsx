"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import ApplicationCard from "@/components/student/ApplicationCard";
import { useAuth } from "@/context/AuthContext";
import { getMyApplications } from "@/lib/firebase/applications";
import { STATUS } from "@/constants";
import { formatDate } from "@/lib/utils";
import { PlusCircle, Bell, TrendingUp } from "lucide-react";

function countByStatus(apps, status) {
  return apps.filter((a) => a.status === status).length;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!user?.uid) return;
  
      async function fetchApplications() {
        try {
          const data = await getMyApplications();
          setApplications(data);
        } catch (error) {
          console.error("Failed to load applications:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchApplications();
    }, [user?.uid]);

  const stats = [
    { label: "Total Applications", value: applications.length,                              color: "border-l-[#1e3a5f]" },
    { label: "Under Review",       value: countByStatus(applications, STATUS.UNDER_REVIEW), color: "border-l-amber-500" },
    { label: "Offers Received",    value: countByStatus(applications, STATUS.OFFERED),      color: "border-l-green-500" },
    { label: "Drafts",             value: countByStatus(applications, STATUS.DRAFT),        color: "border-l-gray-400" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            Hello, {user?.fullName?.split(" ")[0]} 👋
          </h1>
          <p className="text-[#64748b] text-sm mt-0.5">
            Here&apos;s an overview of your applications.
          </p>
        </div>
        <Link href="/applications/new">
          <Button>
            <PlusCircle size={16} />
            New Application
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`border-l-4 ${stat.color} pl-4`}>
            <p className="text-2xl font-bold text-[#1e3a5f]">{stat.value}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Recent applications */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1a202c]">Recent Applications</h2>
            <Link href="/applications" className="text-xs text-[#2a5298] hover:underline flex items-center gap-1">
              <TrendingUp size={12} /> View all
            </Link>
          </div>

          {loading ? (
            <Card className="text-center py-10">
              <p className="text-sm text-[#64748b]">Loading applications...</p>
            </Card>
          ) : applications.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-sm text-[#64748b] mb-3">No applications yet.</p>
              <Link href="/applications/new">
                <Button size="sm">Start your first application</Button>
              </Link>
            </Card>
          ) : (
            applications.slice(0, 3).map((app) => (
              <ApplicationCard key={app.applicationId} application={app} />
            ))
          )}
        </div>

        {/* Notifications*/}
        <div>
          <h2 className="font-semibold text-[#1a202c] mb-3">Notifications</h2>
          <Card className="text-center py-8">
            <Bell size={24} className="text-[#e2e8f0] mx-auto mb-2" />
            <p className="text-sm text-[#64748b]">No new notifications</p>
          </Card>
        </div>
      </div>
    </div>
  );
}