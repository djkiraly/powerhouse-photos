import { Suspense } from "react";
import { FolderManager } from "@/components/folders/FolderManager";

export default function AdminFoldersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Folders</h1>
        <p className="text-gray-600 mt-1">
          Create and organize folders for your photo library
        </p>
      </div>

      <Suspense fallback={<div>Loading folders...</div>}>
        <FolderManager />
      </Suspense>
    </div>
  );
}
