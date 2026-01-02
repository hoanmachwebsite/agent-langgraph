"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStream } from "@langchain/langgraph-sdk/react";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useThread } from "@/hooks/use-thread";
import { useAssistant } from "@/hooks/use-assistant";
import { useConversation } from "@/hooks/use-conversations";
import { useInterrupt } from "@/hooks/use-interrupt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ArtifactInfo {
  id: string;
  type: string;
  title: string;
  content: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  artifact?: ArtifactInfo;
}

// Helper function to extract content from message
function extractContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  // Handle array content (e.g., [{ type: "text", text: "..." }])
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "object" && item !== null && "text" in item) {
          return item.text;
        }
        return JSON.stringify(item);
      })
      .join("");
  }
  return JSON.stringify(content);
}

// Helper function to parse artifact from tool message
function parseArtifact(content: string): ArtifactInfo | null {
  try {
    const parsed = JSON.parse(content);
    if (
      parsed.type === "tool_use" &&
      parsed.name === "artifacts" &&
      parsed.input
    ) {
      const input = parsed.input;
      if (input.command === "create" && input.id && input.type && input.title) {
        return {
          id: input.id,
          type: input.type,
          title: input.title,
          content: input.content || "",
        };
      }
    }
  } catch {
    // Not a valid artifact JSON
  }
  return null;
}

