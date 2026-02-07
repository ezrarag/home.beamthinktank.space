export const overlayNavItems = [
  {
    id: "chapters",
    label: "Chapters",
    description: "Narrative progression for the BEAM story.",
    children: [
      { id: "chapter-access", label: "Chapter One: Access" },
      { id: "chapter-choice", label: "Chapter Two: Choice" },
      { id: "chapter-contribution", label: "Chapter Three: Contribution" },
      { id: "chapter-stewardship", label: "Chapter Four: Stewardship" },
    ],
  },
  {
    id: "styles",
    label: "Styles",
    description: "Switch the visual language without changing the story.",
    children: [
      { id: "style-picture-book", label: "Picture Book" },
      { id: "style-anime", label: "Anime" },
      { id: "style-cinematic", label: "Cinematic" },
      { id: "style-abstract", label: "Abstract" },
    ],
  },
  {
    id: "characters",
    label: "Characters",
    description: "Choose the point-of-view for the chapter.",
    children: [
      { id: "character-ari", label: "Ari" },
      { id: "character-sol", label: "Sol" },
      { id: "character-mara", label: "Mara" },
      { id: "character-jun", label: "Jun" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    description: "How the system works and why it scales.",
    href: "/participant-dashboard",
  },
  {
    id: "community",
    label: "Community",
    description: "Local participation, cohorts, and shared progress.",
    href: "/community-dashboard",
  },
];
