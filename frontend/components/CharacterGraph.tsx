"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { CharacterGraph as CharacterGraphType } from "@/lib/types";
import { fetchCharacterGraph } from "@/lib/api";
import Spinner from "@/components/Spinner";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

const raceColors: Record<string, string> = {
  Elf: "#c8a45c",
  "Half-elven": "#d4b76a",
  Man: "#8ba88e",
  Hobbit: "#b5a27a",
  Dwarf: "#a67c52",
  Vala: "#9b8ec4",
  Maia: "#7b9ec4",
  "Half-Maia": "#8baec4",
  Ent: "#6b8f5e",
  Dragon: "#c44444",
  "Great Spider": "#8b4444",
  Unknown: "#888888",
};

interface GraphNode {
  id: number;
  name: string;
  race: string | null;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
  type: "parent" | "spouse";
}

export default function CharacterGraph() {
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allLinks, setAllLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [activeRaces, setActiveRaces] = useState<Set<string>>(new Set());
  const [availableRaces, setAvailableRaces] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const router = useRouter();

  useEffect(() => {
    fetchCharacterGraph()
      .then((data: CharacterGraphType) => {
        const nodes = data.nodes.map((n) => ({ ...n }));
        const links = data.edges.map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
        }));

        // Collect all races present
        const races = new Set<string>();
        nodes.forEach((n) => races.add(n.race || "Unknown"));
        const raceList = Array.from(races).sort();

        setAllNodes(nodes);
        setAllLinks(links);
        setAvailableRaces(raceList);
        setActiveRaces(new Set(raceList));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filtered graph data based on active races
  const graphData = useMemo(() => {
    if (allNodes.length === 0) return null;

    const visibleNodes = allNodes.filter((n) =>
      activeRaces.has(n.race || "Unknown")
    );
    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    const visibleLinks = allLinks.filter((e) => {
      const srcId = typeof e.source === "number" ? e.source : e.source.id;
      const tgtId = typeof e.target === "number" ? e.target : e.target.id;
      return visibleIds.has(srcId) && visibleIds.has(tgtId);
    });

    return { nodes: visibleNodes, links: visibleLinks };
  }, [allNodes, allLinks, activeRaces]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Configure forces for better spread once graph is mounted
  useEffect(() => {
    if (graphRef.current && graphData) {
      graphRef.current.d3Force("charge").strength(-150);
      graphRef.current.d3Force("link").distance(50);
    }
  }, [graphData]);

  // Re-center graph when container resizes
  useEffect(() => {
    if (graphRef.current && dimensions.width > 0 && dimensions.height > 0) {
      graphRef.current.zoomToFit(400, 60);
    }
  }, [dimensions]);

  const toggleRace = (race: string) => {
    setActiveRaces((prev) => {
      const next = new Set(prev);
      if (next.has(race)) {
        next.delete(race);
      } else {
        next.add(race);
      }
      return next;
    });
  };

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      router.push(`/characters/${node.id}`);
    },
    [router],
  );

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const label = node.name;
      const fontSize = Math.max(12 / globalScale, 2);
      const isHovered = hoveredNode?.id === node.id;
      const radius = isHovered ? 6 : 4;
      const color = raceColors[node.race || "Unknown"] || raceColors.Unknown;

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      if (isHovered) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isHovered ? "#ffffff" : "rgba(200, 200, 200, 0.8)";
      ctx.fillText(label, x, y + radius + 2);
    },
    [hoveredNode],
  );

  const linkCanvasObject = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D) => {
      const source = link.source as GraphNode;
      const target = link.target as GraphNode;
      if (!source.x || !source.y || !target.x || !target.y) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (link.type === "spouse") {
        ctx.strokeStyle = "rgba(200, 164, 92, 0.4)";
        ctx.setLineDash([4, 4]);
      } else {
        ctx.strokeStyle = "rgba(150, 150, 150, 0.3)";
        ctx.setLineDash([]);
      }
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner label="Loading graph..." />
      </div>
    );
  }

  if (allNodes.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center" style={{ minHeight: 0 }}>
        <p className="text-text-secondary font-ui">No character data available.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width > 0 ? dimensions.width : undefined}
        height={dimensions.height > 0 ? dimensions.height : undefined}
        graphData={graphData ?? { nodes: [], links: [] }}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: GraphNode | null) => setHoveredNode(node)}
        onEngineStop={() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 60);
          }
        }}
        backgroundColor="#1a1611"
        cooldownTicks={200}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        nodeRelSize={4}
        linkDirectionalArrowLength={0}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Race filter legend */}
      <div className="absolute bottom-4 left-4 bg-surface/90 border border-border rounded-lg p-3 z-10">
        <p className="text-xs font-ui text-text-secondary mb-2 uppercase tracking-wider">Races</p>
        <div className="space-y-0.5">
          {availableRaces.map((race) => {
            const color = raceColors[race] || raceColors.Unknown;
            const isActive = activeRaces.has(race);
            const count = allNodes.filter((n) => (n.race || "Unknown") === race).length;
            return (
              <button
                key={race}
                onClick={() => toggleRace(race)}
                className="flex items-center gap-2 w-full text-left py-0.5 group"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 transition-opacity"
                  style={{
                    backgroundColor: color,
                    opacity: isActive ? 1 : 0.2,
                  }}
                />
                <span
                  className={`text-xs font-ui transition-colors ${
                    isActive
                      ? "text-text-secondary group-hover:text-text-primary"
                      : "text-text-secondary/40 group-hover:text-text-secondary"
                  }`}
                >
                  {race} ({count})
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border flex gap-2">
          <button
            onClick={() => setActiveRaces(new Set(availableRaces))}
            className="text-xs font-ui text-text-secondary hover:text-accent transition-colors"
          >
            All
          </button>
          <button
            onClick={() => setActiveRaces(new Set())}
            className="text-xs font-ui text-text-secondary hover:text-accent transition-colors"
          >
            None
          </button>
        </div>
        <div className="mt-2 pt-2 border-t border-border space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-4 border-t border-text-secondary inline-block" />
            <span className="text-xs font-ui text-text-secondary">Parent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 border-t border-dashed border-accent inline-block" />
            <span className="text-xs font-ui text-text-secondary">Spouse</span>
          </div>
        </div>
      </div>

      {/* Hovered node tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 bg-surface/90 border border-border rounded-lg px-3 py-2 z-10">
          <p className="text-sm font-heading text-accent">{hoveredNode.name}</p>
          <p className="text-xs font-ui text-text-secondary">{hoveredNode.race || "Unknown"}</p>
          <p className="text-xs font-ui text-text-secondary mt-1">Click to view profile</p>
        </div>
      )}
    </div>
  );
}
