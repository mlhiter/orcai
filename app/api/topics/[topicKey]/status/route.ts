import { NextResponse } from "next/server";

import { getTopicStatus } from "@/lib/generation";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ topicKey: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { topicKey } = await context.params;
  const status = await getTopicStatus(topicKey);

  if (!status) {
    return NextResponse.json(
      {
        error: "topic not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(status);
}
