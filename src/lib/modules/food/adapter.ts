import type { SectorData, SectorDataPoint } from "@/lib/thesis/types";

const USDA_FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const FOOD_REQUEST_INIT = {
  next: { revalidate: 86400 * 30 },
} as RequestInit & { next: { revalidate: number } };

interface FdcFoodNutrient {
  nutrientName?: string | null;
  value?: number | null;
}

interface FdcFoodRecord {
  fdcId?: number | null;
  description?: string | null;
  foodNutrients?: FdcFoodNutrient[] | null;
}

interface FdcSearchResponse {
  foods?: FdcFoodRecord[];
}

const FOOD_COST_MAP: Record<string, number> = {
  "dried lentils": 0.18,
  "canned beans": 0.35,
  "rolled oats": 0.22,
  "frozen spinach": 0.45,
  "fast food burger": 4.8,
  "potato chips snack": 1.2,
  "energy drink": 3.5,
};

const FOOD_QUERIES = [
  { query: "dried lentils", category: "accessible-nutritious" },
  { query: "canned beans", category: "accessible-nutritious" },
  { query: "rolled oats", category: "accessible-nutritious" },
  { query: "frozen spinach", category: "accessible-nutritious" },
  { query: "fast food burger", category: "expensive-convenient" },
  { query: "potato chips snack", category: "expensive-convenient" },
  { query: "energy drink", category: "expensive-convenient" },
] as const;

function getNutrientValue(nutrients: FdcFoodNutrient[] | null | undefined, name: string): number {
  return Number(
    nutrients?.find((nutrient) => nutrient.nutrientName?.toLowerCase().includes(name.toLowerCase()))?.value ?? 0
  );
}

async function fetchNutritionPerDollar(): Promise<SectorDataPoint[]> {
  const requests = FOOD_QUERIES.map(async (food) => {
    const searchParams = new URLSearchParams({
      query: food.query,
      pageSize: "1",
    });
    const apiKey = process.env.USDA_FDC_API_KEY;
    if (apiKey) {
      searchParams.set("api_key", apiKey);
    }

    const response = await fetch(`${USDA_FDC_BASE}/foods/search?${searchParams.toString()}`, FOOD_REQUEST_INIT);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as FdcSearchResponse;
    const item = payload.foods?.[0];
    if (!item) return null;

    const protein = getNutrientValue(item.foodNutrients, "protein");
    const fiber = getNutrientValue(item.foodNutrients, "fiber");
    const saturatedFat = getNutrientValue(item.foodNutrients, "saturated");
    const nutritionScore = Math.min(100, Math.round(protein * 3 + fiber * 4 - saturatedFat * 2 + 30));

    return {
      id: `food-${food.query.replace(/\s+/g, "-")}`,
      label: item.description?.trim() || food.query,
      cost: FOOD_COST_MAP[food.query] ?? 1,
      qualityScore: nutritionScore,
      qualityLabel: `Protein: ${protein}g · Fiber: ${fiber}g per serving`,
      isFreeOrSubsidized: food.category === "accessible-nutritious",
      metadata: {
        category: food.category,
        fdcId: Number(item.fdcId ?? 0),
      },
    } satisfies SectorDataPoint;
  });

  const settled = await Promise.allSettled(requests);
  return settled.reduce<SectorDataPoint[]>((accumulator, result) => {
    if (result.status === "fulfilled" && result.value) {
      accumulator.push(result.value);
    }
    return accumulator;
  }, []);
}

function average(points: SectorDataPoint[], key: "cost" | "qualityScore"): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, point) => sum + point[key], 0) / points.length;
}

function buildFoodSectorData(nutritionPoints: SectorDataPoint[]): SectorData {
  const accessible = nutritionPoints.filter((point) => point.isFreeOrSubsidized);
  const processed = nutritionPoints.filter((point) => !point.isFreeOrSubsidized);

  return {
    sector: "food",
    title: "Food",
    thesis: foodFallback.thesis,
    whatsPossible: foodFallback.whatsPossible,
    dataSource: "USDA FoodData Central · EPA Wasted Food · Feeding America",
    dataSourceUrl: "https://fdc.nal.usda.gov/api-guide.html",
    lastUpdated: new Date().toISOString().split("T")[0] ?? "",
    points: [...foodFallback.points, ...nutritionPoints],
    summary: {
      avgCostPaid: Math.round(average(processed, "cost") * 100) / 100,
      avgCostFree: Math.round(average(accessible, "cost") * 100) / 100,
      avgQualityPaid: Math.round(average(processed, "qualityScore")),
      avgQualityFree: Math.round(average(accessible, "qualityScore")),
      gapStatement:
        "The most nutritious foods per serving cost far less than processed alternatives. The barrier is access, not inherent food price.",
    },
  };
}

