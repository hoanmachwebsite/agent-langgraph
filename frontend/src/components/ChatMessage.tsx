"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { FileText, ExternalLink, Copy, Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ArtifactInfo {
  id: string;
  type: string;
  title: string;
  content: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  artifact?: ArtifactInfo;
  onArtifactClick?: (artifact: ArtifactInfo) => void;
  onRetry?: () => void;
}

export function ChatMessage({
  role,
  content,
  artifact,
  onArtifactClick,
  onRetry,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [isArtifactExpanded, setIsArtifactExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleArtifactClick = () => {
    if (artifact) {
      if (onArtifactClick) {
        onArtifactClick(artifact);
      } else {
        // Fallback: open in new window if no callback provided
        const chartType = artifact.type.includes("/")
          ? artifact.type.split("/")[1]
          : artifact.type.replace("chart/", "");

        const artifactUrl = `/api/charts/${chartType}?id=${artifact.id}`;
        window.open(artifactUrl, "_blank");
      }
    }
  };

  const getChartTypeDisplay = (type: string): string => {
    if (type.includes("/")) {
      return type.split("/")[1];
    }
    return type.replace("chart/", "");
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      toast.success("Đã sao chép vào clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

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
          <div className="space-y-2">
            <p className="text-foreground whitespace-pre-wrap wrap-break-word leading-relaxed text-right max-w-[80%] ml-auto">
              {content}
            </p>
            {content && (
              <div className="flex items-center gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                  aria-label="Sao chép tin nhắn"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onRetry || (() => {})}
                  aria-label="Thử lại"
                  disabled={!onRetry}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-[80%]">
            {content && (
              <div className="space-y-2">
                <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={handleCopy}
                    aria-label="Sao chép tin nhắn"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={onRetry || (() => {})}
                    aria-label="Thử lại"
                    disabled={!onRetry}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            {artifact && (
              <div
                className={cn(
                  "border rounded-lg overflow-hidden transition-all duration-200",
                  "bg-background border-border hover:border-primary/50",
                  "cursor-pointer group/artifact"
                )}
                onClick={handleArtifactClick}
                onMouseEnter={() => setIsArtifactExpanded(true)}
                onMouseLeave={() => setIsArtifactExpanded(false)}
              >
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm text-foreground">
                      {artifact.title}
                    </span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                      {getChartTypeDisplay(artifact.type)}
                    </span>
                  </div>
                  <ExternalLink
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isArtifactExpanded && "translate-x-0.5 -translate-y-0.5"
                    )}
                  />
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Click to view {artifact.type} chart
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
