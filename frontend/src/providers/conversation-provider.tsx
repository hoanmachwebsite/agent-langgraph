"use client";

import { createContext, useContext, ReactNode } from "react";
import { useConversation } from "@/hooks/use-conversations";

type ConversationContextType = {
  conversations?: any[];
  loadingConversation: boolean;
};

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { conversations, loadingConversation } = useConversation();

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        loadingConversation,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversationContext must be used within ConversationProvider"
    );
  }
  return context;
}
