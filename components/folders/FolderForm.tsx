"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Folder = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
};

type FolderFormProps = {
  folder: Folder | null;
  parentId: string | null;
  onClose: () => void;
};

export function FolderForm({ folder, parentId, onClose }: FolderFormProps) {
  const [name, setName] = useState(folder?.name || "");
  const [description, setDescription] = useState(folder?.description || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = folder
        ? `/api/folders/${folder.id}`
        : '/api/folders';

      const method = folder ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          ...(folder ? {} : { parentId }),
        }),
      });

      if (response.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving folder:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>
              {folder ? 'Edit Folder' : 'Create Folder'}
            </CardTitle>
            <CardDescription>
              {folder ? 'Update folder information' : 'Create a new folder to organize photos'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Folder Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Raw Photos, Social Media, Game Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Unedited photos from photographers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : folder ? 'Update' : 'Create Folder'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
