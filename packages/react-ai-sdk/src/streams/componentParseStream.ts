// Component parsing transform stream for assistant-stream
// This follows the same pattern as toolResultStream

import { AssistantMessage } from "assistant-stream";

// Local type definition for AssistantMessagePart (copied from assistant-stream)
type TextStatus =
  | { type: "running" }
  | { type: "complete"; reason: "stop" | "unknown" }
  | { type: "incomplete"; reason: "cancelled" | "length" | "content-filter" | "other" };

type TextPart = {
  type: "text";
  text: string;
  status: TextStatus;
  parentId?: string;
};

type CustomComponentPart = {
  type: "custom-component";
  componentName: string;
  props: Record<string, any>;
  originalText?: string;
  status: TextStatus;
  parentId?: string;
};

type AssistantMessagePart = TextPart | CustomComponentPart;

// Regex to match [COMPONENT:Name]{...}[/COMPONENT] format
const COMPONENT_REGEX = /\[COMPONENT:(\w+)\]\s*(\{.*?\})\s*\[\/COMPONENT\]/gs;

function parseStructuredResponse(text: string): AssistantMessagePart[] {
  const responses: AssistantMessagePart[] = [];
  let lastIndex = 0;
  
  let match;
  while ((match = COMPONENT_REGEX.exec(text)) !== null) {
    // Add preceding text as text response
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim();
      if (textContent) {
        responses.push({ type: "text", text: textContent, status: { type: "complete", reason: "unknown" } });
      }
    }
    
    // Add component response
    try {
      const props = JSON.parse(match[2]!);
      responses.push({
        type: "custom-component",
        componentName: match[1]!,
        props,
        originalText: match[0],
        status: { type: "complete", reason: "unknown" }
      });
    } catch (e) {
      console.error(e)
      // Invalid JSON, treat as text
      responses.push({ type: "text", text: match[0], status: { type: "complete", reason: "unknown" } });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex).trim();
    if (remainingText) {
      responses.push({ type: "text", text: remainingText, status: { type: "complete", reason: "unknown" } });
    }
  }
  
  // If no structured components found, return the original text
  return responses.length > 0 ? responses : [{ type: "text", text, status: { type: "complete", reason: "unknown" } }];
}

