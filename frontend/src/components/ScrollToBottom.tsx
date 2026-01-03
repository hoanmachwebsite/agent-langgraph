import { ArrowDown } from "lucide-react";
import { useStickToBottomContext } from "use-stick-to-bottom";

export function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <button
      onClick={() => scrollToBottom()}
      className="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 bg-primary text-primary-foreground rounded-full p-2.5 shadow-lg hover:bg-primary/90 transition-all hover:scale-110 active:scale-95"
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="w-5 h-5" />
    </button>
  );
}
