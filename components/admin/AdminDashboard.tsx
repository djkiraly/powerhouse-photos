"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Image,
  UserCircle,
  FolderOpen,
  HardDrive,
  Tag,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = {
  totalUsers: number;
  totalPhotos: number;
  totalPlayers: number;
  totalCollections: number;
  totalTags: number;
  totalStorageMB: number;
  totalStorageGB: number;
};

type RecentPhoto = {
  id: string;
  originalName: string;
  uploadedAt: string;
  uploadedById: string;
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data.stats);
      setRecentPhotos(data.recentPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading statistics...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Photos",
      value: stats.totalPhotos,
      icon: Image,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Players",
      value: stats.totalPlayers,
      icon: UserCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Collections",
      value: stats.totalCollections,
      icon: FolderOpen,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Photo Tags",
      value: stats.totalTags,
      icon: Tag,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
    {
      title: "Storage Used",
      value:
        stats.totalStorageGB >= 1
          ? `${stats.totalStorageGB} GB`
          : `${stats.totalStorageMB} MB`,
      icon: HardDrive,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPhotos.length === 0 ? (
            <p className="text-gray-500">No recent uploads</p>
          ) : (
            <div className="space-y-3">
              {recentPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <Image className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {photo.originalName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(photo.uploadedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <a href="/admin/users">
            <CardContent className="p-6 flex items-center space-x-4">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-semibold">Manage Users</p>
                <p className="text-sm text-gray-500">
                  View and update user roles
                </p>
              </div>
            </CardContent>
          </a>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <a href="/admin/photos">
            <CardContent className="p-6 flex items-center space-x-4">
              <Image className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-semibold">Manage Photos</p>
                <p className="text-sm text-gray-500">
                  Moderate and bulk delete
                </p>
              </div>
            </CardContent>
          </a>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <a href="/admin/players">
            <CardContent className="p-6 flex items-center space-x-4">
              <UserCircle className="w-8 h-8 text-purple-600" />
              <div>
                <p className="font-semibold">Manage Players</p>
                <p className="text-sm text-gray-500">Add and edit roster</p>
              </div>
            </CardContent>
          </a>
        </Card>
      </div>
    </div>
  );
}
