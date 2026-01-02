import { client } from "@/lib/langchain";

export async function GET() {
  try {
    const threads = await client.threads.search({ limit: 1 });

    if (!threads || threads.length === 0) {
      return Response.json({ error: "No threads found" }, { status: 404 });
    }

    const thread = threads[0];
    const assistantId = thread?.metadata?.assistant_id || null;

    if (!assistantId) {
      return Response.json(
        { error: "Assistant ID not found in thread" },
        { status: 404 }
      );
    }

    return Response.json({ assistantId });
  } catch (error) {
    console.error("Error fetching assistants:", error);
    return Response.json(
      {
        error: "Failed to fetch assistants",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
