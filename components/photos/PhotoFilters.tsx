"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, Folder, ChevronRight, Home } from "lucide-react";

type Player = {
  id: string;
  name: string;
  jerseyNumber: number | null;
};

type Team = {
  id: string;
  name: string;
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

type PhotoFiltersProps = {
  selectedFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  selectedPlayers?: string[];
  onPlayersChange?: (playerIds: string[]) => void;
  selectedTeams?: string[];
  onTeamsChange?: (teamIds: string[]) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
};

export function PhotoFilters({
  selectedFolderId,
  onFolderChange,
  selectedPlayers = [],
  onPlayersChange,
  selectedTeams = [],
  onTeamsChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
}: PhotoFiltersProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'All Photos' }
  ]);

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [currentParentId]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players?active=true');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams?active=true');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

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
    }
  };

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      // Going to root
      setCurrentParentId(null);
      setFolderPath([{ id: null, name: 'All Photos' }]);
      onFolderChange?.(null);
    } else {
      setCurrentParentId(folderId);
      setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
      onFolderChange?.(folderId);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = folderPath[index];
    setCurrentParentId(crumb.id);
    setFolderPath(folderPath.slice(0, index + 1));
    onFolderChange?.(crumb.id);
  };

  const togglePlayer = (playerId: string) => {
    const newPlayers = selectedPlayers.includes(playerId)
      ? selectedPlayers.filter(id => id !== playerId)
      : [...selectedPlayers, playerId];
    onPlayersChange?.(newPlayers);
  };

  const toggleTeam = (teamId: string) => {
    const newTeams = selectedTeams.includes(teamId)
      ? selectedTeams.filter(id => id !== teamId)
      : [...selectedTeams, teamId];
    onTeamsChange?.(newTeams);
  };

  const clearFilters = () => {
    onPlayersChange?.([]);
    onTeamsChange?.([]);
    onStartDateChange?.('');
    onEndDateChange?.('');
  };

  const activeFilterCount =
    selectedPlayers.length + selectedTeams.length + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Filters</CardTitle>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Folder Navigation */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Folders</Label>

          {/* Folder breadcrumbs */}
          <div className="flex items-center gap-1 text-xs flex-wrap">
            {folderPath.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center">
                {index > 0 && <ChevronRight className="w-3 h-3 mx-0.5 text-gray-400" />}
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`hover:text-blue-600 ${
                    index === folderPath.length - 1
                      ? 'font-medium text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {index === 0 ? <Home className="w-3 h-3" /> : crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Folder list */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateToFolder(folder.id, folder.name)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-gray-100 ${
                  selectedFolderId === folder.id ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="truncate">{folder.name}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {folder._count.photos}
                </span>
              </button>
            ))}
            {folders.length === 0 && currentParentId && (
              <p className="text-xs text-gray-500 px-2 py-1">No subfolders</p>
            )}
          </div>
        </div>

        {/* Player Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Players</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {players.map((player) => (
              <label
                key={player.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={() => togglePlayer(player.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">
                  {player.name}
                  {player.jerseyNumber && (
                    <span className="text-gray-500 ml-1">
                      #{player.jerseyNumber}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Team Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Teams</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {teams.map((team) => (
              <label
                key={team.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(team.id)}
                  onChange={() => toggleTeam(team.id)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">{team.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Date Range</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="startDate" className="text-xs text-gray-600">
                From
              </Label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => onStartDateChange?.(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs text-gray-600">
                To
              </Label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => onEndDateChange?.(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Active Filters ({activeFilterCount})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map((playerId) => {
                const player = players.find(p => p.id === playerId);
                return player ? (
                  <span
                    key={playerId}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    {player.name}
                    <button
                      onClick={() => togglePlayer(playerId)}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
              {selectedTeams.map((teamId) => {
                const team = teams.find(t => t.id === teamId);
                return team ? (
                  <span
                    key={teamId}
                    className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                  >
                    {team.name}
                    <button
                      onClick={() => toggleTeam(teamId)}
                      className="ml-1 hover:text-green-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
              {startDate && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  From: {startDate}
                  <button
                    onClick={() => onStartDateChange?.('')}
                    className="ml-1 hover:text-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  To: {endDate}
                  <button
                    onClick={() => onEndDateChange?.('')}
                    className="ml-1 hover:text-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
