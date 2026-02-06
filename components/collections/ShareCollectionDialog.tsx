"use client";

import { useState } from "react";
import { Check, Copy, Link, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ShareCollectionDialogProps = {
  collectionId: string;
  collectionName: string;
  hasShareToken: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

export function ShareCollectionDialog({
  collectionId,
  collectionName,
  hasShareToken,
  onClose,
  onUpdate,
}: ShareCollectionDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLink, setHasLink] = useState(hasShareToken);

  // If there's already a share token, we need to regenerate to get the URL
  // (we don't store the full URL, so user needs to regenerate or we fetch it)
  const [needsRegenerate] = useState(hasShareToken && !shareUrl);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      const days = parseInt(expiresInDays, 10);
      if (days > 0) {
        body.expiresInDays = days;
      }

      const res = await fetch(`/api/collections/${collectionId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.shareUrl);
        setExpiresAt(data.expiresAt);
        setHasLink(true);
        onUpdate();
      }
    } catch (error) {
      console.error("Error generating share link:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Revoke share link? Anyone with the link will lose access.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/share`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShareUrl(null);
        setExpiresAt(null);
        setHasLink(false);
        onUpdate();
      }
    } catch (error) {
      console.error("Error revoking share link:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Link className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Share &quot;{collectionName}&quot;</h2>
          </div>

          {!hasLink && !shareUrl ? (
            // Generate state
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Generate a public link to share this collection. Anyone with the
                link can view the photos without signing in.
              </p>

              <div className="space-y-2">
                <Label htmlFor="expires">Expires in (days, optional)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  placeholder="No expiration"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Link
                </Button>
              </div>
            </div>
          ) : needsRegenerate && !shareUrl ? (
            // Existing token but no URL - offer to regenerate
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This collection has an active share link. Generate a new one to
                see the URL, or revoke access.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Revoke Link
                </Button>
                <Button onClick={handleGenerate} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Regenerate Link
                </Button>
              </div>
            </div>
          ) : (
            // Link exists with URL
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800">
                  Anyone with this link can view all photos in this collection.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Share URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl || ""}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <p className="text-xs text-gray-500">
                  Expires: {new Date(expiresAt).toLocaleDateString()}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Revoke Link
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
