"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { OrgNode, OrgNodeStatus, OrgNodeTier } from "@/lib/server/firestoreOrgTree";

interface OrgTreeResponse {
  nodes?: OrgNode[];
}

type TreeMap = Map<string | null, OrgNode[]>;

// TODO: Future enhancement — swap accordion for React Flow canvas
// when admin wants drag-and-drop node positioning.
// Install: npm install @xyflow/react
// Replace OrgTreeNode recursive render with ReactFlow nodes + edges.
// Each node becomes a custom React Flow node component with the same
// detail panel behavior.

function buildTree(nodes: OrgNode[]): TreeMap {
  const map = new Map<string | null, OrgNode[]>();

  for (const node of nodes) {
    const siblings = map.get(node.parentId) ?? [];
    siblings.push(node);
    map.set(node.parentId, siblings);
  }

  for (const [, children] of map) {
    children.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
  }

  return map;
}

function formatTime(timestampMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timestampMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatRelative(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "recently";

  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffMonths / 12);
  return formatter.format(diffYears, "year");
}

function getStatusDotClass(status: OrgNodeStatus): string {
  if (status === "filled" || status === "active") return "bg-[var(--beam-gold)]";
  if (status === "vacant" || status === "forming") return "bg-white/30";
  return "bg-white/15";
}

function getStatusLabel(status: OrgNodeStatus): string {
  return status.replace(/-/g, " ");
}

function getTierBadgeClass(tier: OrgNodeTier, status: OrgNodeStatus): string {
  if (tier === "national") return "border-white/30 text-white/70";
  if (tier === "regional") return "border-white/20 text-white/55";
  if (tier === "state") return "border-white/20 text-white/55";
  if (tier === "city-node") return "border-[var(--beam-gold)]/40 text-[var(--beam-gold-bright)]";
  if (tier === "institution-cluster") return "border-[var(--beam-gold)]/30 text-[var(--beam-gold)]";
  if (tier === "ngo-role") {
    return status === "filled" ? "border-[var(--beam-gold)]/40 text-[var(--beam-gold-bright)]" : "border-white/20 text-white/40";
  }
  return "border-white/20 text-white/60";
}

