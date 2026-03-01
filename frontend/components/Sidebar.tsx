"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  MessageCircle,
  Library,
  Users,
  Clock,
  MapPin,
  Swords,
} from "lucide-react";
import type { LibraryStats } from "@/lib/types";
import { fetchLibraryStats } from "@/lib/api";

const navItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/ask", label: "Ask", icon: MessageCircle },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/map", label: "Locations", icon: MapPin },
  { href: "/battle", label: "Battle", icon: Swords },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<LibraryStats | null>(null);

  useEffect(() => {
    fetchLibraryStats()
      .then(setStats)
      .catch(() => {});

    const interval = setInterval(() => {
      fetchLibraryStats()
        .then(setStats)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-accent" />
          <h1 className="font-heading text-xl text-accent tracking-wide">
            MITHRANDIR
          </h1>
        </Link>
        <p className="text-sm text-text-secondary mt-1 font-ui">
          Tolkien Reference Platform
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive
                  ? "bg-card text-accent"
                  : "text-text-secondary hover:bg-card hover:text-text-primary"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.href === "/library" && stats && (
                <span className="ml-auto text-sm bg-background px-2 py-0.5 rounded-full">
                  {stats.books_ready}/{stats.books_total}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status bar */}
      <div className="p-4 border-t border-border text-sm text-text-secondary font-ui space-y-1">
        {stats && (
          <>
            <div>
              {stats.books_ready} book{stats.books_ready !== 1 ? "s" : ""} ready
            </div>
            {stats.total_words > 0 && (
              <div>{stats.total_words.toLocaleString()} words indexed</div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
