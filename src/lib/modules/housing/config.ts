import type { ModuleConfig } from "@/lib/modules/types";
import { fetchHousingData } from "@/lib/modules/housing/adapter";

export const housingModule: ModuleConfig = {
  id: "housing",
  version: "1.0.0",
  status: "core",
  title: "Housing",
  icon: "◫",
  sector: "Housing / Access vs. Quality",
  displayOrder: 3,
  thesis:
    "Landlords in major metros charge market-rate rent for properties that fail basic quality standards while subsidized housing enforces standards the market often ignores.",
  whatsPossible:
    "Community land trusts and permanently affordable housing already demonstrate that stability and quality can coexist far below market cost.",
  dataStory: {
    hook: "Market-rate units in BEAM anchor metros often cost 3 to 5 times more than subsidized models while still carrying unresolved quality violations.",
    context:
      "The market charges a premium for access even when it does not guarantee habitability. Price and quality keep separating.",
    proof:
      "Covenant-backed and publicly accountable housing models already prove that lower-cost housing can be better maintained and more stable.",
  },
  visualization: "grouped-bar",
  dataSources: [
    {
      name: "HUD Fair Market Rents",
      url: "https://www.huduser.gov/portal/datasets/fmr.html",
      apiEnvKey: "HUD_API_KEY",
      isFree: true,
      updateFrequency: "annual",
    },
    {
      name: "NLIHC Out of Reach",
      url: "https://nlihc.org/oor",
      isFree: true,
      updateFrequency: "annual",
    },
  ],
  fetchData: fetchHousingData,
};
