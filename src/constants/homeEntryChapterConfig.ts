/**
 * Per-chapter configuration for the homepage 4-chapter narrative.
 * Keyed by homeEntryVideos[].id. All copy lives here; components read from this only.
 */
export interface HomeEntryChapterConfigItem {
  /** Display title for intro overlay (defaults to entry.label if omitted) */
  title?: string;
  /** Optional subtitle line under the title */
  subtitle?: string;
  /** Section header for the explore overlay (e.g. "What BEAM studies here") */
  exploreSectionHeader: string;
  /** Exploration nodes shown in the explore overlay (not links yet) */
  exploreNodes: string[];
}

export const homeEntryChapterConfig: Record<string, HomeEntryChapterConfigItem> = {
  observation: {
    title: "Observation",
    subtitle: "Noticing what draws us in",
    exploreSectionHeader: "What BEAM studies here",
    exploreNodes: [
      "Patterns of attention",
      "Where focus lands",
      "First impressions",
    ],
  },
  reality: {
    title: "Reality",
    subtitle: "The situation as it is",
    exploreSectionHeader: "What BEAM studies here",
    exploreNodes: [
      "Context and constraints",
      "Existing structures",
      "Current conditions",
    ],
  },
  intervention: {
    title: "Intervention",
    subtitle: "Moments of change",
    exploreSectionHeader: "What BEAM studies here",
    exploreNodes: [
      "Points of leverage",
      "Possible actions",
      "Risks and trade-offs",
    ],
  },
  transformation: {
    title: "Transformation",
    subtitle: "What shifts as a result",
    exploreSectionHeader: "What BEAM studies here",
    exploreNodes: [
      "Before and after",
      "New patterns",
      "Ongoing impact",
    ],
  },
};
