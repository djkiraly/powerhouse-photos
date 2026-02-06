"use client";

import { useEffect, useState } from "react";
import { PlayerForm } from "./PlayerForm";
import { PlayerBulkImport } from "./PlayerBulkImport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Upload } from "lucide-react";

type Player = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
  active: boolean;
  teamId: string | null;
  team: {
    id: string;
    name: string;
  } | null;
};

export function PlayerList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm('Delete this player? This will also remove all their photo tags.')) {
      return;
    }

    try {
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPlayers();
      }
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPlayer(null);
    fetchPlayers();
  };

  if (loading) {
    return <div>Loading players...</div>;
  }

  const handleBulkImportClose = () => {
    setShowBulkImport(false);
    fetchPlayers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowBulkImport(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import
        </Button>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>

      {showForm && (
        <PlayerForm
          player={editingPlayer}
          onClose={handleFormClose}
        />
      )}

      {showBulkImport && (
        <PlayerBulkImport onClose={handleBulkImportClose} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => (
          <Card key={player.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                {player.name}
              </CardTitle>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingPlayer(player);
                    setShowForm(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(player.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-gray-600">
                {player.jerseyNumber && (
                  <p>Jersey: #{player.jerseyNumber}</p>
                )}
                {player.position && (
                  <p>Position: {player.position}</p>
                )}
                {player.team && (
                  <p>Team: {player.team.name}</p>
                )}
                <p>Status: {player.active ? 'Active' : 'Inactive'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {players.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No players yet. Add players to start tagging photos!
          </p>
        </div>
      )}
    </div>
  );
}
