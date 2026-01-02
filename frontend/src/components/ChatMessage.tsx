"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { FileText, ExternalLink } from "lucide-react";
import { useState } from "react";

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
}

export function ChatMessage({ role, content, artifact }: ChatMessageProps) {
  const isUser = role === "user";
  const [isArtifactExpanded, setIsArtifactExpanded] = useState(false);

  const handleArtifactClick = () => {
    if (artifact) {
      // Extract chart type from artifact.type (e.g., "chart/ontologies" -> "ontologies")
      const chartType = artifact.type.includes("/")
        ? artifact.type.split("/")[1]
        : artifact.type.replace("chart/", "");
      
      // Navigate to chart API endpoint
      const artifactUrl = `/api/charts/${chartType}?id=${artifact.id}`;
      window.open(artifactUrl, "_blank");
    }
  };

  const getChartTypeDisplay = (type: string): string => {
    if (type.includes("/")) {
      return type.split("/")[1];
    }
    return type.replace("chart/", "");
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
          <div className="flex justify-end">
            <p className="text-foreground whitespace-pre-wrap wrap-break-word leading-relaxed text-right max-w-[80%]">
              {content}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-[80%]">
            {content && (
              <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed">
                <ReactMarkdown>{content}</ReactMarkdown>
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
