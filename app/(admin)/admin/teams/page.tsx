import { Suspense } from "react";
import { TeamList } from "@/components/teams/TeamList";

export default function AdminTeamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Teams</h1>
        <p className="text-gray-600 mt-1">
          Add, edit, and manage teams for photo tagging
        </p>
      </div>

      <Suspense fallback={<div>Loading teams...</div>}>
        <TeamList />
      </Suspense>
    </div>
  );
}
