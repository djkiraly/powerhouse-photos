import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { Footer } from '@/components/Footer';

type PageProps = {
  params: Promise<{ userSlug: string; collectionSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

type SharedPhoto = {
  id: string;
  originalName: string;
  mimeType?: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  tags: Array<{ id: string; name: string; jerseyNumber: number | null }>;
};

type SharedCollection = {
  name: string;
  description: string | null;
  ownerName: string;
  photoCount: number;
  photos: SharedPhoto[];
};

async function fetchSharedCollection(token: string): Promise<SharedCollection | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/share/${token}`, {
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { token } = await searchParams;
  if (!token) return { title: 'Shared Collection' };

  const collection = await fetchSharedCollection(token);
  if (!collection) return { title: 'Collection Not Found' };

  return {
    title: `${collection.name} — Shared by ${collection.ownerName}`,
    description: collection.description || `A shared photo collection with ${collection.photoCount} photos`,
  };
}

export default async function SharedCollectionPage({ params, searchParams }: PageProps) {
  const { token } = await searchParams;
  await params; // resolve params

  if (!token) {
    redirect('/login');
  }

  const collection = await fetchSharedCollection(token);
  if (!collection) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span>Shared by {collection.ownerName}</span>
            <span>&middot;</span>
            <span>{collection.photoCount} photos</span>
          </div>
          {collection.description && (
            <p className="mt-2 text-gray-600">{collection.description}</p>
          )}
        </div>
      </header>

      {/* Photo Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {collection.photos.length === 0 ? (
          <p className="text-center text-gray-500 py-12">This collection has no photos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {collection.photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="aspect-square relative">
                  <Image
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.originalName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  {photo.mimeType?.startsWith('video/') && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
                {photo.tags.length > 0 && (
                  <div className="p-2 flex flex-wrap gap-1">
                    {photo.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag.name}
                        {tag.jerseyNumber != null && ` #${tag.jerseyNumber}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
