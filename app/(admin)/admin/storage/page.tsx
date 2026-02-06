// Admin Storage (GCS) Configuration Page

import { Suspense } from "react";
import { StorageManagement } from "@/components/admin/StorageManagement";

export default function AdminStoragePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Storage Configuration</h1>
        <p className="text-gray-600 mt-1">
          Google Cloud Storage settings and connectivity testing
        </p>
      </div>

      <Suspense fallback={<StorageSkeleton />}>
        <StorageManagement />
      </Suspense>
    </div>
  );
}

function StorageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
