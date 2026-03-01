"use client";

import { User } from "lucide-react";
import Link from "next/link";
import type { CharacterSummary } from "@/lib/types";

interface Props {
  character: CharacterSummary;
}

const raceColors: Record<string, string> = {
  Vala: "text-amber-400",
  Maia: "text-purple-400",
  Elf: "text-emerald-400",
  "Half-elven": "text-teal-400",
  "Half-Maia": "text-violet-400",
  Man: "text-blue-400",
  Hobbit: "text-green-400",
  Dwarf: "text-orange-400",
  Dragon: "text-red-400",
  Ent: "text-lime-400",
};

export default function CharacterCard({ character }: Props) {
  const raceColor = raceColors[character.race || ""] || "text-text-secondary";

  return (
    <Link
      href={`/characters/${character.id}`}
      className="block bg-card border border-border rounded-lg px-4 py-3 hover:border-accent/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center">
          <User className="w-4 h-4 text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body text-base text-text-primary truncate">
            {character.canonical_name}
          </p>
          <p className={`text-sm font-ui ${raceColor}`}>
            {character.race || "Unknown"}
          </p>
        </div>
      </div>
      {character.aliases.length > 0 && (
        <p className="mt-2 text-sm text-text-secondary font-ui truncate">
          {character.aliases.slice(0, 3).join(", ")}
          {character.aliases.length > 3 && ` +${character.aliases.length - 3} more`}
        </p>
      )}
    </Link>
  );
}
