// Photo Upload Page

import { PhotoUploader } from "@/components/photos/PhotoUploader";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
        <p className="text-gray-600 mt-1">
          Upload photos and tag players to share with the team
        </p>
      </div>

      <PhotoUploader />
    </div>
  );
}
