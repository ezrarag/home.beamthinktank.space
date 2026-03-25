import type { ModuleConfig } from "@/lib/modules/types";
import { fetchHealthcareData } from "@/lib/modules/healthcare/adapter";

export const healthcareModule: ModuleConfig = {
  id: "healthcare",
  version: "1.0.0",
  status: "core",
  title: "Healthcare",
  icon: "◉",
  sector: "Healthcare / Cost vs. Quality",
  displayOrder: 4,
  thesis:
    "For-profit hospitals charge more per day and do not consistently outperform public and nonprofit systems on quality ratings.",
  whatsPossible:
    "Community health centers, nonprofit hospitals, and public systems already prove strong care is possible without premium pricing.",
  dataStory: {
    hook: "For-profit systems cost roughly one-third more per day without a matching quality advantage.",
    context:
      "Healthcare pricing is often defended as if it maps cleanly onto outcomes. CMS quality data does not support that story.",
    proof:
      "Public and nonprofit providers already deliver comparable care quality with lower costs and stronger affordability pathways.",
  },
  visualization: "scatter",
  dataSources: [
    {
      name: "CMS Care Compare",
      url: "https://www.medicare.gov/care-compare/",
      isFree: true,
      updateFrequency: "weekly",
    },
  ],
  fetchData: fetchHealthcareData,
};
