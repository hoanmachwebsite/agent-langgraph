import { ArtifactInfo } from "./artifact";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  artifact?: ArtifactInfo;
}
