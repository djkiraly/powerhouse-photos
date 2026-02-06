import {
  Upload,
  FolderOpen,
  Tags,
  Search,
  Download,
  Share2,
  Monitor,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  Users,
  MousePointerClick,
} from "lucide-react";

export const metadata = {
  title: "How to Use — Powerhouse Photos",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-700">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 mt-0.5">
        {number}
      </span>
      <p className="text-gray-700 leading-relaxed">{children}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export default function HowToUsePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-3xl font-bold text-gray-900">How to Use Powerhouse Photos</h1>
        <p className="text-gray-500 text-lg">
          Everything you need to know to upload, organize, and share your photos and videos.
        </p>
      </div>

      {/* Uploading */}
      <Section icon={Upload} title="Uploading Photos & Videos">
        <div className="space-y-3">
          <Step number={1}>
            Click <strong>Upload</strong> in the top navigation bar.
          </Step>
          <Step number={2}>
            <strong>Select a destination folder</strong> — browse the folder list and click
            &ldquo;Select&rdquo; on the folder where you want your files to go.
          </Step>
          <Step number={3}>
            <strong>Drag and drop</strong> files into the upload area, or click to browse your
            device. You can upload multiple files at once.
          </Step>
          <Step number={4}>
            Wait for the progress indicators to show each file as complete. Files are uploaded
            directly to cloud storage for speed.
          </Step>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <ImageIcon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">Photos</p>
              <p className="text-gray-500">JPG, PNG, HEIC, WebP — max 25 MB each</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <Video className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">Videos</p>
              <p className="text-gray-500">MP4, MOV — max 100 MB each</p>
            </div>
          </div>
        </div>

        <Tip>
          Uploads run three at a time. You can keep adding files while others are still uploading.
        </Tip>
      </Section>

      {/* Tagging */}
      <Section icon={Tags} title="Tagging Players & Teams">
        <div className="space-y-3">
          <Step number={1}>
            In the <strong>Gallery</strong>, click on any photo or video to open the preview panel on the right.
          </Step>
          <Step number={2}>
            Under <strong>Tagged Players</strong>, use the dropdown to select a player. The tag is
            saved immediately.
          </Step>
          <Step number={3}>
            Under <strong>Tagged Teams</strong>, use the dropdown to select a team.
          </Step>
          <Step number={4}>
            To remove a tag, click the <strong>X</strong> next to the player or team name.
          </Step>
        </div>
        <Tip>
          Tags make it easy to filter the gallery later — find every photo of a specific player or
          team in seconds.
        </Tip>
      </Section>

      {/* Browsing & Filtering */}
      <Section icon={Search} title="Browsing & Filtering the Gallery">
        <p className="text-gray-700 mb-4">
          The <strong>Gallery</strong> page shows all photos and videos, newest first. Use the
          filter panel on the left to narrow down what you see:
        </p>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <FolderOpen className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
            <span><strong>Folders</strong> — browse the folder hierarchy to view files from a specific folder.</span>
          </li>
          <li className="flex items-start gap-2">
            <Users className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
            <span><strong>Players & Teams</strong> — check one or more names to show only tagged media.</span>
          </li>
          <li className="flex items-start gap-2">
            <Search className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
            <span><strong>Date Range</strong> — set a start and/or end date to filter by upload date.</span>
          </li>
        </ul>
        <Tip>
          Active filters appear as badges below the filter panel. Click the X on any badge to
          remove that filter.
        </Tip>
      </Section>

      {/* Viewing */}
      <Section icon={Monitor} title="Viewing Photos & Videos">
        <div className="space-y-3">
          <Step number={1}>
            Click any thumbnail in the gallery to open the <strong>preview panel</strong> on the
            right side of the screen.
          </Step>
          <Step number={2}>
            For photos, click the image in the preview panel to open a <strong>full-screen
            lightbox</strong>. Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Esc</kbd> or
            click the X to close it.
          </Step>
          <Step number={3}>
            For videos (marked with a play icon), use the built-in video player controls to play,
            pause, and scrub through the video.
          </Step>
        </div>
      </Section>

      {/* Downloading */}
      <Section icon={Download} title="Downloading">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Single file</h3>
            <p className="text-gray-700">
              Open the preview panel for any photo or video and click the <strong>Download</strong> button
              at the bottom. The original full-resolution file will be saved to your device.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Multiple files at once</h3>
            <div className="space-y-3">
              <Step number={1}>
                Click the <strong>checkbox</strong> in the top-left corner of each thumbnail you want to download
                (checkboxes appear on hover).
              </Step>
              <Step number={2}>
                A toolbar appears at the bottom of the screen showing how many files are selected.
              </Step>
              <Step number={3}>
                Click <strong>Download</strong> to save all selected files as a ZIP archive.
              </Step>
            </div>
          </div>
        </div>
      </Section>

      {/* Collections & Sharing */}
      <Section icon={Share2} title="Collections & Sharing">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Creating a collection</h3>
            <p className="text-gray-700">
              Go to <strong>Collections</strong> in the navigation bar and click <strong>New
              Collection</strong>. Give it a name and optional description.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Adding photos to a collection</h3>
            <div className="space-y-3">
              <Step number={1}>
                In the Gallery, select photos using the checkboxes.
              </Step>
              <Step number={2}>
                Click <strong>Add to Collection</strong> in the bottom toolbar.
              </Step>
              <Step number={3}>
                Choose an existing collection from the list and confirm.
              </Step>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Sharing a collection</h3>
            <p className="text-gray-700">
              Open a collection and use the share option to generate a link. Anyone with the link
              can view the photos — no login required.
            </p>
          </div>
        </div>
        <Tip>
          Shared links can be set to expire. Once expired, the link will stop working automatically.
        </Tip>
      </Section>

      {/* Quick Reference */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MousePointerClick className="w-5 h-5 text-blue-600" />
          Quick Reference
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-blue-100">
            <span className="text-gray-600">Open preview</span>
            <span className="font-medium text-gray-900">Click thumbnail</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-blue-100">
            <span className="text-gray-600">Full-screen lightbox</span>
            <span className="font-medium text-gray-900">Click image in preview</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-blue-100">
            <span className="text-gray-600">Close lightbox</span>
            <span className="font-medium text-gray-900">Esc or click X</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-blue-100">
            <span className="text-gray-600">Select multiple</span>
            <span className="font-medium text-gray-900">Click checkboxes</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-blue-100">
            <span className="text-gray-600">Bulk download</span>
            <span className="font-medium text-gray-900">Select + Download</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-blue-100">
            <span className="text-gray-600">Tag a player</span>
            <span className="font-medium text-gray-900">Preview &rarr; dropdown</span>
          </div>
        </div>
      </section>
    </div>
  );
}
