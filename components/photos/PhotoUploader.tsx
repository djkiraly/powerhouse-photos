"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Check, Folder, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatFileSize, isValidMediaType, isValidVideoType, isValidFileSize } from "@/lib/utils";

type UploadFile = {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  photoId?: string;
};

type FolderType = {
  id: string;
  name: string;
  parentId: string | null;
  _count: {
    photos: number;
    children: number;
  };
};

export function PhotoUploader() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root' }
  ]);
  const [loadingFolders, setLoadingFolders] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, [currentParentId]);

  const fetchFolders = async () => {
    try {
      const url = currentParentId
        ? `/api/folders?parentId=${currentParentId}`
        : '/api/folders';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setCurrentParentId(null);
      setFolderPath([{ id: null, name: 'Root' }]);
    } else {
      setCurrentParentId(folderId);
      setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = folderPath[index];
    setCurrentParentId(crumb.id);
    setFolderPath(folderPath.slice(0, index + 1));
  };

  const selectFolder = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedFolderId) {
      return; // Don't allow uploads without a folder selected
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36),
      status: 'pending' as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Start uploading
    newFiles.forEach(uploadFile => handleUpload(uploadFile));
  }, [selectedFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp'],
      'video/*': ['.mp4', '.mov'],
    },
    validator: (file) => {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
      if (file.size > maxSize) {
        return {
          code: 'file-too-large',
          message: `File is too large (max ${isVideo ? '100MB' : '25MB'})`,
        };
      }
      return null;
    },
  });

  const generateVideoThumbnail = async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadeddata = () => {
        video.currentTime = 1;
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 800);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
    });
  };

  const handleUpload = async (uploadFile: UploadFile) => {
    const { file, id } = uploadFile;
    const isVideo = isValidVideoType(file.type);

    // Validate
    if (!isValidMediaType(file.type)) {
      updateFileStatus(id, 'error', 0, 'Invalid file type');
      return;
    }

    if (!isValidFileSize(file.size, file.type)) {
      updateFileStatus(id, 'error', 0, `File too large (max ${isVideo ? '100MB' : '25MB'})`);
      return;
    }

    try {
      // Step 1: Get signed URL
      updateFileStatus(id, 'uploading', 10);

      const urlResponse = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalFilename: file.name, contentType: file.type }),
      });

      if (!urlResponse.ok) throw new Error('Failed to get upload URL');

      const { signedUrl, gcsPath } = await urlResponse.json();
      updateFileStatus(id, 'uploading', 30);

      // Step 2: Upload to GCS
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload to storage');
      updateFileStatus(id, 'processing', 60);

      // Step 2.5: For videos, generate and upload thumbnail client-side
      let thumbnailGcsPath: string | undefined;
      if (isVideo) {
        const thumbnailBlob = await generateVideoThumbnail(file);
        if (thumbnailBlob) {
          const thumbUrlResponse = await fetch('/api/upload/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalFilename: file.name.replace(/\.[^.]+$/, '.jpg'),
              contentType: 'image/jpeg',
            }),
          });
          if (thumbUrlResponse.ok) {
            const { signedUrl: thumbSignedUrl, gcsPath: thumbGcsPath } = await thumbUrlResponse.json();
            const thumbUploadResponse = await fetch(thumbSignedUrl, {
              method: 'PUT',
              body: thumbnailBlob,
              headers: { 'Content-Type': 'image/jpeg' },
            });
            if (thumbUploadResponse.ok) {
              thumbnailGcsPath = thumbGcsPath;
            }
          }
        }
        updateFileStatus(id, 'processing', 80);
      }

      // Step 3: Create photo record
      const photoResponse = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcsPath,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          folderId: selectedFolderId,
          ...(thumbnailGcsPath && { thumbnailGcsPath }),
        }),
      });

      if (!photoResponse.ok) throw new Error('Failed to create photo record');

      const photo = await photoResponse.json();
      updateFileStatus(id, 'complete', 100, undefined, photo.id);
    } catch (error) {
      console.error('Upload error:', error);
      updateFileStatus(id, 'error', 0, error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const updateFileStatus = (
    id: string,
    status: UploadFile['status'],
    progress: number,
    error?: string,
    photoId?: string
  ) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === id ? { ...f, status, progress, error, photoId } : f
      )
    );
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Folder Selection */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Select Destination Folder *</Label>
            <p className="text-xs text-gray-500 mt-1">
              Choose a folder where the photos will be uploaded
            </p>
          </div>

          {/* Selected folder display */}
          {selectedFolderId && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Folder className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">{selectedFolderName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-blue-600 hover:text-blue-800"
                onClick={() => {
                  setSelectedFolderId(null);
                  setSelectedFolderName(null);
                }}
              >
                Change
              </Button>
            </div>
          )}

          {/* Folder browser */}
          {!selectedFolderId && (
            <div className="border rounded-lg">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-sm p-3 border-b bg-gray-50">
                {folderPath.map((crumb, index) => (
                  <div key={crumb.id || 'root'} className="flex items-center">
                    {index > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}
                    <button
                      onClick={() => navigateToBreadcrumb(index)}
                      className={`hover:text-blue-600 ${
                        index === folderPath.length - 1
                          ? 'font-medium text-gray-900'
                          : 'text-gray-600'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Folder list */}
              <div className="max-h-60 overflow-y-auto">
                {loadingFolders ? (
                  <div className="p-4 text-center text-gray-500">Loading folders...</div>
                ) : folders.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Folder className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm">No folders here</p>
                    {currentParentId === null && (
                      <p className="text-xs mt-1">Ask an admin to create folders first</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50"
                      >
                        <Folder className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{folder.name}</p>
                          <p className="text-xs text-gray-500">
                            {folder._count.photos} photos
                            {folder._count.children > 0 && ` • ${folder._count.children} subfolders`}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {folder._count.children > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigateToFolder(folder.id, folder.name)}
                            >
                              Open
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectFolder(folder.id, folder.name)}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Dropzone */}
      <Card className={!selectedFolderId ? 'opacity-50' : ''}>
        <div
          {...getRootProps()}
          className={`p-12 border-2 border-dashed rounded-lg transition-colors ${
            !selectedFolderId
              ? 'cursor-not-allowed border-gray-200 bg-gray-50'
              : isDragActive
                ? 'cursor-pointer border-blue-500 bg-blue-50'
                : 'cursor-pointer border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} disabled={!selectedFolderId} />
          <div className="text-center">
            {!selectedFolderId ? (
              <>
                <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Select a folder first
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  You must choose a destination folder before uploading
                </p>
              </>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {isDragActive ? 'Drop files here' : 'Drag and drop photos or videos here'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  or click to select files (photos max 25MB, videos max 100MB)
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supports: JPG, PNG, HEIC, WebP, MP4, MOV
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Uploading {files.filter(f => f.status !== 'complete').length} of {files.length}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles(prev => prev.filter(f => f.status === 'complete'))}
            >
              Clear Completed
            </Button>
          </div>

          {files.map((uploadFile) => (
            <Card key={uploadFile.id} className="p-4">
              <div className="flex items-center space-x-4">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {uploadFile.status === 'complete' ? (
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                  ) : uploadFile.status === 'error' ? (
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-5 h-5 text-blue-600 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadFile.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {uploadFile.status !== 'error' && uploadFile.status !== 'complete' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadFile.error && (
                    <p className="mt-1 text-xs text-red-600">{uploadFile.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(uploadFile.id)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
