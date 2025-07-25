"use client";

import {
  type ComponentType,
  type FC,
  memo,
  PropsWithChildren,
  useMemo,
} from "react";
import {
  TextMessagePartProvider,
  useMessagePart,
  useMessagePartRuntime,
  useToolUIs,
  useComponents,
} from "../../context";
import {
  useMessage,
  useMessageRuntime,
} from "../../context/react/MessageContext";
import { MessagePartRuntimeProvider } from "../../context/providers/MessagePartRuntimeProvider";
import { MessagePartPrimitiveText } from "../messagePart/MessagePartText";
import { MessagePartPrimitiveImage } from "../messagePart/MessagePartImage";
import { CustomComponentMessagePartProps } from "../../context/stores/AssistantComponents";
import { parseComponentMarkers, hasComponentMarkers } from "../../utils/parseComponentMarkers";
import { useMessagePartText } from "../messagePart/useMessagePartText";
import type {
  Unstable_AudioMessagePartComponent,
  EmptyMessagePartComponent,
  TextMessagePartComponent,
  ImageMessagePartComponent,
  SourceMessagePartComponent,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  FileMessagePartComponent,
  ReasoningMessagePartComponent,
} from "../../types/MessagePartComponentTypes";
import { MessagePartPrimitiveInProgress } from "../messagePart/MessagePartInProgress";
import { MessagePartStatus } from "../../types/AssistantTypes";
import { useShallow } from "zustand/shallow";

type MessagePartRange =
  | { type: "single"; index: number }
  | { type: "toolGroup"; startIndex: number; endIndex: number };

/**
 * Groups consecutive tool-call message parts into ranges.
 * Always groups tool calls, even if there's only one.
 */
const groupMessageParts = (
  messageTypes: readonly string[],
): MessagePartRange[] => {
  const ranges: MessagePartRange[] = [];
  let currentToolGroupStart = -1;

  for (let i = 0; i < messageTypes.length; i++) {
    const type = messageTypes[i];

    if (type === "tool-call") {
      // Start a new tool group if we haven't started one
      if (currentToolGroupStart === -1) {
        currentToolGroupStart = i;
      }
    } else {
      // End current tool group if it exists
      if (currentToolGroupStart !== -1) {
        ranges.push({
          type: "toolGroup",
          startIndex: currentToolGroupStart,
          endIndex: i - 1,
        });
        currentToolGroupStart = -1;
      }

      // Add non-tool-call part individually
      ranges.push({ type: "single", index: i });
    }
  }

  // Handle any remaining tool group at the end
  if (currentToolGroupStart !== -1) {
    ranges.push({
      type: "toolGroup",
      startIndex: currentToolGroupStart,
      endIndex: messageTypes.length - 1,
    });
  }

  return ranges;
};

const useMessagePartsGroups = (): MessagePartRange[] => {
  const messageTypes = useMessage(
    useShallow((m) => m.content.map((c) => c.type)),
  );

  return useMemo(() => {
    if (messageTypes.length === 0) {
      return [];
    }
    return groupMessageParts(messageTypes);
  }, [messageTypes]);
};

export namespace MessagePrimitiveParts {
  export type Props = {
    /**
     * Component configuration for rendering different types of message content.
     *
     * You can provide custom components for each content type (text, image, file, etc.)
     * and configure tool rendering behavior. If not provided, default components will be used.
     */
    components?:
      | {
          /** Component for rendering empty messages */
          Empty?: EmptyMessagePartComponent | undefined;
          /** Component for rendering text content */
          Text?: TextMessagePartComponent | undefined;
          /** Component for rendering reasoning content (typically hidden) */
          Reasoning?: ReasoningMessagePartComponent | undefined;
          /** Component for rendering source content */
          Source?: SourceMessagePartComponent | undefined;
          /** Component for rendering image content */
          Image?: ImageMessagePartComponent | undefined;
          /** Component for rendering file content */
          File?: FileMessagePartComponent | undefined;
          /** Component for rendering audio content (experimental) */
          Unstable_Audio?: Unstable_AudioMessagePartComponent | undefined;
          /** Configuration for tool call rendering */
          tools?:
            | {
                /** Map of tool names to their specific components */
                by_name?:
                  | Record<string, ToolCallMessagePartComponent | undefined>
                  | undefined;
                /** Fallback component for unregistered tools */
                Fallback?: ComponentType<ToolCallMessagePartProps> | undefined;
              }
            | {
                /** Override component that handles all tool calls */
                Override: ComponentType<ToolCallMessagePartProps>;
              }
            | undefined;

          /**
           * Component for rendering grouped consecutive tool calls.
           *
           * When provided, this component will automatically wrap consecutive tool-call
           * message parts, allowing you to create collapsible sections, custom styling,
           * or other grouped presentations for multiple tool calls.
           *
           * The component receives:
           * - `startIndex`: The index of the first tool call in the group
           * - `endIndex`: The index of the last tool call in the group
           * - `children`: The rendered tool call components
           *
           * @example
           * ```tsx
           * // Collapsible tool group
           * ToolGroup: ({ startIndex, endIndex, children }) => (
           *   <details className="tool-group">
           *     <summary>
           *       {endIndex - startIndex + 1} tool calls
           *     </summary>
           *     <div className="tool-group-content">
           *       {children}
           *     </div>
           *   </details>
           * )
           * ```
           *
           * @example
           * ```tsx
           * // Custom styled tool group with header
           * ToolGroup: ({ startIndex, endIndex, children }) => (
           *   <div className="border rounded-lg p-4 my-2">
           *     <div className="text-sm text-gray-600 mb-2">
           *       Tool execution #{startIndex + 1}-{endIndex + 1}
           *     </div>
           *     <div className="space-y-2">
           *       {children}
           *     </div>
           *   </div>
           * )
           * ```
           *
           * @param startIndex - Index of the first tool call in the group
           * @param endIndex - Index of the last tool call in the group
           * @param children - Rendered tool call components to display within the group
           *
           * @deprecated This feature is still experimental and subject to change.
           */
          ToolGroup?: ComponentType<
            PropsWithChildren<{ startIndex: number; endIndex: number }>
          >;
          /** Configuration for custom component rendering */
          custom_components?:
            | {
                /** Map of component names to their specific components */
                by_name?:
                  | Record<string, ComponentType<import("../../context/stores/AssistantComponents").CustomComponentMessagePartProps> | undefined>
                  | undefined;
                /** Fallback component for unregistered custom components */
                Fallback?: ComponentType<import("../../context/stores/AssistantComponents").CustomComponentMessagePartProps> | undefined;
              }
            | undefined;
        }
      | undefined;
  };
}

const ToolUIDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: ToolCallMessagePartComponent | undefined;
} & ToolCallMessagePartProps) => {
  const Render = useToolUIs((s) => s.getToolUI(props.toolName)) ?? Fallback;
  if (!Render) return null;
  return <Render {...props} />;
};

const CustomComponentDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: ComponentType<CustomComponentMessagePartProps> | undefined;
} & CustomComponentMessagePartProps) => {
  const Render = useComponents((s:any) => s.getComponent(props.componentName)) ?? Fallback;
  
  if (!Render) {
    // Fallback to original text if available and no component found
    if (props.originalText) {
      return (
        <p style={{ whiteSpace: "pre-line" }}>
          {props.originalText}
        </p>
      );
    }
    return null;
  }
  
  return <Render {...props} />;
};

// Enhanced Text component that detects and renders custom components
const EnhancedTextComponent = () => {
  const textPart = useMessagePartText();
  const messagePart = useMessagePart(); // Get the full message part for status
  // useMessagePartText() already validates it's text/reasoning and has .text property
  const text = (textPart as any).text;
  const status = (messagePart as any).status;
  
  // Map message part status to custom component status
  const componentStatus = status?.type === "running" 
    ? { type: "rendering" as const }
    : { type: "complete" as const };
  
  // Check if text contains component markers
  if (hasComponentMarkers(text)) {
    const parts = parseComponentMarkers(text);
    
    return (
      <div>
        {parts.map((part, index) => {
          if (part.type === "custom-component") {
            return (
              <CustomComponentDisplay
                key={index}
                componentName={part.componentName}
                props={part.props}
                originalText={part.originalText}
                status={componentStatus}
                Fallback={undefined}
              />
            );
          } else {
            // Regular text part - part here is from parseComponentMarkers
            return (
              <p key={index} style={{ whiteSpace: "pre-line" }}>
                {(part as any).text}
              </p>
            );
          }
        })}
        <MessagePartPrimitiveInProgress>
          <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
        </MessagePartPrimitiveInProgress>
      </div>
    );
  }
  
  // No component markers - render normally
  return (
    <p style={{ whiteSpace: "pre-line" }}>
      <MessagePartPrimitiveText />
      <MessagePartPrimitiveInProgress>
        <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
      </MessagePartPrimitiveInProgress>
    </p>
  );
};

// Simple text component for empty parts fallback (doesn't use custom component detection)
const SimpleTextComponent = () => (
  <p style={{ whiteSpace: "pre-line" }}>
    <MessagePartPrimitiveText />
    <MessagePartPrimitiveInProgress>
      <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
    </MessagePartPrimitiveInProgress>
  </p>
);

const defaultComponents = {
  Text: EnhancedTextComponent,
  Reasoning: EnhancedTextComponent, // Also use enhanced component for reasoning
  Source: () => null,
  Image: () => <MessagePartPrimitiveImage />,
  File: () => null,
  Unstable_Audio: () => null,
  ToolGroup: ({ children }) => children,
} satisfies MessagePrimitiveParts.Props["components"];

type MessagePartComponentProps = {
  components: MessagePrimitiveParts.Props["components"];
};

