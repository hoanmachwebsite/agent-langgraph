import { client } from "@/lib/langchain";
import { NextRequest } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, assistantId } = body;

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    if (!assistantId) {
      return Response.json(
        { error: "Assistant ID is required" },
        { status: 400 }
      );
    }

    // Create a new thread
    const thread = await client.threads.create();

    // Stream the run with the message
    const stream = client.runs.stream(thread.thread_id, assistantId, {
      input: { messages: [{ role: "user", content: message }] },
      streamMode: ["messages", "values"],
    });

    // Create a ReadableStream to send SSE events
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send thread info first
          const threadData = JSON.stringify({ type: "thread", thread });
          controller.enqueue(encoder.encode(`data: ${threadData}\n\n`));

          // Stream the run chunks
          for await (const chunk of stream) {
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.close();
        } catch (error) {
          console.error("Error in stream:", error);
          const errorData = JSON.stringify({
            error: "Stream error",
            details: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return Response.json(
      {
        error: "Failed to create conversation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
