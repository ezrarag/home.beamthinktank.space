import type { Metadata } from "next";
import { BeamPublicOverview } from "@/components/landing/BeamPublicOverview";

export const metadata: Metadata = {
  title: "BEAM Overview — Research, Network & Methodology",
  description: "Explore BEAM's public research network, methodology, evidence, and local-action infrastructure.",
};

export default function OverviewPage() {
  return <BeamPublicOverview />;
}