const MessagePartComponent: FC<MessagePartComponentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Reasoning = defaultComponents.Reasoning,
    Image = defaultComponents.Image,
    Source = defaultComponents.Source,
    File = defaultComponents.File,
    Unstable_Audio: Audio = defaultComponents.Unstable_Audio,
    tools = {},
    custom_components = {},
  } = {},
}) => {
  const MessagePartRuntime = useMessagePartRuntime();

  const part = useMessagePart();

  const type = part.type;
  
  // Debug all message parts
  if (type === "tool-call") {
    const addResult = (result: any) => MessagePartRuntime.addToolResult(result);
    if ("Override" in tools)
      return <tools.Override {...part} addResult={addResult} />;
    const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
    return <ToolUIDisplay {...part} Fallback={Tool} addResult={addResult} />;
  }

  if (type === "custom-component") {
    const CustomComponent = custom_components.by_name?.[part.componentName] ?? custom_components.Fallback;
    // Map message part status to custom component status
    const componentStatus = (part as any).status?.type === "running" 
      ? { type: "rendering" as const }
      : { type: "complete" as const };
    return (
      <CustomComponentDisplay 
        componentName={part.componentName}
        props={part.props}
        originalText={part.originalText}
        status={componentStatus}
        Fallback={CustomComponent}
      />
    );
  }

  if (part.status.type === "requires-action")
    throw new Error("Encountered unexpected requires-action status");

  switch (type) {
    case "text":
      return <Text {...part} />;

    case "reasoning":
      return <Reasoning {...part} />;

    case "source":
      return <Source {...part} />;

    case "image":
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image {...part} />;

    case "file":
      return <File {...part} />;

    case "audio":
      return <Audio {...part} />;

    default:
      const unhandledType: never = type;
      throw new Error(`Unknown message part type: ${unhandledType}`);
  }
};

type MessagePartProps = {
  partIndex: number;
  components: MessagePrimitiveParts.Props["components"];
};

const MessagePartImpl: FC<MessagePartProps> = ({ partIndex, components }) => {
  const messageRuntime = useMessageRuntime();
  const runtime = useMemo(
    () => messageRuntime.getMessagePartByIndex(partIndex),
    [messageRuntime, partIndex],
  );

  return (
    <MessagePartRuntimeProvider runtime={runtime}>
      <MessagePartComponent components={components} />
    </MessagePartRuntimeProvider>
  );
};

const MessagePart = memo(
  MessagePartImpl,
  (prev, next) =>
    prev.partIndex === next.partIndex &&
    prev.components?.Text === next.components?.Text &&
    prev.components?.Reasoning === next.components?.Reasoning &&
    prev.components?.Source === next.components?.Source &&
    prev.components?.Image === next.components?.Image &&
    prev.components?.File === next.components?.File &&
    prev.components?.Unstable_Audio === next.components?.Unstable_Audio &&
    prev.components?.tools === next.components?.tools &&
    prev.components?.ToolGroup === next.components?.ToolGroup,
);

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});

const EmptyPartFallback: FC<{
  status: MessagePartStatus;
  component: TextMessagePartComponent;
}> = ({ status, component: Component }) => {
  return (
    <TextMessagePartProvider text="" isRunning={status.type === "running"}>
      <Component type="text" text="" status={status} />
    </TextMessagePartProvider>
  );
};

const EmptyPartsImpl: FC<MessagePartComponentProps> = ({ components }) => {
  const status =
    useMessage((s) => s.status as MessagePartStatus) ?? COMPLETE_STATUS;

  if (components?.Empty) return <components.Empty status={status} />;

  return (
    <EmptyPartFallback
      status={status}
      component={components?.Text ?? SimpleTextComponent}
    />
  );
};

const EmptyParts = memo(
  EmptyPartsImpl,
  (prev, next) =>
    prev.components?.Empty === next.components?.Empty &&
    prev.components?.Text === next.components?.Text,
);

/**
 * Renders the parts of a message with support for multiple content types.
 *
 * This component automatically handles different types of message content including
 * text, images, files, tool calls, and more. It provides a flexible component
 * system for customizing how each content type is rendered.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Parts
 *   components={{
 *     Text: ({ text }) => <p className="message-text">{text}</p>,
 *     Image: ({ image }) => <img src={image} alt="Message image" />,
 *     tools: {
 *       by_name: {
 *         calculator: CalculatorTool,
 *         weather: WeatherTool,
 *       },
 *       Fallback: DefaultToolComponent
 *     }
 *   }}
 * />
 * ```
 */
export const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props> = ({
  components,
}) => {
  const contentLength = useMessage((s) => s.content.length);
  const messageRanges = useMessagePartsGroups();

  const partsElements = useMemo(() => {
    if (contentLength === 0) {
      return <EmptyParts components={components} />;
    }

    return messageRanges.map((range) => {
      if (range.type === "single") {
        return (
          <MessagePart
            key={range.index}
            partIndex={range.index}
            components={components}
          />
        );
      } else {
        const ToolGroupComponent =
          components!.ToolGroup ?? defaultComponents.ToolGroup;
        return (
          <ToolGroupComponent
            key={range.startIndex}
            startIndex={range.startIndex}
            endIndex={range.endIndex}
          >
            {Array.from(
              { length: range.endIndex - range.startIndex + 1 },
              (_, i) => (
                <MessagePart
                  key={i}
                  partIndex={range.startIndex + i}
                  components={components}
                />
              ),
            )}
          </ToolGroupComponent>
        );
      }
    });
  }, [messageRanges, components, contentLength]);

  return <>{partsElements}</>;
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";
