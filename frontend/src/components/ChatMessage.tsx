"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-6 group",
        !isUser && "bg-muted/30",
        isUser && "flex-row-reverse"
      )}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-sm font-medium",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        {isUser ? (
          <div className="flex justify-end">
            <p className="text-foreground whitespace-pre-wrap wrap-break-word leading-relaxed text-right max-w-[80%]">
              {content}
            </p>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed max-w-[80%]">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
