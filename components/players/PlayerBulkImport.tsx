"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type PlayerBulkImportProps = {
  onClose: () => void;
};

type ParsedPlayer = {
  name: string;
  jerseyNumber: string;
  position: string;
  team: string;
};

export function PlayerBulkImport({ onClose }: PlayerBulkImportProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedPlayer[]>([]);

  const parseInput = (text: string): ParsedPlayer[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split('\t');
      return {
        name: parts[0]?.trim() || '',
        jerseyNumber: parts[1]?.trim() || '',
        position: parts[2]?.trim() || '',
        team: parts[3]?.trim() || '',
      };
    });
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setError(null);
    setSuccess(null);
    if (value.trim()) {
      setPreview(parseInput(value));
    } else {
      setPreview([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const players = parseInput(input);

    // Validate
    const invalidPlayers = players.filter(p => !p.name);
    if (invalidPlayers.length > 0) {
      setError('All rows must have a player name in the first column');
      setLoading(false);
      return;
    }

    if (players.length === 0) {
      setError('No players to import');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: players.map(p => ({
            name: p.name,
            jerseyNumber: p.jerseyNumber || null,
            position: p.position || null,
            team: p.team || null,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        setInput("");
        setPreview([]);
        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to import players');
      }
    } catch (err) {
      console.error('Error importing players:', err);
      setError('Failed to import players');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Bulk Import Players</CardTitle>
            <CardDescription>
              Paste tab-delimited data with columns: Name, Jersey Number, Position, Team
              <br />
              <span className="text-xs text-gray-500">
                Tip: Copy directly from Excel or Google Sheets
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 overflow-auto">
            <div className="space-y-2">
              <Label htmlFor="bulkInput">Player Data (tab-separated)</Label>
              <textarea
                id="bulkInput"
                className="w-full h-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder={"John Smith\t23\tForward\tVarsity\nJane Doe\t7\tGoalie\tJV\nBob Wilson\t15\t\t14U Travel"}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Each line is a player. Columns: Name (required), Jersey # (optional), Position (optional), Team (optional)
              </p>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview ({preview.length} players)</Label>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Jersey #</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Position</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Team</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.slice(0, 10).map((player, idx) => (
                        <tr key={idx} className={!player.name ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2">
                            {player.name || <span className="text-red-500 italic">Missing name</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{player.jerseyNumber || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{player.position || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{player.team || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <div className="px-3 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                      ... and {preview.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex space-x-2 border-t bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || preview.length === 0}
              className="flex-1"
            >
              {loading ? 'Importing...' : `Import ${preview.length} Players`}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
