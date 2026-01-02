"use client";

import { useCallback, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useConversation } from "@/hooks/use-conversations";
import { useAssistant } from "@/hooks/use-assistant";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatPage() {
  useAssistant();
  const { conversations, loadingConversation } = useConversation();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleNewChat = () => {
    setMessages([]);
  };

  const handleSelectConversation = useCallback(
    (threadId: string) => {
      router.push(`/c/${threadId}`);
    },
    [router]
  );

  const handleSendMessage = async (content: string) => {
    // Send message
    console.log("Content: ", content);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:block">
        <Sidebar
          conversations={conversations}
          currentConversationId={undefined}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {messages.length === 0 ? (
          /* Empty State - Centered */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-2xl w-full mb-8">
              <h1 className="text-4xl font-semibold mb-4 text-foreground">
                How can I help you today?
              </h1>
            </div>
            <div className="w-full max-w-3xl">
              <ChatInput
                onSend={handleSendMessage}
                disabled={loadingConversation}
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
                {loadingConversation && (
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
                disabled={loadingConversation}
                centered={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
