import type { ModuleConfig } from "@/lib/modules/types";
import { fetchEducationData } from "@/lib/modules/education/adapter";

export const educationModule: ModuleConfig = {
  id: "education",
  version: "1.0.0",
  status: "core",
  title: "Education",
  icon: "◎",
  sector: "Education / Access vs. Price",
  displayOrder: 1,
  thesis: "For-profit colleges charge 4× more than public institutions and produce worse outcomes.",
  whatsPossible:
    "Community colleges and public universities already deliver, often better, for a fraction of the cost or free.",
  dataStory: {
    hook: "For-profit college students pay about $32,000 per year and graduate at 42%. Public university students pay about $10,000 and graduate at 79%.",
    context:
      "The price premium for for-profit education does not purchase stronger outcomes. It purchases the appearance of prestige and convenience.",
    proof:
      "Community colleges and public institutions already serve millions with durable outcomes at near-zero net cost after aid.",
  },
  visualization: "scatter",
  dataSources: [
    {
      name: "US Dept of Education · College Scorecard",
      url: "https://collegescorecard.ed.gov",
      apiEnvKey: "COLLEGE_SCORECARD_API_KEY",
      isFree: true,
      updateFrequency: "annual",
    },
  ],
  fetchData: fetchEducationData,
};
