"use client";

import { useState } from "react";
import { PhotoGrid } from "./PhotoGrid";
import { PhotoFilters } from "./PhotoFilters";

type GalleryContentProps = {
  isAdmin: boolean;
};

export function GalleryContent({ isAdmin }: GalleryContentProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <aside className="lg:col-span-1">
        <PhotoFilters
          selectedFolderId={selectedFolderId}
          onFolderChange={setSelectedFolderId}
          selectedPlayers={selectedPlayers}
          onPlayersChange={setSelectedPlayers}
          selectedTeams={selectedTeams}
          onTeamsChange={setSelectedTeams}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />
      </aside>

      {/* Photo Grid */}
      <div className="lg:col-span-3">
        <PhotoGrid
          isAdmin={isAdmin}
          folderId={selectedFolderId}
          playerIds={selectedPlayers}
          teamIds={selectedTeams}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
}
