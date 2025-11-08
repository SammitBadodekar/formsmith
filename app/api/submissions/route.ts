import { NextRequest, NextResponse } from "next/server";
import { submitForm } from "@/lib/actions/submissions";
import { z } from "zod";

const submitFormSchema = z.object({
  formId: z.string().min(1),
  data: z.record(z.string(), z.any()),
});

/**
 * Public API endpoint for form submissions
 * POST /api/submissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = submitFormSchema.parse(body);

    const result = await submitForm(validated);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Submission API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to submit form" },
      { status: 500 }
    );
  }
}
