import { client } from "@/lib/langchain";

export async function GET() {
  try {
    const threads = await client.threads.search({
      limit: 20,
      sortBy: "created_at",
    });

    return Response.json(threads);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return Response.json(
      {
        error: "Failed to fetch conversations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
