"use client";

import { useEffect, useState } from "react";
import { Check, FolderPlus, Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Collection = {
  id: string;
  name: string;
  _count: { photos: number };
};

type AddToCollectionDialogProps = {
  photoIds: string[];
  onClose: () => void;
  onDone: () => void;
};

export function AddToCollectionDialog({
  photoIds,
  onClose,
  onDone,
}: AddToCollectionDialogProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    setAdding(collectionId);
    setError(null);

    let successCount = 0;
    let skipCount = 0;

    try {
      for (const photoId of photoIds) {
        const res = await fetch(`/api/collections/${collectionId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
        });

        if (res.ok) {
          successCount++;
        } else if (res.status === 409) {
          skipCount++;
        } else {
          const data = await res.json();
          throw new Error(data.error || "Failed to add photo");
        }
      }

      setAdded((prev) => new Set(prev).add(collectionId));

      if (skipCount > 0 && successCount === 0) {
        setError(`All ${skipCount} photo(s) already in collection.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add photos");
    } finally {
      setAdding(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        const collection = await res.json();
        setNewName("");
        setShowCreate(false);
        await fetchCollections();
        await handleAddToCollection(collection.id);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create collection");
      }
    } catch (err) {
      setError("Failed to create collection");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-sm mx-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">
              Add {photoIds.length} photo{photoIds.length !== 1 ? "s" : ""} to collection
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {collections.length === 0 && !showCreate && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No collections yet. Create one below.
                </p>
              )}
              {collections.map((collection) => {
                const isAdded = added.has(collection.id);
                const isAdding = adding === collection.id;

                return (
                  <button
                    key={collection.id}
                    onClick={() => handleAddToCollection(collection.id)}
                    disabled={isAdding || isAdded}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 disabled:opacity-60 text-left transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{collection.name}</p>
                      <p className="text-xs text-gray-500">
                        {collection._count.photos} photo{collection._count.photos !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : isAdded ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}

          {showCreate ? (
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Collection name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => { onDone(); onClose(); }}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
