// Admin Photos Management Page

import { Suspense } from "react";
import { PhotoManagement } from "@/components/admin/PhotoManagement";

export default function AdminPhotosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Photo Management</h1>
        <p className="text-gray-600 mt-1">
          View, moderate, and manage all uploaded photos
        </p>
      </div>

      <Suspense fallback={<PhotosSkeleton />}>
        <PhotoManagement />
      </Suspense>
    </div>
  );
}

function PhotosSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}
