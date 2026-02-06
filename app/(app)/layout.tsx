import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  Settings,
  LogOut,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { MobileMenu } from "@/components/MobileMenu";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg"></div>
                <span className="text-xl font-bold text-gray-900">
                  Powerhouse Photos
                </span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  href="/"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Gallery</span>
                </Link>
                <Link
                  href="/upload"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </Link>
                <Link
                  href="/collections"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Collections</span>
                </Link>
                <Link
                  href="/how-to-use"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help</span>
                </Link>
                {session.user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{session.user.name}</span>
                  {session.user.role === 'admin' && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <Link href="/settings">
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </Link>
                <form action={handleSignOut}>
                  <Button variant="ghost" size="icon" type="submit">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </form>
              </div>
              <MobileMenu
                userName={session.user.name || "User"}
                isAdmin={session.user.role === "admin"}
                signOutAction={handleSignOut}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
