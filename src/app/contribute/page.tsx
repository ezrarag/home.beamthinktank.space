import { ContributeModuleClient } from "@/components/contribute/ContributeModuleClient";
import { getCommunityModules } from "@/lib/modules/registry";

export default function ContributePage() {
  const communityModules = getCommunityModules().map((module) => ({
    id: module.id,
    title: module.title,
    contributor: module.contributor
      ? {
          orgName: module.contributor.orgName,
          orgUrl: module.contributor.orgUrl,
          approvedAt: module.contributor.approvedAt,
          notes: module.contributor.notes,
        }
      : undefined,
  }));

  return <ContributeModuleClient communityModules={communityModules} />;
}
