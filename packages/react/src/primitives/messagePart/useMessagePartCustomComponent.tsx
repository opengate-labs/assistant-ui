"use client";

import { CustomComponentMessagePart } from "../../types/AssistantTypes";
import { useMessagePart as useBaseMessagePart } from "../../context/react/MessagePartContext";

/**
 * Hook to access custom component message part data.
 * This hook provides type-safe access to custom component message parts.
 */
export const useMessagePartCustomComponent = () => {
  const part = useBaseMessagePart();
  
  if (part.type !== "custom-component") {
    throw new Error("useMessagePartCustomComponent can only be used with custom-component message parts");
  }
  
  return part as CustomComponentMessagePart;
};

// Re-export the base hook for convenience
export { useMessagePart } from "../../context/react/MessagePartContext";