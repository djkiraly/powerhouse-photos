"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Download, Trash2, X, User, Calendar, FileImage, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GCS_BUCKET_URL = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'pph_photos'}`;

type Player = {
  id: string;
  name: string;
  jerseyNumber: number | null;
};

type Team = {
  id: string;
  name: string;
  description: string | null;
};

type PhotoTag = {
  id: string;
  player: {
    id: string;
    name: string;
  };
};

type PhotoTeamTag = {
  id: string;
  team: {
    id: string;
    name: string;
  };
};

type Photo = {
  id: string;
  gcsPath: string;
  thumbnailPath: string | null;
  originalName: string;
  mimeType?: string;
  uploadedAt: string;
  uploader: {
    name: string;
  } | null;
  tags: PhotoTag[];
  teamTags: PhotoTeamTag[];
};

type PhotoPreviewProps = {
  photo: Photo;
  onClose: () => void;
  onDelete: () => void;
  onTagsChange?: (photo: Photo) => void;
  isAdmin?: boolean;
};

export function PhotoPreview({ photo, onClose, onDelete, onTagsChange, isAdmin = false }: PhotoPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [addingTag, setAddingTag] = useState(false);
  const [addingTeamTag, setAddingTeamTag] = useState(false);
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);
  const [removingTeamTagId, setRemovingTeamTagId] = useState<string | null>(null);
  const [currentTags, setCurrentTags] = useState<PhotoTag[]>(photo.tags);
  const [currentTeamTags, setCurrentTeamTags] = useState<PhotoTeamTag[]>(photo.teamTags || []);

  const fullImageUrl = `${GCS_BUCKET_URL}/${photo.gcsPath}`;

  // Sync tags when photo changes
  useEffect(() => {
    setCurrentTags(photo.tags);
    setCurrentTeamTags(photo.teamTags || []);
  }, [photo.tags, photo.teamTags]);

  // Fetch players on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players?active=true');
        if (response.ok) {
          const data = await response.json();
          setPlayers(data);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, []);

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/teams?active=true');
        if (response.ok) {
          const data = await response.json();
          setTeams(data);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoadingTeams(false);
      }
    };
    fetchTeams();
  }, []);

  // Get players that aren't already tagged
  const availablePlayers = players.filter(
    player => !currentTags.some(tag => tag.player.id === player.id)
  );

  // Get teams that aren't already tagged
  const availableTeams = teams.filter(
    team => !currentTeamTags.some(tag => tag.team.id === team.id)
  );

  const handleAddTag = async (playerId: string) => {
    setAddingTag(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id, playerId }),
      });

      if (response.ok) {
        const newTag = await response.json();
        const updatedTags = [...currentTags, newTag];
        setCurrentTags(updatedTags);
        onTagsChange?.({ ...photo, tags: updatedTags });
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setRemovingTagId(tagId);
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedTags = currentTags.filter(tag => tag.id !== tagId);
        setCurrentTags(updatedTags);
        onTagsChange?.({ ...photo, tags: updatedTags });
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    } finally {
      setRemovingTagId(null);
    }
  };

  const handleAddTeamTag = async (teamId: string) => {
    setAddingTeamTag(true);
    try {
      const response = await fetch('/api/team-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id, teamId }),
      });

      if (response.ok) {
        const newTag = await response.json();
        const updatedTeamTags = [...currentTeamTags, newTag];
        setCurrentTeamTags(updatedTeamTags);
        onTagsChange?.({ ...photo, teamTags: updatedTeamTags });
      }
    } catch (error) {
      console.error('Error adding team tag:', error);
    } finally {
      setAddingTeamTag(false);
    }
  };

  const handleRemoveTeamTag = async (tagId: string) => {
    setRemovingTeamTagId(tagId);
    try {
      const response = await fetch(`/api/team-tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedTeamTags = currentTeamTags.filter(tag => tag.id !== tagId);
        setCurrentTeamTags(updatedTeamTags);
        onTagsChange?.({ ...photo, teamTags: updatedTeamTags });
      }
    } catch (error) {
      console.error('Error removing team tag:', error);
    } finally {
      setRemovingTeamTagId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(fullImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 truncate pr-2">
          {photo.originalName}
        </h3>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Image / Video */}
      <div className="flex-1 relative bg-gray-100 min-h-[300px]">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500">Failed to load media</span>
          </div>
        ) : photo.mimeType?.startsWith('video/') ? (
          <video
            src={fullImageUrl}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          />
        ) : (
          <Image
            src={fullImageUrl}
            alt={photo.originalName}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 400px"
            onError={() => setImageError(true)}
            priority
          />
        )}
      </div>

      {/* Metadata */}
      <div className="p-4 space-y-4 border-t border-gray-200">
        {/* Player tags */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tagged Players</h4>

          {/* Current tags with remove buttons */}
          {currentTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {currentTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium group"
                >
                  <User className="w-3 h-3 mr-1" />
                  {tag.player.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    disabled={removingTagId === tag.id}
                    className="ml-1.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    title="Remove tag"
                  >
                    {removingTagId === tag.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add player dropdown */}
          {loadingPlayers ? (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading players...
            </div>
          ) : availablePlayers.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select
                key={`player-${photo.id}`}
                onValueChange={handleAddTag}
                disabled={addingTag}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add a player..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                      {player.jerseyNumber !== null && (
                        <span className="text-gray-500 ml-1">#{player.jerseyNumber}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addingTag && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
            </div>
          ) : currentTags.length === 0 ? (
            <p className="text-sm text-gray-500">No players configured</p>
          ) : (
            <p className="text-sm text-gray-500">All players tagged</p>
          )}
        </div>

        {/* Team tags */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tagged Teams</h4>

          {/* Current team tags with remove buttons */}
          {currentTeamTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {currentTeamTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium group"
                >
                  <Users className="w-3 h-3 mr-1" />
                  {tag.team.name}
                  <button
                    onClick={() => handleRemoveTeamTag(tag.id)}
                    disabled={removingTeamTagId === tag.id}
                    className="ml-1.5 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                    title="Remove tag"
                  >
                    {removingTeamTagId === tag.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add team dropdown */}
          {loadingTeams ? (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading teams...
            </div>
          ) : availableTeams.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select
                key={`team-${photo.id}`}
                onValueChange={handleAddTeamTag}
                disabled={addingTeamTag}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add a team..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addingTeamTag && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
            </div>
          ) : currentTeamTags.length === 0 ? (
            <p className="text-sm text-gray-500">No teams configured</p>
          ) : (
            <p className="text-sm text-gray-500">All teams tagged</p>
          )}
        </div>

        {/* Photo info */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <FileImage className="w-4 h-4 mr-2 text-gray-400" />
            <span className="truncate">{photo.originalName}</span>
          </div>
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-400" />
            <span>Uploaded by {photo.uploader?.name || 'Unknown'}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span>
              {formatDistanceToNow(new Date(photo.uploadedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button className="flex-1" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          {isAdmin && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
