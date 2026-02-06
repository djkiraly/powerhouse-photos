"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { FolderOpen, MoreVertical, Share2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GCS_BUCKET_URL = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'pph_photos'}`;
import { ShareCollectionDialog } from "@/components/collections/ShareCollectionDialog";
import { useState } from "react";

type CollectionCardProps = {
  collection: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    shareToken?: string | null;
    photos: Array<{
      photo: {
        id: string;
        thumbnailPath: string | null;
        gcsPath: string;
      };
    }>;
    _count: {
      photos: number;
    };
  };
  onUpdate: () => void;
};

export function CollectionCard({ collection, onUpdate }: CollectionCardProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${collection.name}"? Photos will remain in the library.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  return (
    <>
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg">{collection.name}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Link href={`/collections/${collection.id}`}>
          {/* Photo Preview Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4 cursor-pointer">
            {collection.photos.slice(0, 4).map((cp) => {
              const imageUrl = cp.photo.thumbnailPath
                ? `${GCS_BUCKET_URL}/${cp.photo.thumbnailPath}`
                : `${GCS_BUCKET_URL}/${cp.photo.gcsPath}`;
              return (
                <div
                  key={cp.photo.id}
                  className="aspect-square bg-gray-200 rounded overflow-hidden relative"
                >
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 120px"
                  />
                </div>
              );
            })}
            {[...Array(Math.max(0, 4 - collection.photos.length))].map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="aspect-square bg-gray-100 rounded flex items-center justify-center"
              >
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {collection.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {collection.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{collection._count.photos} photos</span>
              <span>
                {formatDistanceToNow(new Date(collection.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>

    {showShareDialog && (
      <ShareCollectionDialog
        collectionId={collection.id}
        collectionName={collection.name}
        hasShareToken={!!collection.shareToken}
        onClose={() => setShowShareDialog(false)}
        onUpdate={onUpdate}
      />
    )}
    </>
  );
}
