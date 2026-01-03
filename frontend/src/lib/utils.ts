import { ArtifactInfo } from "@/types/artifact";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString?: string): string | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
    return formatted || null;
  } catch {
    return null;
  }
};

export const extractContent = (content: any): string | null => {
  if (!content) return null;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        return item.text;
      }
    }
    return null;
  }
  if (typeof content === "object" && "text" in content) {
    return content.text;
  }
  return null;
};

// Helper function to parse artifact from tool message
export function parseArtifact(content: string): ArtifactInfo | null {
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

export function extractContent2(content: unknown): string {
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
