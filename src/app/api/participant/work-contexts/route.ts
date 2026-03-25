import { NextRequest, NextResponse } from "next/server";
import {
  resolveReadyaimgoParticipantContexts,
  type ParticipantWorkContextLookupInput,
} from "@/lib/server/readyaimgoParticipantContexts";

function getTrimmedParam(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key)?.trim();
  return value ? value : undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input: ParticipantWorkContextLookupInput = {
    sourceType: getTrimmedParam(searchParams, "sourceType"),
    sourceSystem: getTrimmedParam(searchParams, "sourceSystem"),
    scenarioLabel: getTrimmedParam(searchParams, "scenarioLabel"),
    entryChannel: getTrimmedParam(searchParams, "entryChannel"),
    sourceDocumentId: getTrimmedParam(searchParams, "sourceDocumentId"),
    sourceStoryId: getTrimmedParam(searchParams, "sourceStoryId"),
    organizationId: getTrimmedParam(searchParams, "organizationId"),
    organizationName: getTrimmedParam(searchParams, "organizationName"),
    siteUrl: getTrimmedParam(searchParams, "siteUrl"),
    landingPageUrl: getTrimmedParam(searchParams, "landingPageUrl"),
    referrerUrl: getTrimmedParam(searchParams, "referrerUrl"),
  };

  try {
    const result = await resolveReadyaimgoParticipantContexts(input);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve participant work contexts";
    return NextResponse.json(
      { contexts: [], matchedClient: null, error: message },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
