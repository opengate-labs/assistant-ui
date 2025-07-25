import { ThreadAssistantMessagePart, TextMessagePart, CustomComponentMessagePart } from "../types/AssistantTypes";

/**
 * Parses component markers from LLM response text and returns an array of message parts.
 * 
 * Supports format: [COMPONENT:ComponentName]{"prop1":"value1","prop2":"value2"}[/COMPONENT]
 * 
 * @param text - The raw text from LLM response
 * @returns Array of message parts (text and custom-component types)
 */
export const parseComponentMarkers = (text: string): ThreadAssistantMessagePart[] => {
  const parts: ThreadAssistantMessagePart[] = [];
  
  // Regex to match [COMPONENT:Name]{...}[/COMPONENT] format
  const componentRegex = /\[COMPONENT:(\w+)\]\s*(\{.*?\})\s*\[\/COMPONENT\]/gs;
  
  let lastIndex = 0;
  let match;
  
  while ((match = componentRegex.exec(text)) !== null) {
    // Add text before component (if any)
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim();
      if (textContent.length > 0) {
        parts.push({
          type: "text",
          text: textContent
        } as TextMessagePart);
      }
    }
    
    try {
      // Parse component props from JSON
      const componentProps = JSON.parse(match[2] ?? '{}');
      
      // Add component part
      parts.push({
        type: "custom-component",
        componentName: match[1],
        props: componentProps,
        originalText: match[0] ?? undefined // Store original text for fallback
      } as CustomComponentMessagePart);
    } catch (error) {
      // Invalid JSON - treat as regular text
      console.warn(`Failed to parse component props for ${match[1] ?? 'unknown'}:`, error);
      parts.push({
        type: "text",
        text: match[0]
      } as TextMessagePart);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last component (if any)
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex).trim();
    if (remainingText.length > 0) {
      parts.push({
        type: "text",
        text: remainingText
      } as TextMessagePart);
    }
  }
  
  // If no components found, return original text as single text part
  if (parts.length === 0 && text.trim().length > 0) {
    parts.push({
      type: "text",
      text: text.trim()
    } as TextMessagePart);
  }
  
  return parts;
};

/**
 * Checks if text contains component markers
 */
export const hasComponentMarkers = (text: string): boolean => {
  const result = /\[COMPONENT:\w+\].*?\[\/COMPONENT\]/s.test(text);
  console.log("hasComponentMarkers - text:", JSON.stringify(text));
  console.log("hasComponentMarkers - result:", result);
  return result;
};

/**
 * Extracts all component names from text (useful for prefetching/validation)
 */
export const extractComponentNames = (text: string): string[] => {
  const names: string[] = [];
  const componentRegex = /\[COMPONENT:(\w+)\]/g;
  let match;
  
  while ((match = componentRegex.exec(text)) !== null) {
    if (match[1]) names.push(match[1]);
  }
  
  return names;
};

/**
 * Checks if text contains partial/incomplete component markers (for streaming)
 */
export const hasPartialComponentMarkers = (text: string): boolean => {
  // Check for incomplete component markers during streaming
  const patterns = [
    /\[COMPONENT:\w*$/,              // "[COMPONENT:Menu" at end
    /\[COMPONENT:\w+\]\s*\{[^}]*$/,  // "[COMPONENT:Menu]{incomplete json" at end  
    /\[COMPONENT:\w+\]\s*\{.*?\}\s*\[\/COMP[^]]*$/,  // "[COMPONENT:Menu]{...}[/COMP" at end
  ];
  
  return patterns.some(pattern => pattern.test(text));
};

/**
 * Enhanced parsing that handles both complete and streaming component markers
 */
export const parseComponentMarkersWithStreaming = (text: string): {
  parts: ThreadAssistantMessagePart[];
  hasStreamingComponent: boolean;
  streamingComponentName: string | undefined;
} => {
  const parts: ThreadAssistantMessagePart[] = [];
  let hasStreamingComponent = false;
  let streamingComponentName: string | undefined;
  
  // First parse complete components using existing logic
  const componentRegex = /\[COMPONENT:(\w+)\]\s*(\{.*?\})\s*\[\/COMPONENT\]/gs;
  
  let lastIndex = 0;
  let match;
  
  // Handle complete components
  while ((match = componentRegex.exec(text)) !== null) {
    // Add text before component (if any)
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim();
      if (textContent.length > 0) {
        parts.push({
          type: "text",
          text: textContent
        } as TextMessagePart);
      }
    }
    
    try {
      // Parse component props from JSON
      const componentProps = JSON.parse(match[2] ?? '{}');
      
      // Add component part
      parts.push({
        type: "custom-component",
        componentName: match[1],
        props: componentProps,
        originalText: match[0] ?? undefined
      } as CustomComponentMessagePart);
    } catch (error) {
      // Invalid JSON - treat as regular text
      console.warn(`Failed to parse component props for ${match[1] ?? 'unknown'}:`, error);
      parts.push({
        type: "text",
        text: match[0]
      } as TextMessagePart);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Handle remaining text and check for partial components
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    
    // Check if remaining text has partial component markers
    if (hasPartialComponentMarkers(remainingText)) {
      hasStreamingComponent = true;
      
      // Try to extract component name from partial marker
      const nameMatch = remainingText.match(/\[COMPONENT:(\w+)/);
      if (nameMatch) {
        streamingComponentName = nameMatch[1];
      }
      
      // Split at the component marker start
      const componentStartIndex = remainingText.indexOf('[COMPONENT:');
      if (componentStartIndex > 0) {
        // Add text before the partial component
        const textBefore = remainingText.slice(0, componentStartIndex).trim();
        if (textBefore.length > 0) {
          parts.push({
            type: "text",
            text: textBefore
          } as TextMessagePart);
        }
      }
      
      // Don't add the partial component text - it will be handled by loading state
    } else {
      // No partial components - add remaining text normally
      const trimmedText = remainingText.trim();
      if (trimmedText.length > 0) {
        parts.push({
          type: "text",
          text: trimmedText
        } as TextMessagePart);
      }
    }
  }
  
  // If no parts were created and we have text, create a text part
  if (parts.length === 0 && text.trim().length > 0 && !hasStreamingComponent) {
    parts.push({
      type: "text",
      text: text.trim()
    } as TextMessagePart);
  }
  
  return {
    parts,
    hasStreamingComponent,
    streamingComponentName
  };
};