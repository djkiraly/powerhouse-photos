"use client";

import { useEffect, useState } from "react";
import { PhotoCard } from "./PhotoCard";
import { PhotoPreview } from "./PhotoPreview";
import { Button } from "@/components/ui/button";
import { Download, FolderPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { AddToCollectionDialog } from "@/components/collections/AddToCollectionDialog";

type Photo = {
  id: string;
  gcsPath: string;
  thumbnailPath: string | null;
  originalName: string;
  uploadedAt: string;
  uploader: {
    name: string;
  } | null;
  tags: Array<{
    id: string;
    player: {
      id: string;
      name: string;
    };
  }>;
  teamTags: Array<{
    id: string;
    team: {
      id: string;
      name: string;
    };
  }>;
};

type PhotoGridProps = {
  isAdmin?: boolean;
  folderId?: string | null;
  playerIds?: string[];
  teamIds?: string[];
  startDate?: string;
  endDate?: string;
};

const PHOTOS_PER_PAGE = 100;

export function PhotoGrid({ isAdmin = false, folderId, playerIds = [], teamIds = [], startDate, endDate }: PhotoGridProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [folderId, playerIds, teamIds, startDate, endDate]);

  useEffect(() => {
    fetchPhotos();
  }, [folderId, playerIds, teamIds, startDate, endDate, page]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PHOTOS_PER_PAGE));
      if (folderId) {
        params.set('folderId', folderId);
      }
      if (playerIds.length > 0) {
        params.set('playerIds', playerIds.join(','));
      }
      if (teamIds.length > 0) {
        params.set('teamIds', teamIds.join(','));
      }
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }
      const response = await fetch(`/api/photos?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const handleBulkDownload = async () => {
    try {
      const response = await fetch('/api/photos/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: Array.from(selectedPhotos) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photos-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading photos:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No photos found. Upload some to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection toolbar */}
      {selectedPhotos.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-6 py-3 flex items-center space-x-4 z-50 border border-gray-200">
          <span className="text-sm font-medium">
            {selectedPhotos.size} selected
          </span>
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleBulkDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddToCollection(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Add to Collection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedPhotos(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Main content area with grid and preview */}
      <div className={`flex gap-4 ${previewPhoto ? 'flex-col xl:flex-row' : ''}`}>
        {/* Photo Grid */}
        <div className={`${previewPhoto ? 'xl:flex-1' : 'w-full'}`}>
          <div className={`grid gap-4 ${
            previewPhoto
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selected={selectedPhotos.has(photo.id)}
                onToggleSelect={() => togglePhotoSelection(photo.id)}
                onDelete={() => fetchPhotos()}
                onPreview={() => setPreviewPhoto(photo)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>

        {/* Preview Pane */}
        {previewPhoto && (
          <div className="xl:w-[400px] xl:shrink-0 sticky top-4 h-fit">
            <PhotoPreview
              photo={previewPhoto}
              onClose={() => setPreviewPhoto(null)}
              onDelete={() => fetchPhotos()}
              onTagsChange={(updatedPhoto) => {
                // Update the photo in the grid
                setPhotos(photos.map(p =>
                  p.id === updatedPhoto.id ? updatedPhoto : p
                ));
                // Update the preview photo
                setPreviewPhoto(updatedPhoto);
              }}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * PHOTOS_PER_PAGE + 1}–{Math.min(page * PHOTOS_PER_PAGE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-700 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {showAddToCollection && (
        <AddToCollectionDialog
          photoIds={Array.from(selectedPhotos)}
          onClose={() => setShowAddToCollection(false)}
          onDone={() => setSelectedPhotos(new Set())}
        />
      )}
    </div>
  );
}
