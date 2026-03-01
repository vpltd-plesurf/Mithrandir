"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, BookOpen, ChevronDown, ChevronRight, Map, List } from "lucide-react";
import type { Location, LocationMention } from "@/lib/types";
import { fetchLocations, fetchLocationMentions, fetchLocationRegions } from "@/lib/api";
import Spinner from "@/components/Spinner";
import MapPinComponent from "@/components/MapPin";
import LocationDetailPanel from "@/components/LocationDetailPanel";

const regionColors: Record<string, string> = {
  Aman: "text-amber-400",
  Beleriand: "text-emerald-400",
  Numenor: "text-blue-400",
  Eriador: "text-teal-400",
  Rhovanion: "text-lime-400",
  Gondor: "text-cyan-400",
  Rohan: "text-green-400",
  Mordor: "text-red-400",
  "Misty Mountains": "text-purple-400",
  "Middle-earth": "text-purple-400",
};

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Map state
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastTransform = useRef({ x: 0, y: 0 });

  // List state
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [mentions, setMentions] = useState<LocationMention[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const [openRegions, setOpenRegions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLocationRegions()
      .then((data) => {
        setRegions(data.regions);
        setOpenRegions(new Set(data.regions));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLocations({ region: selectedRegion || undefined })
      .then((data) => setLocations(data.locations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedRegion]);

  // Map interactions
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((prev) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(6, Math.max(0.5, prev.scale * delta));

      // Zoom toward cursor
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const scaleChange = newScale / prev.scale;
        return {
          x: cx - (cx - prev.x) * scaleChange,
          y: cy - (cy - prev.y) * scaleChange,
          scale: newScale,
        };
      }
      return { ...prev, scale: newScale };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setTransform((prev) => {
      lastTransform.current = { x: prev.x, y: prev.y };
      return prev;
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform((prev) => ({
      ...prev,
      x: lastTransform.current.x + dx,
      y: lastTransform.current.y + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // List interactions
  const toggleRegion = (region: string) => {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const handleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setMentions([]);
    setLoadingMentions(true);
    try {
      const data = await fetchLocationMentions(id, 5);
      setMentions(data.mentions);
    } catch {
      // silently fail
    } finally {
      setLoadingMentions(false);
    }
  };

  const mappableLocations = locations.filter((loc) => loc.latitude != null && loc.longitude != null);
  const unmappableLocations = locations.filter((loc) => loc.latitude == null || loc.longitude == null);

  // Group by region for list view
  const grouped = locations.reduce<Record<string, Location[]>>((acc, loc) => {
    const region = loc.region || "Unknown";
    if (!acc[region]) acc[region] = [];
    acc[region].push(loc);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-accent tracking-wide">
              Locations
            </h1>
            <p className="text-sm text-text-secondary font-ui mt-0.5">
              Places of Middle-earth and beyond
            </p>
          </div>
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-ui transition-colors ${
                viewMode === "map"
                  ? "bg-accent text-background"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Map className="w-4 h-4" />
              Map
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-ui transition-colors ${
                viewMode === "list"
                  ? "bg-accent text-background"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
        </div>

        {/* Region filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSelectedRegion("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-ui transition-colors ${
              selectedRegion === ""
                ? "bg-accent text-background"
                : "bg-surface border border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            All Regions
          </button>
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-lg text-sm font-ui transition-colors ${
                selectedRegion === region
                  ? "bg-accent text-background"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner label="Loading locations..." />
        </div>
      ) : viewMode === "map" ? (
        /* Map View */
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          <div
            className="absolute inset-0"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
          >
            <div
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: "0 0",
                position: "relative",
                width: "100%",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/middle-earth-map.jpg"
                alt="Middle-earth"
                className="w-full h-auto select-none pointer-events-none"
                draggable={false}
              />

              {/* Pins */}
              {mappableLocations.map((loc) => (
                <MapPinComponent
                  key={loc.id}
                  location={loc}
                  scale={transform.scale}
                  isSelected={selectedLocation?.id === loc.id}
                  onClick={() => setSelectedLocation(loc)}
                />
              ))}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-1 z-20">
            <button
              onClick={() => setTransform((p) => ({ ...p, scale: Math.min(6, p.scale * 1.3) }))}
              className="w-8 h-8 bg-surface border border-border rounded text-text-primary font-ui text-lg hover:bg-card transition-colors"
            >
              +
            </button>
            <button
              onClick={() => setTransform((p) => ({ ...p, scale: Math.max(0.5, p.scale * 0.7) }))}
              className="w-8 h-8 bg-surface border border-border rounded text-text-primary font-ui text-lg hover:bg-card transition-colors"
            >
              -
            </button>
            <button
              onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
              className="w-8 h-8 bg-surface border border-border rounded text-text-secondary font-ui text-xs hover:bg-card transition-colors"
            >
              Fit
            </button>
          </div>

          {/* Unmapped locations note */}
          {unmappableLocations.length > 0 && (
            <div className="absolute top-4 left-4 bg-surface/90 border border-border rounded-lg px-3 py-2 text-sm text-text-secondary font-ui z-20 max-w-xs">
              {unmappableLocations.length} locations not on this map (Aman, Beleriand, Numenor) — switch to List view
            </div>
          )}

          {/* Detail panel */}
          {selectedLocation && (
            <LocationDetailPanel
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
            />
          )}
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {Object.entries(grouped).map(([region, locs]) => {
              const isOpen = openRegions.has(region);
              const color = regionColors[region] || "text-text-secondary";

              return (
                <div key={region}>
                  <button
                    onClick={() => toggleRegion(region)}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-secondary" />
                    )}
                    <span className={`font-heading text-base uppercase tracking-wider ${color}`}>
                      {region}
                    </span>
                    <span className="text-sm text-text-secondary font-ui">
                      ({locs.length})
                    </span>
                  </button>

                  {isOpen && (
                    <div className="ml-6 space-y-1">
                      {locs.map((loc) => (
                        <div key={loc.id}>
                          <button
                            onClick={() => handleExpand(loc.id)}
                            className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-card transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-text-secondary flex-shrink-0" />
                            <span className="text-base font-body text-text-primary">
                              {loc.name}
                            </span>
                            {loc.type && (
                              <span className="text-sm text-text-secondary font-ui ml-auto">
                                {loc.type}
                              </span>
                            )}
                          </button>

                          {expandedId === loc.id && (
                            <div className="ml-10 mt-1 mb-3 bg-card border border-border rounded-lg p-3">
                              {loc.description && (
                                <p className="text-sm text-text-primary font-body leading-relaxed mb-3">
                                  {loc.description}
                                </p>
                              )}

                              <h4 className="text-sm font-ui text-accent flex items-center gap-1.5 mb-2">
                                <BookOpen className="w-3.5 h-3.5" />
                                Text mentions
                              </h4>

                              {loadingMentions ? (
                                <p className="text-sm text-text-secondary font-ui">
                                  Searching corpus...
                                </p>
                              ) : mentions.length === 0 ? (
                                <p className="text-sm text-text-secondary font-ui">
                                  No mentions found.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {mentions.map((m, i) => (
                                    <div key={i} className="bg-surface rounded-lg p-2">
                                      <div className="flex justify-between mb-1">
                                        <span className="text-sm font-ui text-accent">
                                          {m.book}
                                        </span>
                                        <span className="text-sm font-ui text-text-secondary">
                                          {Math.round(m.relevance_score * 100)}%
                                        </span>
                                      </div>
                                      <p className="text-sm text-text-primary font-body leading-relaxed">
                                        {m.excerpt}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
