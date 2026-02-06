// Admin Users Management Page

import { Suspense } from "react";
import { UserManagement } from "@/components/admin/UserManagement";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">
          View all users and manage their roles
        </p>
      </div>

      <Suspense fallback={<UsersSkeleton />}>
        <UserManagement />
      </Suspense>
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 bg-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}
