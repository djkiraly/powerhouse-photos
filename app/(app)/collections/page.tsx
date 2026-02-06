// Collections Page

import { Suspense } from "react";
import { CollectionGrid } from "@/components/collections/CollectionGrid";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";

export default function CollectionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Collections</h1>
          <p className="text-gray-600 mt-1">
            Organize your photos into custom albums
          </p>
        </div>
        <CreateCollectionDialog />
      </div>

      <Suspense fallback={<div>Loading collections...</div>}>
        <CollectionGrid />
      </Suspense>
    </div>
  );
}
