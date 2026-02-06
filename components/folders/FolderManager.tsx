"use client";

import { useEffect, useState } from "react";
import { FolderForm } from "./FolderForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Folder, ChevronRight, Image } from "lucide-react";

type Folder = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  _count: {
    photos: number;
    children: number;
  };
};

export function FolderManager() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Root" }
  ]);

  useEffect(() => {
    fetchFolders();
  }, [parentId]);

  const fetchFolders = async () => {
    try {
      const url = parentId
        ? `/api/folders?parentId=${parentId}`
        : '/api/folders';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    const hasContent = folder && (folder._count.photos > 0 || folder._count.children > 0);

    const message = hasContent
      ? `Delete "${folder?.name}"? Photos will be moved to "Unfiled" and subfolders will be deleted.`
      : `Delete "${folder?.name}"?`;

    if (!confirm(message)) {
      return;
    }

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFolders();
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingFolder(null);
    fetchFolders();
  };

  const navigateToFolder = async (folderId: string, folderName: string) => {
    setLoading(true);
    setParentId(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setParentId(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  if (loading) {
    return <div>Loading folders...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id || 'root'} className="flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={`hover:text-blue-600 ${
                index === breadcrumbs.length - 1
                  ? 'font-medium text-gray-900'
                  : 'text-gray-600'
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Folder
        </Button>
      </div>

      {showForm && (
        <FolderForm
          folder={editingFolder}
          parentId={parentId}
          onClose={handleFormClose}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigateToFolder(folder.id, folder.name)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-500" />
                {folder.name}
              </CardTitle>
              <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingFolder(folder);
                    setShowForm(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(folder.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-gray-600">
                {folder.description && (
                  <p className="line-clamp-2">{folder.description}</p>
                )}
                <div className="flex items-center gap-4 pt-1">
                  <span className="flex items-center gap-1">
                    <Image className="w-4 h-4" />
                    {folder._count.photos} photos
                  </span>
                  {folder._count.children > 0 && (
                    <span className="flex items-center gap-1">
                      <Folder className="w-4 h-4" />
                      {folder._count.children} subfolders
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {folders.length === 0 && (
        <div className="text-center py-12">
          <Folder className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            No folders here. Create folders to organize your photos!
          </p>
        </div>
      )}
    </div>
  );
}
