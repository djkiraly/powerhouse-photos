"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Cloud,
  HardDrive,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  FileType,
  Image,
  Save,
  Edit2,
  X,
  FileJson,
} from "lucide-react";

type StorageConfig = {
  projectId: string;
  bucketName: string;
  clientEmail: string;
  privateKeyConfigured: boolean;
};

type StorageStats = {
  totalBytes: number;
  totalMB: number;
  totalGB: number;
  photoCount: number;
  avgFileSize: number;
  avgFileSizeMB: number;
};

type TypeDistribution = {
  mimeType: string;
  count: number;
  totalBytes: number;
  totalMB: number;
};

type TestResult = {
  success: boolean;
  test: string;
  message: string;
  error?: string;
  elapsedMs: number;
  details?: Record<string, unknown>;
  results?: { step: string; success: boolean; elapsedMs: number; error?: string }[];
};

type EditableConfig = {
  projectId: string;
  bucketName: string;
  clientEmail: string;
  privateKey: string;
};

export function StorageManagement() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [typeDistribution, setTypeDistribution] = useState<TypeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testRunning, setTestRunning] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editForm, setEditForm] = useState<EditableConfig>({
    projectId: "",
    bucketName: "",
    clientEmail: "",
    privateKey: "",
  });
  const [jsonFileName, setJsonFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const startEditing = () => {
    setEditForm({
      projectId: config?.projectId === "Not configured" ? "" : config?.projectId || "",
      bucketName: config?.bucketName === "Not configured" ? "" : config?.bucketName || "",
      clientEmail: config?.clientEmail === "Not configured" ? "" : config?.clientEmail || "",
      privateKey: "", // Never pre-fill private key for security
    });
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
    setJsonFileName(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveError(null);
    setJsonFileName(null);
  };

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);

        // Validate it's a GCP service account JSON
        if (!json.type || json.type !== "service_account") {
          setSaveError("Invalid file: Expected a GCP service account JSON file");
          return;
        }

        // Extract the relevant fields
        const newForm: EditableConfig = {
          projectId: json.project_id || editForm.projectId,
          bucketName: editForm.bucketName, // Bucket name is not in the service account JSON
          clientEmail: json.client_email || editForm.clientEmail,
          privateKey: json.private_key || editForm.privateKey,
        };

        setEditForm(newForm);
        setJsonFileName(file.name);
        setSaveError(null);
      } catch {
        setSaveError("Failed to parse JSON file. Please ensure it's a valid service account JSON.");
      }
    };

    reader.onerror = () => {
      setSaveError("Failed to read the file");
    };

    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/admin/storage/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save configuration");
      }

      setSaveSuccess(true);
      setIsEditing(false);
      // Refresh the config display
      await fetchStorageInfo();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const fetchStorageInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/storage");
      if (!response.ok) {
        throw new Error("Failed to fetch storage info");
      }
      const data = await response.json();
      setConfig(data.config);
      setStats(data.stats);
      setTypeDistribution(data.typeDistribution);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (action: string, label: string) => {
    setTestRunning(action);
    try {
      const response = await fetch("/api/admin/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      setTestResults((prev) => [
        { ...result, test: label },
        ...prev.slice(0, 9), // Keep last 10 results
      ]);
    } catch (err) {
      setTestResults((prev) => [
        {
          success: false,
          test: label,
          message: "Test failed",
          error: err instanceof Error ? err.message : "Unknown error",
          elapsedMs: 0,
        },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setTestRunning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-lg">
        Error: {error}
        <Button
          variant="outline"
          size="sm"
          className="ml-4"
          onClick={fetchStorageInfo}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Cloud className="w-5 h-5" />
                <span>GCS Configuration</span>
              </CardTitle>
              <CardDescription>
                Google Cloud Storage settings
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveConfig}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Configuration saved successfully. Restart the server for changes to take effect.
            </div>
          )}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <XCircle className="w-4 h-4 mr-2" />
              {saveError}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              {/* JSON Upload Section */}
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileJson className="w-8 h-8 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Upload Service Account JSON
                    </p>
                    <p className="text-xs text-gray-500">
                      Upload your GCP service account JSON file to auto-fill credentials
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleJsonUpload}
                    className="hidden"
                    id="json-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select JSON File
                  </Button>
                  {jsonFileName && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Loaded: {jsonFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or enter manually</span>
                </div>
              </div>

              {/* Manual Entry Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input
                    id="projectId"
                    value={editForm.projectId}
                    onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })}
                    placeholder="your-gcp-project-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bucketName">Bucket Name</Label>
                  <Input
                    id="bucketName"
                    value={editForm.bucketName}
                    onChange={(e) => setEditForm({ ...editForm, bucketName: e.target.value })}
                    placeholder="your-bucket-name"
                  />
                  <p className="text-xs text-gray-500">
                    Not included in service account JSON - enter manually
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Service Account Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={editForm.clientEmail}
                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                    placeholder="service-account@project.iam.gserviceaccount.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="privateKey">Private Key</Label>
                  <Input
                    id="privateKey"
                    type="password"
                    value={editForm.privateKey ? "••••••••••••••••" : ""}
                    onChange={(e) => {
                      if (e.target.value !== "••••••••••••••••") {
                        setEditForm({ ...editForm, privateKey: e.target.value });
                      }
                    }}
                    placeholder={config?.privateKeyConfigured ? "Leave blank to keep existing" : "Paste private key here"}
                    readOnly={!!editForm.privateKey && editForm.privateKey.startsWith("-----BEGIN")}
                  />
                  <p className="text-xs text-gray-500">
                    {editForm.privateKey && editForm.privateKey.startsWith("-----BEGIN")
                      ? "Private key loaded from JSON file"
                      : config?.privateKeyConfigured
                      ? "Leave blank to keep the existing key"
                      : "Upload JSON or paste the private key"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Project ID</p>
                <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                  {config?.projectId}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Bucket Name</p>
                <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                  {config?.bucketName}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Service Account</p>
                <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                  {config?.clientEmail}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Private Key</p>
                <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded flex items-center">
                  {config?.privateKeyConfigured ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Configured
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500 mr-2" />
                      Not configured
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Storage</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.totalGB && stats.totalGB >= 1
                    ? `${stats.totalGB} GB`
                    : `${stats?.totalMB || 0} MB`}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <HardDrive className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Photos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.photoCount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Image className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg File Size</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.avgFileSizeMB || 0} MB
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <FileType className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">File Types</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {typeDistribution.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <FileType className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Type Distribution */}
      {typeDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeDistribution.map((type) => {
                const percentage = stats?.totalBytes
                  ? Math.round((type.totalBytes / stats.totalBytes) * 100)
                  : 0;
                return (
                  <div key={type.mimeType} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{type.mimeType}</span>
                      <span className="text-gray-500">
                        {type.count} files ({type.totalMB} MB)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connectivity Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connectivity Tests</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestResults([])}
              disabled={testResults.length === 0}
            >
              Clear Results
            </Button>
          </CardTitle>
          <CardDescription>
            Test GCS connectivity and operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => runTest("test-connection", "Connection Test")}
              disabled={testRunning !== null}
            >
              {testRunning === "test-connection" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>

            <Button
              variant="outline"
              onClick={() => runTest("test-upload", "Upload Test")}
              disabled={testRunning !== null}
            >
              {testRunning === "test-upload" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Test Upload
            </Button>

            <Button
              variant="outline"
              onClick={() => runTest("test-full", "Full Cycle Test")}
              disabled={testRunning !== null}
            >
              {testRunning === "test-full" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1" />
                  <Download className="w-4 h-4 mr-1" />
                  <Trash2 className="w-4 h-4 mr-2" />
                </>
              )}
              Full Cycle Test
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3 mt-4">
              <h4 className="font-medium text-sm text-gray-700">Test Results</h4>
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {result.elapsedMs}ms
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm ${
                      result.success ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.error && (
                    <p className="mt-1 text-sm text-red-600 font-mono">
                      Error: {result.error}
                    </p>
                  )}
                  {result.details && (
                    <div className="mt-2 text-xs text-gray-600 font-mono bg-white/50 p-2 rounded">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  )}
                  {result.results && (
                    <div className="mt-2 space-y-1">
                      {result.results.map((step, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="flex items-center space-x-1">
                            {step.success ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span>{step.step}</span>
                          </span>
                          <span className="text-gray-500">{step.elapsedMs}ms</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Variables Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Required environment variables for GCS configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 px-2 py-1 rounded">GCS_PROJECT_ID</code>
              <span className="text-gray-500">- Google Cloud project ID</span>
            </div>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 px-2 py-1 rounded">GCS_BUCKET_NAME</code>
              <span className="text-gray-500">- Storage bucket name</span>
            </div>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 px-2 py-1 rounded">GCS_CLIENT_EMAIL</code>
              <span className="text-gray-500">- Service account email</span>
            </div>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 px-2 py-1 rounded">GCS_PRIVATE_KEY</code>
              <span className="text-gray-500">- Service account private key</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
