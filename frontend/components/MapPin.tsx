"use client";

import { MapPin as MapPinIcon } from "lucide-react";
import type { Location } from "@/lib/types";

const regionColors: Record<string, string> = {
  Aman: "#fbbf24",
  Beleriand: "#34d399",
  Numenor: "#60a5fa",
  Eriador: "#2dd4bf",
  Rhovanion: "#a3e635",
  Gondor: "#22d3ee",
  Rohan: "#4ade80",
  Mordor: "#f87171",
  "Misty Mountains": "#a78bfa",
  "Middle-earth": "#c084fc",
};

interface MapPinProps {
  location: Location;
  scale: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function MapPinComponent({ location, scale, isSelected, onClick }: MapPinProps) {
  const color = regionColors[location.region || ""] || "#a69880";
  const pinScale = Math.max(0.5, 1 / scale);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute group"
      style={{
        left: `${location.latitude}%`,
        top: `${location.longitude}%`,
        transform: `translate(-50%, -100%) scale(${pinScale})`,
        transformOrigin: "bottom center",
        zIndex: isSelected ? 20 : 10,
      }}
    >
      <MapPinIcon
        className="w-6 h-6 drop-shadow-lg transition-transform group-hover:scale-125"
        style={{ color, fill: isSelected ? color : "transparent" }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-background/90 border border-border rounded px-2 py-1 text-sm font-ui"
        style={{ color }}
      >
        {location.name}
      </div>
    </button>
  );
}
