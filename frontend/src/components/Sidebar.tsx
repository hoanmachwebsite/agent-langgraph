"use client";

import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { cn, formatDate, extractContent } from "@/lib/utils";
import { Thread } from "@langchain/langgraph-sdk";

interface SidebarProps {
  conversations?: Thread[];
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
}

export function Sidebar({
  conversations = [],
  currentConversationId,
  onNewChat,
  onSelectConversation,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-screen bg-sidebar border-r border-sidebar-border w-64 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">ChatGPT</span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-sidebar-border">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => {
              const threadId = conversation.thread_id;
              const values = conversation.values as
                | {
                    messages?: Array<{
                      content?:
                        | string
                        | Array<{ type?: string; text?: string }>
                        | { type?: string; text?: string };
                    }>;
                  }
                | undefined;

              const firstMessageContent = values?.messages?.[0]?.content
                ? extractContent(values.messages[0].content)
                : null;
              const metadataTitle = conversation.metadata?.title;
              const title: string =
                (typeof metadataTitle === "string" ? metadataTitle : null) ||
                firstMessageContent ||
                `Thread ${threadId.slice(0, 8)}` ||
                "New Conversation";

              // Format date if available
              const formattedDate = conversation.created_at
                ? formatDate(conversation.created_at)
                : null;

              return (
                <button
                  key={threadId}
                  onClick={() => onSelectConversation(threadId)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "truncate group",
                    currentConversationId === threadId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground"
                  )}
                >
                  <div className="truncate font-medium">{title}</div>
                  {formattedDate && (
                    <div className="truncate text-xs text-muted-foreground mt-0.5">
                      {formattedDate}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