export async function fetchFoodData(): Promise<SectorData> {
  try {
    const nutritionData = await fetchNutritionPerDollar();
    return buildFoodSectorData(nutritionData);
  } catch (error) {
    console.warn("[BEAM food] FDC fetch failed, using fallback:", error);
    return foodFallback;
  }
}

const foodFallback: SectorData = {
  sector: "food",
  title: "Food",
  thesis:
    "The US discards 80 million tons of food annually while 44 million people are food insecure. Scarcity is not the problem.",
  whatsPossible:
    "SNAP, WIC, school lunch programs, and community food systems already prove that nutrition access at zero cost improves outcomes measurably.",
  dataSource: "EPA Wasted Food Report 2023 · USDA ERS · Feeding America Map the Meal Gap 2023",
  dataSourceUrl: "https://www.epa.gov/sustainable-management-food/wasted-food-scale",
  lastUpdated: "2023-12-01",
  points: [
    {
      id: "food-waste-retail",
      label: "Retail & Food Service Waste (annual)",
      cost: 0,
      qualityScore: 0,
      qualityLabel: "35M tons discarded by retailers and restaurants annually",
      isFreeOrSubsidized: false,
      metadata: { tonsWasted: 35000000, source: "EPA 2023", category: "waste" },
    },
    {
      id: "food-waste-consumer",
      label: "Consumer Household Waste (annual)",
      cost: 0,
      qualityScore: 0,
      qualityLabel: "45M tons discarded by households annually",
      isFreeOrSubsidized: false,
      metadata: { tonsWasted: 45000000, source: "EPA 2023", category: "waste" },
    },
    {
      id: "food-insecure",
      label: "Food Insecure Americans",
      cost: 0,
      qualityScore: 0,
      qualityLabel: "44M people experienced food insecurity in 2023",
      isFreeOrSubsidized: false,
      metadata: { people: 44000000, pct: 13.5, source: "USDA ERS 2023", category: "need" },
    },
    {
      id: "food-desert-urban",
      label: "Urban Food Desert Residents",
      cost: 4.2,
      qualityScore: 31,
      qualityLabel: "Avg 1.2 grocery stores per 10,000 residents · 4.2mi to supermarket",
      isFreeOrSubsidized: false,
      metadata: { category: "access", avgMealCost: 4.2, storesPer10k: 1.2 },
    },
    {
      id: "food-snap",
      label: "SNAP Recipients",
      cost: 1.9,
      qualityScore: 67,
      qualityLabel: "$6.22/day benefit · nutrition outcomes improve measurably vs. unassisted food insecurity",
      isFreeOrSubsidized: true,
      metadata: { category: "program", dailyBenefit: 6.22, source: "USDA FNS 2023" },
    },
    {
      id: "food-school-lunch",
      label: "National School Lunch Program",
      cost: 0,
      qualityScore: 74,
      qualityLabel: "Free to 30M children daily · USDA nutrition standards enforced",
      isFreeOrSubsidized: true,
      metadata: { category: "program", childrenServed: 30000000, source: "USDA FNS 2023" },
    },
    {
      id: "food-wic",
      label: "WIC Program",
      cost: 0,
      qualityScore: 79,
      qualityLabel: "Infant mortality -25% · preterm birth -14% in WIC participants",
      isFreeOrSubsidized: true,
      metadata: { category: "program", infantMortalityReduction: 25, source: "USDA ERS" },
    },
    {
      id: "food-lentils",
      label: "Dried Lentils (serving)",
      cost: 0.18,
      qualityScore: 88,
      qualityLabel: "18g protein · 15g fiber per serving · $0.18",
      isFreeOrSubsidized: true,
      metadata: { category: "nutrition", protein: 18, fiber: 15 },
    },
    {
      id: "food-fastfood",
      label: "Fast Food Burger (avg)",
      cost: 4.8,
      qualityScore: 22,
      qualityLabel: "14g protein · 1g fiber · high saturated fat · $4.80",
      isFreeOrSubsidized: false,
      metadata: { category: "nutrition", protein: 14, fiber: 1 },
    },
  ],
  summary: {
    avgCostPaid: 4.8,
    avgCostFree: 0.64,
    avgQualityPaid: 27,
    avgQualityFree: 77,
    gapStatement:
      "80M tons of food wasted annually. 44M people food insecure. Free programs already outperform the market on nutrition outcomes.",
  },
};
