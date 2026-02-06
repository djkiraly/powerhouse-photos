// Admin Audit Log Page

import { Suspense } from "react";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600 mt-1">
          Track all system activity including uploads, tagging, and logins
        </p>
      </div>

      <Suspense fallback={<AuditSkeleton />}>
        <AuditLogViewer />
      </Suspense>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="h-12 bg-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}
