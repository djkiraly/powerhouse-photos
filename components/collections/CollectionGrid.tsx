"use client";

import { useEffect, useState } from "react";
import { CollectionCard } from "./CollectionCard";

type Collection = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
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

export function CollectionGrid() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections');
      if (response.ok) {
        const data = await response.json();
        setCollections(data);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No collections yet. Create your first collection to organize your photos!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          onUpdate={fetchCollections}
        />
      ))}
    </div>
  );
}
