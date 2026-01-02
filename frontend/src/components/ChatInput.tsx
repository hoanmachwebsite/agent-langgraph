"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  text: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  suggestions?: Suggestion[];
  disabled?: boolean;
  centered?: boolean;
  isStreaming?: boolean;
}

const defaultSuggestions: Suggestion[] = [
  { id: "1", text: "Explain quantum computing in simple terms" },
  { id: "2", text: "Write a Python function to sort a list" },
  { id: "3", text: "What are the best practices for React hooks?" },
  { id: "4", text: "How does machine learning work?" },
];

export function ChatInput({
  onSend,
  onStop,
  suggestions = defaultSuggestions,
  disabled = false,
  centered = false,
  isStreaming = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showSuggestions = centered && message.trim() === "";

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200;
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setMessage(suggestionText);
    textareaRef.current?.focus();
  };

  return (
    <div
      className={cn("bg-background", centered ? "" : "border-t border-border")}
    >
      {/* Input Area */}
      <div className={cn("px-4 max-w-5xl mx-auto", centered ? "py-0" : "py-4")}>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGPT..."
              disabled={disabled}
              rows={1}
              className={cn(
                "w-full resize-none rounded-lg px-4 py-3",
                "text-sm placeholder:text-muted-foreground",
                "max-h-[200px] overflow-y-auto",
                "min-h-[44px]"
              )}
            />
          </div>
          {isStreaming ? (
            <Button
              onClick={onStop}
              disabled={disabled}
              size="icon"
              variant="destructive"
              className="shrink-0 h-9 w-9"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              size="icon"
              className="shrink-0 h-9 w-9"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        {!centered && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            ChatGPT can make mistakes. Check important info.
          </div>
        )}
      </div>

      {/* Suggestions - Below input */}
      {showSuggestions && (
        <div
          className={cn(
            "px-4 max-w-5xl mx-auto",
            centered ? "pt-4 pb-0" : "pt-2 pb-4"
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion.text)}
                className={cn(
                  "text-left px-5 py-4 rounded-lg border border-border",
                  "bg-card hover:bg-accent hover:border-accent-foreground/20",
                  "transition-all text-base",
                  "hover:shadow-sm active:scale-[0.98]"
                )}
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
