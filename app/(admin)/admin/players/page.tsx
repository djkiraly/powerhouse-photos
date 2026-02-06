// Admin Players Management Page

import { Suspense } from "react";
import { PlayerList } from "@/components/players/PlayerList";

export default function AdminPlayersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Player Management</h1>
        <p className="text-gray-600 mt-1">
          Add, edit, and manage the player roster for photo tagging
        </p>
      </div>

      <Suspense fallback={<PlayersSkeleton />}>
        <PlayerList />
      </Suspense>
    </div>
  );
}

function PlayersSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-32 bg-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}
