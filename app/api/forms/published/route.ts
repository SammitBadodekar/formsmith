import { NextRequest, NextResponse } from "next/server";
import { getPublishedFormByDomain } from "@/lib/data/forms";

/**
 * Public API endpoint to get published form by domain
 * GET /api/forms/published?domain=my-form
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain parameter is required" },
        { status: 400 }
      );
    }

    const form = await getPublishedFormByDomain(domain);

    return NextResponse.json({ success: true, form });
  } catch (error) {
    console.error("Get published form API error:", error);

    return NextResponse.json(
      { success: false, error: "Form not found" },
      { status: 404 }
    );
  }
}
