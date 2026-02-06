"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Trash2,
  Tag,
  LogIn,
  X,
  Image,
  FolderPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type AuditLog = {
  id: string;
  action: string;
  userId: string;
  userName: string | null;
  userRole: string | null;
  resourceType: string;
  resourceId: string | null;
  resourceIds: string[];
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const ACTION_LABELS: Record<string, { label: string; icon: typeof Upload; color: string }> = {
  PHOTO_UPLOAD: { label: "Photo Upload", icon: Upload, color: "text-green-600 bg-green-100" },
  PHOTO_DELETE: { label: "Photo Delete", icon: Trash2, color: "text-red-600 bg-red-100" },
  PHOTO_BULK_DELETE: { label: "Bulk Delete", icon: Trash2, color: "text-red-600 bg-red-100" },
  PLAYER_TAG_CREATE: { label: "Player Tag", icon: Tag, color: "text-blue-600 bg-blue-100" },
  PLAYER_TAG_BULK_CREATE: { label: "Bulk Player Tag", icon: Tag, color: "text-blue-600 bg-blue-100" },
  PLAYER_TAG_DELETE: { label: "Remove Player Tag", icon: X, color: "text-orange-600 bg-orange-100" },
  TEAM_TAG_CREATE: { label: "Team Tag", icon: Users, color: "text-purple-600 bg-purple-100" },
  TEAM_TAG_BULK_CREATE: { label: "Bulk Team Tag", icon: Users, color: "text-purple-600 bg-purple-100" },
  TEAM_TAG_DELETE: { label: "Remove Team Tag", icon: X, color: "text-orange-600 bg-orange-100" },
  COLLECTION_PHOTO_ADD: { label: "Add to Collection", icon: FolderPlus, color: "text-teal-600 bg-teal-100" },
  COLLECTION_PHOTO_REMOVE: { label: "Remove from Collection", icon: X, color: "text-orange-600 bg-orange-100" },
  USER_LOGIN: { label: "Login", icon: LogIn, color: "text-green-600 bg-green-100" },
  USER_LOGIN_FAILED: { label: "Failed Login", icon: LogIn, color: "text-red-600 bg-red-100" },
};

const RESOURCE_TYPE_LABELS: Record<string, { label: string; icon: typeof Image }> = {
  Photo: { label: "Photo", icon: Image },
  PhotoTag: { label: "Player Tag", icon: Tag },
  PhotoTeamTag: { label: "Team Tag", icon: Users },
  Collection: { label: "Collection", icon: FolderPlus },
  CollectionPhoto: { label: "Collection Photo", icon: FolderPlus },
  User: { label: "User", icon: LogIn },
};

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "PHOTO_UPLOAD", label: "Photo Upload" },
  { value: "PHOTO_DELETE", label: "Photo Delete" },
  { value: "PHOTO_BULK_DELETE", label: "Bulk Delete" },
  { value: "PLAYER_TAG_CREATE", label: "Player Tag" },
  { value: "PLAYER_TAG_BULK_CREATE", label: "Bulk Player Tag" },
  { value: "PLAYER_TAG_DELETE", label: "Remove Player Tag" },
  { value: "TEAM_TAG_CREATE", label: "Team Tag" },
  { value: "TEAM_TAG_BULK_CREATE", label: "Bulk Team Tag" },
  { value: "TEAM_TAG_DELETE", label: "Remove Team Tag" },
  { value: "COLLECTION_PHOTO_ADD", label: "Add to Collection" },
  { value: "COLLECTION_PHOTO_REMOVE", label: "Remove from Collection" },
  { value: "USER_LOGIN", label: "Login" },
  { value: "USER_LOGIN_FAILED", label: "Failed Login" },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: "", label: "All Resources" },
  { value: "Photo", label: "Photo" },
  { value: "PhotoTag", label: "Player Tag" },
  { value: "PhotoTeamTag", label: "Team Tag" },
  { value: "Collection", label: "Collection" },
  { value: "CollectionPhoto", label: "Collection Photo" },
  { value: "User", label: "User" },
];

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");
      if (actionFilter) params.set("action", actionFilter);
      if (resourceTypeFilter) params.set("resourceType", resourceTypeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, resourceTypeFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearFilters = () => {
    setActionFilter("");
    setResourceTypeFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasFilters = actionFilter || resourceTypeFilter || startDate || endDate;

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-lg">Error: {error}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={resourceTypeFilter}
                onChange={(e) => {
                  setResourceTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {RESOURCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {pagination && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {logs.length} of {pagination.total} entries
          </span>
        </div>
      )}

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actionInfo = ACTION_LABELS[log.action] || {
                      label: log.action,
                      icon: Image,
                      color: "text-gray-600 bg-gray-100",
                    };
                    const ActionIcon = actionInfo.icon;
                    const resourceInfo = RESOURCE_TYPE_LABELS[log.resourceType] || {
                      label: log.resourceType,
                      icon: Image,
                    };

                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(log.createdAt), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(log.createdAt), "h:mm:ss a")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actionInfo.color}`}
                          >
                            <ActionIcon className="w-3.5 h-3.5" />
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {log.userName || (log.details as Record<string, unknown>)?.email as string || "Unknown"}
                          </div>
                          {log.userName && log.userRole && (
                            <div className="text-xs text-gray-500">
                              {log.userRole === "admin" ? (
                                <span className="text-blue-600">Admin</span>
                              ) : (
                                <span>Player</span>
                              )}
                            </div>
                          )}
                          {!log.userName && (log.action === "USER_LOGIN_FAILED") && (
                            <div className="text-xs text-red-500">Unknown account</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {resourceInfo.label}
                          </div>
                          {log.resourceId && (
                            <div className="text-xs text-gray-500 font-mono">
                              {log.resourceId.substring(0, 8)}...
                            </div>
                          )}
                          {log.resourceIds.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {log.resourceIds.length} items
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.details && (
                            <div className="text-xs text-gray-600 max-w-xs truncate">
                              {formatDetails(log.details)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-500 font-mono">
                            {log.ipAddress || "-"}
                          </div>
                          {log.userAgent && (
                            <div className="text-xs text-gray-400 max-w-[200px] truncate" title={log.userAgent}>
                              {formatUserAgent(log.userAgent)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDetails(details: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "string") {
      parts.push(`${key}: ${value}`);
    } else if (typeof value === "number") {
      parts.push(`${key}: ${value}`);
    }
  }
  return parts.join(", ") || JSON.stringify(details);
}

function formatUserAgent(ua: string): string {
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Mobile")) return "Mobile Browser";
  return ua.substring(0, 30);
}
