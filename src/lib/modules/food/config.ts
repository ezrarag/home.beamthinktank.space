import type { ModuleConfig } from "@/lib/modules/types";
import { fetchFoodData } from "@/lib/modules/food/adapter";

export const foodModule: ModuleConfig = {
  id: "food",
  version: "1.0.0",
  status: "core",
  title: "Food",
  icon: "◬",
  sector: "Food Access vs. Waste vs. Hunger",
  displayOrder: 2,
  thesis:
    "The United States disposes of 80 million tons of food annually while 44 million people are food insecure. This is not a scarcity problem.",
  whatsPossible:
    "Food banks, SNAP, school lunch programs, WIC, and community gardens already prove that nutrition access is possible at zero cost. The barrier is distribution, not supply.",
  dataStory: {
    hook: "80,000,000 tons of food thrown away. 44,000,000 people who needed it.",
    context:
      "Food insecurity is not caused by a lack of food. It is caused by a lack of access shaped by geography, income, and distribution choices.",
    proof:
      "SNAP, WIC, school lunch, and community food systems show that when access is guaranteed, nutrition outcomes improve at lower per-meal cost than the market.",
  },
  visualization: "flow",
  dataSources: [
    {
      name: "USDA Food Environment Atlas",
      url: "https://www.ers.usda.gov/data-products/food-environment-atlas/",
      isFree: true,
      updateFrequency: "annual",
    },
    {
      name: "USDA ERS Food Loss & Waste",
      url: "https://www.ers.usda.gov/topics/food-nutrition-assistance/food-security-in-the-us/",
      isFree: true,
      updateFrequency: "annual",
    },
    {
      name: "USDA FoodData Central",
      url: "https://fdc.nal.usda.gov/api-guide.html",
      apiEnvKey: "USDA_FDC_API_KEY",
      isFree: true,
      updateFrequency: "monthly",
    },
    {
      name: "EPA Wasted Food Report",
      url: "https://www.epa.gov/sustainable-management-food/wasted-food-scale",
      isFree: true,
      updateFrequency: "annual",
    },
    {
      name: "Feeding America · Map the Meal Gap",
      url: "https://map.feedingamerica.org/",
      isFree: true,
      updateFrequency: "annual",
    },
  ],
  fetchData: fetchFoodData,
};
