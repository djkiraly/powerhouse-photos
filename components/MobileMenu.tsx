"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Upload,
  FolderOpen,
  HelpCircle,
  Shield,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type MobileMenuProps = {
  userName: string;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
};

export function MobileMenu({ userName, isAdmin, signOutAction }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/", icon: LayoutDashboard, label: "Gallery" },
    { href: "/upload", icon: Upload, label: "Upload" },
    { href: "/collections", icon: FolderOpen, label: "Collections" },
    { href: "/how-to-use", icon: HelpCircle, label: "Help" },
    ...(isAdmin
      ? [{ href: "/admin", icon: Shield, label: "Admin Portal" }]
      : []),
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  {isAdmin && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="py-2">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-blue-700 bg-blue-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sign out */}
            <div className="border-t border-gray-100 py-2">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
