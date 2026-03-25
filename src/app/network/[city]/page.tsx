import { notFound } from "next/navigation";
import { CityNodePage } from "@/components/network/CityNodePage";
import { getCityNodePayload } from "@/lib/pipeline/network";
import { getPublicNodes } from "@/lib/server/firestoreNodes";

interface NetworkCityPageProps {
  params: Promise<{ city: string }>;
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  const nodes = await getPublicNodes();
  return nodes.filter((node) => node.status === "active").map((node) => ({ city: node.id }));
}

export default async function NetworkCityPage({ params }: NetworkCityPageProps) {
  const { city } = await params;
  const payload = await getCityNodePayload(city);

  if (!payload) {
    notFound();
  }

  return <CityNodePage node={payload.node} stats={payload.stats} />;
}
