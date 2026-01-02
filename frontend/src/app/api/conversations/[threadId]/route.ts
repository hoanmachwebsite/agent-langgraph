import { client } from "@/lib/langchain";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const { threadId } = resolvedParams;

    const thread = await client.threads.get(threadId);

    return Response.json({
      thread,
    });
  } catch (error) {
    console.error("Error fetching thread details:", error);
    return Response.json(
      {
        error: "Failed to fetch thread details",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
