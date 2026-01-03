import { Message } from "@/types/conversations";
import { useEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

export function AutoScroll({
  messages,
  isStreaming,
}: {
  messages: Message[];
  isStreaming: boolean;
}) {
  const { scrollToBottom, isAtBottom } = useStickToBottomContext();

  useEffect(() => {
    // Auto scroll when new messages arrive (only if user is at bottom)
    if (isAtBottom) {
      // Use setTimeout to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, scrollToBottom, isAtBottom]);

  // Also scroll during streaming if user is at bottom
  useEffect(() => {
    if (isStreaming && isAtBottom) {
      const intervalId = setInterval(() => {
        scrollToBottom();
      }, 100);
      return () => clearInterval(intervalId);
    }
  }, [isStreaming, isAtBottom, scrollToBottom]);

  return null;
}
