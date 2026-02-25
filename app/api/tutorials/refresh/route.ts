import { NextResponse } from "next/server";
import { z } from "zod";

import { refreshTopic } from "@/lib/generation";

export const runtime = "nodejs";

const RefreshBodySchema = z.object({
  topicKey: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = RefreshBodySchema.parse(await request.json());
    const result = await refreshTopic(payload.topicKey);
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

    const message = error instanceof Error ? error.message : "internal error";
    const status = message === "topic not found" ? 404 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
