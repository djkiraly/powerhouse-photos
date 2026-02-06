"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type PhotoTag = {
  id: string;
  player: {
    id: string;
    name: string;
  };
};

type Photo = {
  id: string;
  gcsPath: string;
  thumbnailPath: string | null;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
  } | null;
  tags: PhotoTag[];
  collectionsCount: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function PhotoManagement() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPhotos(currentPage);
  }, [currentPage]);

  const fetchPhotos = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/photos?page=${page}&limit=24`);
      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }
      const data = await response.json();
      setPhotos(data.photos);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map((p) => p.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedPhotos.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedPhotos.size} photo(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/admin/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: Array.from(selectedPhotos) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete photos");
      }

      const result = await response.json();
      alert(`Successfully deleted ${result.deletedCount} photos`);
      setSelectedPhotos(new Set());
      fetchPhotos(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete photos");
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-lg">Error: {error}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={photos.length === 0}
          >
            {selectedPhotos.size === photos.length && photos.length > 0 ? (
              <>
                <CheckSquare className="w-4 h-4 mr-2" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                Select All
              </>
            )}
          </Button>

          {selectedPhotos.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedPhotos.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedPhotos.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting
                ? "Deleting..."
                : `Delete (${selectedPhotos.size})`}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {pagination && (
        <div className="text-sm text-gray-600">
          Showing {photos.length} of {pagination.total} photos
        </div>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No photos found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                selectedPhotos.has(photo.id)
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              {/* Selection Checkbox */}
              <button
                className="absolute top-2 left-2 z-10"
                onClick={() => toggleSelection(photo.id)}
              >
                {selectedPhotos.has(photo.id) ? (
                  <CheckSquare className="w-6 h-6 text-blue-500 bg-white rounded" />
                ) : (
                  <Square className="w-6 h-6 text-white bg-black/30 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>

              {/* Thumbnail */}
              <div className="aspect-square bg-gray-100">
                <img
                  src={`/api/photos/${photo.id}/thumbnail`}
                  alt={photo.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Hover Info */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                <p className="text-white text-xs truncate font-medium">
                  {photo.originalName}
                </p>
                <div className="flex items-center space-x-2 text-white/80 text-xs mt-1">
                  <span>{formatFileSize(photo.fileSize)}</span>
                  {photo.tags.length > 0 && (
                    <span className="flex items-center">
                      <Tag className="w-3 h-3 mr-1" />
                      {photo.tags.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-white/80 text-xs mt-1">
                  <User className="w-3 h-3 mr-1" />
                  <span className="truncate">
                    {photo.uploader?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center text-white/80 text-xs mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>
                    {format(new Date(photo.uploadedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={currentPage === pagination.totalPages || loading}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