function getTierLabel(tier: OrgNodeTier): string {
  return tier.replace(/-/g, " ");
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;

      const pathVideoId = parsed.pathname.split("/").filter(Boolean)[1];
      return pathVideoId ? `https://www.youtube.com/embed/${pathVideoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function buildSeekUrl(node: OrgNode): string | null {
  if (!node.ngoSiteUrl || typeof node.media?.conceptTimestampMs !== "number") {
    return null;
  }

  try {
    const url = new URL(node.ngoSiteUrl);
    url.searchParams.set("seek", String(node.media.conceptTimestampMs));
    return url.toString();
  } catch {
    return null;
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-4">
      <p className="beam-eyebrow text-[var(--beam-gold)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[var(--beam-text-primary)]">{value.toLocaleString()}</p>
    </div>
  );
}

function NodeDetailPanel({ node }: { node: OrgNode }) {
  const youTubeEmbedUrl = node.media?.type === "youtube" ? getYouTubeEmbedUrl(node.media.url) : null;
  const seekUrl = buildSeekUrl(node);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border-t border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)]"
    >
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-[var(--beam-text-secondary)]">
            {node.description || "No description has been added for this node yet."}
          </p>

          {node.filledBy ? (
            <div className="rounded-[22px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="beam-eyebrow text-[var(--beam-gold)]">Assigned Lead</p>
              <p className="mt-3 text-lg font-medium text-[var(--beam-text-primary)]">{node.filledBy.name}</p>
              {node.filledBy.email ? (
                <p className="mt-1 text-sm text-[var(--beam-text-secondary)]">{node.filledBy.email}</p>
              ) : null}
              {node.filledBy.since ? (
                <p className="mt-1 text-sm text-[var(--beam-text-secondary)]">Since {node.filledBy.since}</p>
              ) : null}
            </div>
          ) : null}

          {node.status === "vacant" ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              Role is open.
            </div>
          ) : null}

          {node.ngoSiteUrl ? (
            <a
              href={node.ngoSiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
            >
              Visit {node.ngoSlug ?? "NGO"} site →
            </a>
          ) : null}

          {node.aiProjection ? (
            <div className="rounded-[22px] border border-[color:var(--beam-border)] border-l-2 border-l-[var(--beam-gold)] bg-[rgba(255,255,255,0.025)] p-4">
              <p className="beam-eyebrow text-[var(--beam-gold)]">AI Projection</p>
              <p className="mt-3 text-sm italic leading-7 text-[var(--beam-text-secondary)]">{node.aiProjection.summary}</p>
              <p className="mt-4 text-2xl font-semibold text-[var(--beam-gold-bright)]">
                ${node.aiProjection.estimatedMonthlyImpact.toLocaleString()}/mo estimated impact
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                Generated {formatRelative(node.aiProjection.generatedAt)}
              </p>
            </div>
          ) : null}
        </div>

        {node.media ? (
          <div className="space-y-3 rounded-[22px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-4">
            {node.media.type === "youtube" && youTubeEmbedUrl ? (
              <div className="overflow-hidden rounded-[18px] border border-[color:var(--beam-border)]">
                <iframe
                  src={youTubeEmbedUrl}
                  title={node.media.label}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full bg-black"
                />
              </div>
            ) : null}

            {node.media.type === "video" ? (
              <video controls className="aspect-video w-full rounded-[18px] border border-[color:var(--beam-border)] bg-black">
                <source src={node.media.url} />
              </video>
            ) : null}

            {node.media.type === "audio" ? (
              <audio controls className="w-full">
                <source src={node.media.url} />
              </audio>
            ) : null}

            <p className="text-sm text-[var(--beam-text-secondary)]">{node.media.label}</p>

            {seekUrl && typeof node.media.conceptTimestampMs === "number" ? (
              <a
                href={seekUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--beam-gold-bright)] transition hover:border-[var(--beam-gold)]"
              >
                Seek to {formatTime(node.media.conceptTimestampMs)} →
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function OrgTreeNode({
  node,
  treeMap,
  expandedIds,
  onToggle,
  onSelect,
  selectedNodeId,
  depth,
}: {
  node: OrgNode;
  treeMap: TreeMap;
  expandedIds: Set<string>;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  selectedNodeId: string | null;
  depth: number;
}) {
  const children = treeMap.get(node.id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNodeId === node.id;

  return (
    <div className="border-b border-[color:var(--beam-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggle(node.id);
        }}
        className={`flex w-full items-center gap-4 px-4 py-4 text-left transition sm:px-5 ${
          isSelected ? "bg-[rgba(200,185,122,0.08)]" : "hover:bg-[rgba(255,255,255,0.03)]"
        }`}
        style={{ paddingLeft: `${depth * 20 + 16}px` }}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(node.status)}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[var(--beam-text-primary)] sm:text-base">{node.label}</p>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${getTierBadgeClass(
                node.tier,
                node.status
              )}`}
            >
              {getTierLabel(node.tier)}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
              {getStatusLabel(node.status)}
            </span>
          </div>
          {node.sublabel ? (
            <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-[var(--beam-text-secondary)]">
              {node.sublabel}
            </p>
          ) : null}
        </div>
        {hasChildren ? (
          <span
            className={`text-[var(--beam-text-secondary)] transition-transform ${
              isExpanded ? "rotate-90" : "rotate-0"
            }`}
            aria-hidden="true"
          >
            ›
          </span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>{isSelected ? <NodeDetailPanel node={node} /> : null}</AnimatePresence>

      <AnimatePresence initial={false}>
        {isExpanded && hasChildren ? (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <OrgTreeNode
                key={child.id}
                node={child}
                treeMap={treeMap}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedNodeId={selectedNodeId}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function OrgTreeSection() {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgTree() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/org-tree/public", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as OrgTreeResponse;
        const nextNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
        const initialTree = buildTree(nextNodes);
        const rootNodes = initialTree.get(null) ?? [];

        if (!cancelled) {
          setNodes(nextNodes);
          setExpandedIds(new Set(rootNodes.map((node) => node.id)));
          setSelectedNodeId(rootNodes[0]?.id ?? nextNodes[0]?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setNodes([]);
          setExpandedIds(new Set());
          setSelectedNodeId(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrgTree();

    return () => {
      cancelled = true;
    };
  }, []);

  const treeMap = useMemo(() => buildTree(nodes), [nodes]);
  const rootNodes = treeMap.get(null) ?? [];

  return (
    <section id="org-tree" className="beam-section-anchor">
      <div className="beam-card rounded-[30px] p-6 sm:p-8">
        <p className="beam-eyebrow">Network structure</p>
        <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)] sm:text-5xl">
          The BEAM organization — every tier, every role.
        </h2>
        <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
          Every seat in the network is tracked here. Filled roles show who holds them. Vacant roles show what filling
          them would mean financially. Click any node to explore.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total nodes" value={nodes.length} />
          <StatCard label="Filled roles" value={nodes.filter((node) => node.status === "filled").length} />
          <StatCard label="Vacant roles" value={nodes.filter((node) => node.status === "vacant").length} />
        </div>

        <div className="mt-8 overflow-hidden rounded-[24px] border border-[color:var(--beam-border)]">
          {isLoading ? (
            <div className="px-5 py-6 text-sm text-[var(--beam-text-secondary)]">Loading org tree…</div>
          ) : rootNodes.length > 0 ? (
            rootNodes.map((node) => (
              <OrgTreeNode
                key={node.id}
                node={node}
                treeMap={treeMap}
                expandedIds={expandedIds}
                onToggle={(nodeId) =>
                  setExpandedIds((current) => {
                    const next = new Set(current);
                    if (next.has(nodeId)) {
                      next.delete(nodeId);
                    } else {
                      next.add(nodeId);
                    }
                    return next;
                  })
                }
                onSelect={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
                depth={0}
              />
            ))
          ) : (
            <div className="px-5 py-6 text-sm leading-7 text-[var(--beam-text-secondary)]">
              No public org tree nodes are available yet. Seed the collection from admin when you are ready.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
