import { NextResponse } from "next/server";
import { z } from "zod";

import { generateOrReuse } from "@/lib/generation";

export const runtime = "nodejs";

const GenerateBodySchema = z.object({
  query: z.string().min(1),
  lang: z.enum(["zh", "en"]).optional(),
  forceRefresh: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = GenerateBodySchema.parse(await request.json());
    const result = await generateOrReuse(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "invalid request",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal error",
      },
      { status: 500 },
    );
  }
}
