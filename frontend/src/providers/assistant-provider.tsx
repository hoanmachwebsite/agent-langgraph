"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAssistant } from "@/hooks/use-assistant";

type AssistantContextType = {
  assistant?: {
    assistantId: string;
  };
  loadingAssistant: boolean;
};

const AssistantContext = createContext<AssistantContextType | undefined>(
  undefined
);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { assistant, loadingAssistant } = useAssistant();

  return (
    <AssistantContext.Provider
      value={{
        assistant,
        loadingAssistant,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const context = useContext(AssistantContext);

  if (!context) {
    throw new Error(
      "useAssistantContext must be used within AssistantProvider"
    );
  }

  return context;
}
