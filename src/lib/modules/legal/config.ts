import type { ModuleConfig } from "@/lib/modules/types";
import { fetchLegalData } from "@/lib/modules/legal/adapter";

export const legalModule: ModuleConfig = {
  id: "legal",
  version: "1.0.0",
  status: "core",
  title: "Legal Services",
  icon: "◈",
  sector: "Legal / Access vs. Outcome",
  displayOrder: 5,
  thesis:
    "Civil legal need goes overwhelmingly unmet, even though free legal aid dramatically improves outcomes and can rival private counsel.",
  whatsPossible:
    "Legal aid organizations already prove that strong representation is possible at zero cost when capacity exists.",
  dataStory: {
    hook: "People with legal aid reach favorable outcomes at roughly 79%, compared with about 28% for self-representation.",
    context:
      "The problem is not whether free legal help works. The problem is that access to it is rationed by capacity.",
    proof:
      "Legal aid models already deliver strong outcomes at zero cost, demonstrating that representation quality does not require a private-attorney price tag.",
  },
  visualization: "gap-funnel",
  dataSources: [
    {
      name: "Legal Services Corporation · Justice Gap",
      url: "https://justicegap.lsc.gov/",
      isFree: true,
      updateFrequency: "static",
    },
  ],
  fetchData: fetchLegalData,
};
