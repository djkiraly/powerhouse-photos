// Admin Settings Page

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Shield,
  Server,
  Database,
  ExternalLink,
} from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600 mt-1">
          System configuration and monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>System Health</span>
            </CardTitle>
            <CardDescription>
              Monitor application health and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Health Endpoint</span>
              <Link
                href="/api/health"
                target="_blank"
                className="text-blue-600 hover:underline text-sm flex items-center"
              >
                /api/health
                <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500">
              Use this endpoint for uptime monitoring services.
            </p>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Database</span>
            </CardTitle>
            <CardDescription>
              Database management tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Use Prisma Studio to browse and edit database records.
            </p>
            <code className="block bg-gray-100 p-2 rounded text-xs">
              npm run db:studio
            </code>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Security</span>
            </CardTitle>
            <CardDescription>
              Security settings and audit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Authentication</span>
                <span className="text-green-600 font-medium">JWT Sessions</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Password Hashing</span>
                <span className="text-green-600 font-medium">bcrypt (10 rounds)</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Rate Limiting</span>
                <span className="text-green-600 font-medium">Nginx (10 req/s)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start">
                Manage User Roles
              </Button>
            </Link>
            <Link href="/admin/photos">
              <Button variant="outline" className="w-full justify-start">
                Moderate Photos
              </Button>
            </Link>
            <Link href="/admin/players">
              <Button variant="outline" className="w-full justify-start">
                Manage Players
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Information</CardTitle>
          <CardDescription>
            Server and deployment configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Environment</p>
              <p className="font-medium">{process.env.NODE_ENV || "development"}</p>
            </div>
            <div>
              <p className="text-gray-500">Next.js Version</p>
              <p className="font-medium">16.x</p>
            </div>
            <div>
              <p className="text-gray-500">Process Manager</p>
              <p className="font-medium">PM2 (Production)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
