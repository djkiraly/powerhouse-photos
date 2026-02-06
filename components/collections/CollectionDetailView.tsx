"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Download, Trash2, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const GCS_BUCKET_URL = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'pph_photos'}`;

type Photo = {
  id: string;
  gcsPath: string;
  thumbnailPath: string | null;
  originalName: string;
  mimeType?: string;
  uploadedAt: string;
  uploadedById: string;
  uploader: { name: string } | null;
  tags: Array<{
    id: string;
    player: { id: string; name: string };
  }>;
};

type CollectionPhoto = {
  id: string;
  addedAt: string;
  photo: Photo;
};

type Collection = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  photos: CollectionPhoto[];
};

type CollectionDetailViewProps = {
  collectionId: string;
};

export function CollectionDetailView({ collectionId }: CollectionDetailViewProps) {
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchCollection();
  }, [collectionId]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/collections/${collectionId}`);
      if (res.ok) {
        setCollection(await res.json());
      } else if (res.status === 404) {
        router.push("/collections");
      }
    } catch (error) {
      console.error("Error fetching collection:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    if (!confirm("Remove this photo from the collection?")) return;
    setRemoving(photoId);
    try {
      const res = await fetch(
        `/api/collections/${collectionId}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setCollection((prev) =>
          prev
            ? { ...prev, photos: prev.photos.filter((cp) => cp.photo.id !== photoId) }
            : prev
        );
      }
    } catch (error) {
      console.error("Error removing photo:", error);
    } finally {
      setRemoving(null);
    }
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const url = `${GCS_BUCKET_URL}/${photo.gcsPath}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = photo.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading photo:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Collection not found.</p>
        <Link href="/collections" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/collections">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
            {collection.description && (
              <p className="text-gray-600 mt-1">{collection.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {collection.photos.length} photo{collection.photos.length !== 1 ? "s" : ""} &middot; Created{" "}
              {formatDistanceToNow(new Date(collection.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {collection.photos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">This collection is empty.</p>
          <p className="text-sm text-gray-400 mt-1">
            Select photos from the gallery and use &quot;Add to Collection&quot; to add them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collection.photos.map((cp) => {
            const photo = cp.photo;
            const imageUrl = photo.thumbnailPath
              ? `${GCS_BUCKET_URL}/${photo.thumbnailPath}`
              : `${GCS_BUCKET_URL}/${photo.gcsPath}`;

            return (
              <div
                key={cp.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <Image
                  src={imageUrl}
                  alt={photo.originalName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />

                {/* Video play icon overlay */}
                {photo.mimeType?.startsWith('video/') && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    {photo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {photo.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.player.id}
                            className="px-2 py-1 bg-blue-500/90 rounded text-xs font-medium"
                          >
                            {tag.player.name}
                          </span>
                        ))}
                        {photo.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-500/90 rounded text-xs font-medium">
                            +{photo.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs font-medium truncate">{photo.originalName}</p>
                    <p className="text-xs text-gray-300">
                      {photo.uploader?.name || "Unknown"} &middot;{" "}
                      {formatDistanceToNow(new Date(photo.uploadedAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleDownload(photo)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleRemovePhoto(photo.id)}
                      disabled={removing === photo.id}
                    >
                      {removing === photo.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
