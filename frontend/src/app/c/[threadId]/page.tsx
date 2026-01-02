"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useThread } from "@/hooks/use-thread";
import { useAssistant } from "@/hooks/use-assistant";
import { useConversation } from "@/hooks/use-conversations";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: Date;
}

interface ThreadData {
  thread_id: string;
  metadata?: {
    title?: string;
    assistant_id?: string;
  };
  values?: {
    messages?: Array<{
      id?: string;
      role: string;
      content: string;
      timestamp?: string;
    }>;
  };
}

export default function ThreadDetail() {
  const params = useParams();
  const router = useRouter();
  const threadId = params?.threadId as string;

  const { assistant } = useAssistant();
  const { dataThread, mutateThread, loadingThread } = useThread(threadId);
  const { conversations } = useConversation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleNewChat = () => {
    router.push("/");
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/c/${id}`);
  };

  const handleSendMessage = async (content: string) => {
    if (!threadId || !assistant?.assistantId) {
      setError("Assistant ID is required");
      return;
    }
    // Add user message immediately
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
              <div className="max-w-3xl mx-auto w-full">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                  />
                ))}
                {loadingThread && (
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
              </div>
            </div>

            {/* Chat Input - Fixed at bottom */}
            <div className="sticky bottom-0 bg-background">
              <ChatInput
                onSend={handleSendMessage}
                disabled={loadingThread || !assistant?.assistantId}
                centered={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
