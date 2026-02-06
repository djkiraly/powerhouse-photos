// Main Photo Gallery Page

import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { GalleryContent } from "@/components/photos/GalleryContent";

export default async function GalleryPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Photo Gallery</h1>
          <p className="text-gray-600 mt-1">Browse and manage your team photos</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading gallery...</div>}>
        <GalleryContent isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