export default function ThreadDetail() {
  const params = useParams();
  const router = useRouter();
  const threadId = params?.threadId as string;

  const { assistant } = useAssistant();
  const { dataThread, mutateThread, loadingThread } = useThread(threadId);
  const { conversations } = useConversation();

  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use useStream hook from LangGraph SDK
  const {
    messages: streamMessages,
    interrupt,
    submit,
    isLoading: isSending,
  } = useStream({
    apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || "",
    apiKey: process.env.NEXT_PUBLIC_LANGGRAPH_API_KEY || "",
    assistantId: assistant?.assistantId || "",
    threadId: threadId || "",
    messagesKey: "messages",
  });

  // Use custom hook to parse interrupt data and manage state
  const { interruptInfo, editArgs, setEditArgs, clearInterrupt } = useInterrupt(
    interrupt as { value?: unknown; id?: string } | null | undefined
  );

  // Extract thread messages
  const threadMessages = useMemo(() => {
    return dataThread?.thread?.values?.messages || [];
  }, [dataThread?.thread?.values?.messages]);

  // Combine thread messages with stream messages from useStream
  const messages: Message[] = useMemo(() => {
    // Use stream messages if available and we're actively streaming, otherwise use thread messages
    const useStreamMessages =
      streamMessages && streamMessages.length > 0 && isSending;

    if (useStreamMessages) {
      const processedMessages: Message[] = [];

      streamMessages.forEach((msg: unknown, index: number) => {
        const msgObj = msg as {
          type?: string;
          content?: unknown;
          id?: string;
          name?: string;
        };

        // Handle tool messages with create_artifact
        if (msgObj.type === "tool" && msgObj.name === "create_artifact") {
          const content = extractContent(msgObj.content);
          const artifact = parseArtifact(content);

          if (artifact) {
            // Find the most recent AI message to attach artifact to
            let lastAIMessage: Message | null = null;
            for (let i = processedMessages.length - 1; i >= 0; i--) {
              if (processedMessages[i].role === "assistant") {
                lastAIMessage = processedMessages[i];
                break;
              }
            }

            if (lastAIMessage) {
              // Attach artifact to the most recent AI message
              lastAIMessage.artifact = artifact;
            } else {
              // Create a new AI message for the artifact if no AI message found
              processedMessages.push({
                id: msgObj.id || `artifact-${index}`,
                role: "assistant",
                content: "",
                artifact,
              });
            }
          }
          return;
        }

        // Handle human and AI messages
        if (msgObj.type === "human" || msgObj.type === "ai") {
          const role = msgObj.type === "human" ? "user" : "assistant";
          const content = extractContent(msgObj.content);

          const message: Message = {
            id: msgObj.id || `stream-${index}`,
            role,
            content,
          };

          processedMessages.push(message);
        }
      });

      return processedMessages;
    }

    // Use thread messages (this should have the persisted messages)
    if (Array.isArray(threadMessages) && threadMessages.length > 0) {
      const processedMessages: Message[] = [];

      threadMessages.forEach((msg, index) => {
        const msgType = (msg as { type?: string; name?: string }).type;
        const msgName = (msg as { type?: string; name?: string }).name;

        // Handle tool messages with create_artifact
        if (msgType === "tool" && msgName === "create_artifact") {
          const content = extractContent(
            (msg as { content?: unknown }).content
          );
          const artifact = parseArtifact(content);

          if (artifact) {
            // Find the most recent AI message to attach artifact to
            let lastAIMessage: Message | null = null;
            for (let i = processedMessages.length - 1; i >= 0; i--) {
              if (processedMessages[i].role === "assistant") {
                lastAIMessage = processedMessages[i];
                break;
              }
            }

            if (lastAIMessage) {
              // Attach artifact to the most recent AI message
              lastAIMessage.artifact = artifact;
            } else {
              // Create a new AI message for the artifact if no AI message found
              processedMessages.push({
                id: (msg as { id?: string }).id || `artifact-${index}`,
                role: "assistant",
                content: "",
                artifact,
              });
            }
          }
          return;
        }

        // Handle human and AI messages
        if (msgType === "human" || msgType === "ai") {
          const role = msgType === "human" ? "user" : "assistant";
          const content = extractContent(
            (msg as { content?: unknown }).content
          );

          const message: Message = {
            id: (msg as { id?: string }).id || `thread-${index}`,
            role,
            content,
          };

          processedMessages.push(message);
        }
      });

      return processedMessages;
    }

    return [];
  }, [streamMessages, threadMessages, isSending]);

  // Check if we're actively streaming with content
  const isStreamingWithContent = useMemo(() => {
    if (!isSending || !streamMessages || streamMessages.length === 0) {
      return false;
    }
    // Check if there's at least one AI message with content
    const hasAIMessageWithContent = streamMessages.some((msg: unknown) => {
      const msgObj = msg as { type?: string; content?: unknown };
      if (msgObj.type === "ai") {
        const content = extractContent(msgObj.content);
        return content.trim().length > 0;
      }
      return false;
    });
    return hasAIMessageWithContent;
  }, [streamMessages, isSending]);

  const handleNewChat = () => {
    router.push("/");
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/c/${id}`);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInterruptDecision = async (
    decision: "approve" | "reject" | "edit"
  ) => {
    if (!interruptInfo || !interrupt || !assistant?.assistantId) return;

    try {
      // Build decision object
      let decisionType: { type: string; args?: Record<string, unknown> };
      if (decision === "approve") {
        decisionType = { type: "approve" };
      } else if (decision === "reject") {
        decisionType = { type: "reject" };
      } else if (decision === "edit") {
        try {
          const editedArgs = JSON.parse(editArgs);
          decisionType = { type: "edit", args: editedArgs };
        } catch {
          alert("Invalid JSON format for edited arguments");
          return;
        }
      } else {
        return;
      }

      // Build command in LangGraph Studio format
      const resumeRunId = interruptInfo.checkpointId || interruptInfo.runId;
      if (!resumeRunId) {
        alert("Missing run ID. Cannot resume interrupted run.");
        return;
      }
      const command = {
        resume: {
          [resumeRunId as string]: {
            decisions: [decisionType],
          },
        },
      };

      // Use submit from useStream to resume the interrupted run
      const submitOptions = {
        command,
        onDisconnect: "continue" as const,
        streamMode: ["messages-tuple", "values"] as Array<
          "messages-tuple" | "values"
        >,
        streamResumable: true,
      };
      await submit({}, submitOptions);

      // Clear interrupt info after successful submit
      clearInterrupt();

      // Refresh thread details to get updated messages
      setTimeout(() => {
        mutateThread();
      }, 500);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to send decision. Please try again."
      );
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!threadId || !assistant?.assistantId) {
      setError("Assistant ID is required");
      return;
    }

    if (!content.trim() || isSending) return;

    try {
      // Use useStream's submit to send the message
      await submit({
        messages: [{ role: "user", content: content.trim() }],
      });

      // Refresh thread details after sending
      setTimeout(() => {
        mutateThread();
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again."
      );
    }
  };

  if (loadingThread) {
    return (
      <div className="flex h-screen bg-background">
        <aside className="hidden md:block">
          <Sidebar
            conversations={conversations}
            currentConversationId={threadId}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
          />
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading thread...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex h-screen bg-background">
        <aside className="hidden md:block">
          <Sidebar
            conversations={conversations}
            currentConversationId={threadId}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
          />
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="text-primary hover:underline"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:block">
        <Sidebar
          conversations={conversations}
          currentConversationId={threadId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {error && messages.length > 0 && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm text-center">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          /* Empty State - Centered */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-2xl w-full mb-8">
              <h1 className="text-4xl font-semibold mb-4 text-foreground">
                Thread {threadId?.slice(0, 8)}
              </h1>
              <p className="text-muted-foreground">
                This thread is empty. Start a conversation below.
              </p>
            </div>
            <div className="w-full max-w-3xl">
              <ChatInput
                onSend={handleSendMessage}
                disabled={loadingThread || !assistant?.assistantId}
                centered={true}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth">
              <div className="max-w-5xl mx-auto w-full">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    artifact={message.artifact}
                  />
                ))}
                {(loadingThread || (isSending && !isStreamingWithContent)) && (
                  <div className="flex gap-4 px-4 py-6">
                    <div className="w-8 h-8 rounded-full bg-secondary shrink-0 flex items-center justify-center">
                      <span className="text-sm text-secondary-foreground">
                        AI
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input - Fixed at bottom */}
            <div className="sticky bottom-0 bg-background">
              <ChatInput
                onSend={handleSendMessage}
                disabled={
                  loadingThread ||
                  !assistant?.assistantId ||
                  isSending ||
                  !!interruptInfo
                }
                centered={false}
              />
            </div>
          </>
        )}
      </div>

      {/* Interrupt Confirmation Dialog */}
      <Dialog
        open={!!interruptInfo}
        onOpenChange={() => {
          // Prevent closing dialog without making a decision
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key
            e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            // Prevent closing by clicking outside
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Confirmation Required
            </DialogTitle>
            <DialogDescription>
              The AI is requesting permission to perform an action. Please
              review and make a decision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {interruptInfo?.description && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                  {interruptInfo.description}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">
                <strong>Tool:</strong>{" "}
                <code className="bg-zinc-100 dark:bg-zinc-700 px-2 py-1 rounded text-xs">
                  {interruptInfo?.toolName}
                </code>
              </p>
              <p className="text-sm font-medium">Arguments:</p>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded text-xs overflow-x-auto border border-zinc-200 dark:border-zinc-700">
                {JSON.stringify(interruptInfo?.args, null, 2)}
              </pre>
            </div>

            {interruptInfo?.allowedDecisions.includes("edit") && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Edit Arguments (JSON):
                </label>
                <textarea
                  value={editArgs}
                  onChange={(e) => setEditArgs(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-xs"
                  rows={6}
                  placeholder='{"path": "new/path/to/file"}'
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            {interruptInfo?.allowedDecisions.includes("reject") && (
              <Button
                variant="destructive"
                onClick={() => handleInterruptDecision("reject")}
              >
                Reject
              </Button>
            )}
            {interruptInfo?.allowedDecisions.includes("edit") && (
              <Button
                variant="outline"
                onClick={() => handleInterruptDecision("edit")}
              >
                Edit & Approve
              </Button>
            )}
            {interruptInfo?.allowedDecisions.includes("approve") && (
              <Button
                onClick={() => handleInterruptDecision("approve")}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
