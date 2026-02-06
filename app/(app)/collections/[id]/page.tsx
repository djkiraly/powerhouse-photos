import { CollectionDetailView } from "@/components/collections/CollectionDetailView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CollectionDetailView collectionId={id} />;
}
