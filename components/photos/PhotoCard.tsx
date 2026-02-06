"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Download, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const GCS_BUCKET_URL = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'pph_photos'}`;

type PhotoCardProps = {
  photo: {
    id: string;
    gcsPath: string;
    thumbnailPath: string | null;
    originalName: string;
    uploadedAt: string;
    uploader: {
      name: string;
    } | null;
    tags: Array<{
      player: {
        id: string;
        name: string;
      };
    }>;
  };
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview?: () => void;
  isAdmin?: boolean;
};

export function PhotoCard({ photo, selected, onToggleSelect, onDelete, onPreview, isAdmin = false }: PhotoCardProps) {
  const [imageError, setImageError] = useState(false);

  // Construct the public GCS URL for the thumbnail or full image
  const imageUrl = photo.thumbnailPath
    ? `${GCS_BUCKET_URL}/${photo.thumbnailPath}`
    : `${GCS_BUCKET_URL}/${photo.gcsPath}`;

  const fullImageUrl = `${GCS_BUCKET_URL}/${photo.gcsPath}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(fullImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  return (
    <div
      className={`relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer transition-all ${
        selected ? 'ring-4 ring-blue-500' : ''
      }`}
      onClick={() => onPreview?.()}
    >
      {/* Image */}
      <div className="w-full h-full relative">
        {imageError ? (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500 text-sm">Failed to load</span>
          </div>
        ) : (
          <Image
            src={imageUrl}
            alt={photo.originalName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Selection checkbox */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
      >
        <div
          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'bg-blue-500 border-blue-500'
              : 'bg-white border-gray-300 opacity-0 group-hover:opacity-100'
          }`}
        >
          {selected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>

      {/* Overlay with info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          {/* Player tags */}
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

          {/* Metadata */}
          <div className="text-xs space-y-0.5">
            <p className="font-medium truncate">{photo.originalName}</p>
            <p className="text-gray-300">
              {photo.uploader?.name || 'Unknown'} •{' '}
              {formatDistanceToNow(new Date(photo.uploadedAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex space-x-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
          {isAdmin && (
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