export function componentParseStream(): TransformStream<AssistantMessage, AssistantMessage> {
  let pendingComponent: {
    componentName: string;
    buffer: string;
  } | null = null;

  return new TransformStream({
    transform(message, controller) {
      // Only process assistant messages
      if (message.role !== "assistant") {
        controller.enqueue(message);
        return;
      }

      // Look for text parts that might contain components
      let hasComponents = false;
      const newParts = [];

      for (const part of message.parts) {
        if (part.type === "text") {
          const text = part.text;
          
          // Early detection: Look for the start of component tags
          if (text.includes('[COMPONENT:') || text.includes('[COMPONENT')) {
            
            // Check if we have mixed complete and incomplete components
            const structuredParts = parseStructuredResponse(text);
            const hasCompleteComponents = structuredParts.some(p => p.type === "custom-component");
            
            if (hasCompleteComponents) {
              // We have complete components, but check if there's also an incomplete one at the end
              hasComponents = true;
              
              // Find the last complete component's end position
              const lastComponentEnd = text.lastIndexOf('[/COMPONENT]');
              
              if (lastComponentEnd !== -1) {
                const remainingText = text.substring(lastComponentEnd + '[/COMPONENT]'.length);
                
                // Check if remaining text has a new incomplete component
                if (remainingText.includes('[COMPONENT:')) {
                  const partialTagRegex = /\[COMPONENT:(\w+)/g;
                  const partialMatch = partialTagRegex.exec(remainingText);
                  
                  if (partialMatch && partialMatch[1]) {
                    // Parse only the text up to the last complete component
                    const textUpToLastComponent = text.substring(0, lastComponentEnd + '[/COMPONENT]'.length);
                    const completeOnlyParts = parseStructuredResponse(textUpToLastComponent);
                    newParts.push(...completeOnlyParts);
                    
                    // Add text between last component and new incomplete component (if any)
                    const componentStartInRemaining = remainingText.indexOf('[COMPONENT:');
                    const textBetween = remainingText.substring(0, componentStartInRemaining).trim();
                    if (textBetween) {
                      newParts.push({ type: "text", text: textBetween, status: { type: "complete", reason: "unknown" } });
                    }
                    
                    // Then add loading component for the incomplete one
                    pendingComponent = {
                      componentName: partialMatch[1],
                      buffer: text
                    };
                    
                    newParts.push({
                      type: "custom-component",
                      componentName: partialMatch[1],
                      props: {},
                      originalText: undefined,
                      status: { type: "running" }
                    });
                  } else {
                    // Just complete components
                    newParts.push(...structuredParts);
                    pendingComponent = null;
                  }
                } else {
                  // Just complete components
                  newParts.push(...structuredParts);
                  pendingComponent = null;
                }
              } else {
                // Just complete components
                newParts.push(...structuredParts);
                pendingComponent = null;
              }
            } else {
              // Incomplete component - check if we can extract component name
              const partialTagRegex = /\[COMPONENT:(\w+)/g;
              const partialMatch = partialTagRegex.exec(text);
              
              if (partialMatch && partialMatch[1]) {
                // We have at least the component name
                hasComponents = true;
                
                // Store pending component info
                pendingComponent = {
                  componentName: partialMatch[1],
                  buffer: text
                };
                
                // Add text before the component tag
                const beforeComponent = text.substring(0, partialMatch.index);
                if (beforeComponent.trim()) {
                  newParts.push({ type: "text", text: beforeComponent, status: { type: "complete", reason: "unknown" } });
                }
                
                // Add loading component
                newParts.push({
                  type: "custom-component",
                  componentName: partialMatch[1],
                  props: {}, // Empty props - will show loading
                  originalText: undefined,
                  status: { type: "running" }
                });
                
                // Don't add the remaining text since it's part of the component
              } else if (text.includes('[COMPONENT')) {
                // Very early detection - just "[COMPONENT"
                hasComponents = true;
                
                // Add text before the component start
                const beforeComponent = text.substring(0, text.indexOf('[COMPONENT'));
                if (beforeComponent.trim()) {
                  newParts.push({ type: "text", text: beforeComponent, status: { type: "complete", reason: "unknown" } });
                }
                
                // Add generic loading component
                newParts.push({
                  type: "custom-component",
                  componentName: "loading", // Generic loading component
                  props: {}, // Empty props - will show loading
                  originalText: undefined,
                  status: { type: "running" }
                });
                
                pendingComponent = {
                  componentName: "loading",
                  buffer: text
                };
              }
            }
          } else if (pendingComponent && text.includes('[/COMPONENT]')) {
            // We had a pending component and now we see the closing tag
            hasComponents = true;
            
            // Try to parse the complete component from the combined buffer
            const completeText = pendingComponent.buffer + text;
            const structuredParts = parseStructuredResponse(completeText);
            
            if (structuredParts.length > 0 && structuredParts.some(p => p.type === "custom-component")) {
              // Successfully parsed complete component
              newParts.push(...structuredParts);
            } else {
              // Failed to parse, keep as text
              newParts.push({ type: "text", text: completeText, status: { type: "complete", reason: "unknown" } });
            }
            
            pendingComponent = null;
          } else {
            // No component indicators, keep as text
            newParts.push(part);
          }
        } else {
          // Keep non-text parts unchanged
          newParts.push(part);
        }
      }

      if (hasComponents) {
        const updatedMessage = {
          ...message,
          parts: newParts,
          content: newParts,
        };
        
        controller.enqueue(updatedMessage as AssistantMessage);
      } else {
        // No components found, pass through unchanged
        controller.enqueue(message);
      }
    }
  });
}