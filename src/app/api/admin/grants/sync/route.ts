import { NextRequest, NextResponse } from "next/server";
import {
  fetchBeamOpportunities,
  fetchBeamPursuits,
  fetchBeamSubjects,
  seedOpportunityOnDiscovery,
  seedSubjectOnDiscovery,
} from "@/lib/beamGrantsService";
import type { BeamOpportunity, BeamSubject } from "@/types/grantConsole";

export async function GET() {
  try {
    const [opportunities, subjects, pursuits] = await Promise.all([
      fetchBeamOpportunities(),
      fetchBeamSubjects(),
      fetchBeamPursuits(),
    ]);

    return NextResponse.json({
      success: true,
      opportunities,
      subjects,
      pursuits,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync fetch failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: string;
      opportunity?: BeamOpportunity;
      subject?: BeamSubject;
    };

    if (body.action === "sync_opportunity" && body.opportunity) {
      await seedOpportunityOnDiscovery(body.opportunity);
      return NextResponse.json({ success: true, seededId: body.opportunity.id });
    }

    if (body.action === "sync_subject" && body.subject) {
      await seedSubjectOnDiscovery(body.subject);
      return NextResponse.json({ success: true, seededId: body.subject.id });
    }

    return NextResponse.json({ error: "Invalid sync action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync operation failed." },
      { status: 500 }
    );
  }
}
