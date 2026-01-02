import { client } from "@/lib/langchain";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  try {
    // Handle both Next.js 13+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const { threadId } = resolvedParams;

    // Get thread details from LangGraph
    const thread = await client.threads.get(threadId);
    
    return Response.json({
      thread,
    });
  } catch (error) {
    console.error('Error fetching thread details:', error);
    return Response.json(
      { 
        error: 'Failed to fetch thread details', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const { threadId } = resolvedParams;
    const body = await request.json();
    const { message, assistantId } = body;

    if (!message) {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!assistantId) {
      return Response.json(
        { error: 'Assistant ID is required' },
        { status: 400 }
      );
    }

    // Stream the run with the message
    const stream = client.runs.stream(threadId, assistantId, {
      input: { messages: [{ role: "user", content: message }] },
      streamMode: ["messages", "values"],
    });

    // Process the stream and collect messages
    const messages = [];
    for await (const chunk of stream) {
      if (chunk.event === 'messages' && chunk.data) {
        messages.push(...(Array.isArray(chunk.data) ? chunk.data : [chunk.data]));
      }
    }

    // Get updated thread
    const thread = await client.threads.get(threadId);
    
    return Response.json({
      thread,
      messages,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return Response.json(
      { 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

