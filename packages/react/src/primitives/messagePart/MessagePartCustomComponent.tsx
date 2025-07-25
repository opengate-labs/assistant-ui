"use client";

import { ComponentType } from "react";
import { CustomComponentMessagePartProps } from "../../context/stores/AssistantComponents";
import { useComponents } from "../../context/react/AssistantContext";
// No need to import MessagePartPrimitiveText, we'll use simple p element like MessageParts does
import { useMessagePart } from "./useMessagePartCustomComponent";

// Display component for custom components (mirrors ToolUIDisplay pattern)
const CustomComponentDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: ComponentType<CustomComponentMessagePartProps> | undefined;
} & CustomComponentMessagePartProps) => {
  const Render = useComponents((s) => s.getComponent(props.componentName)) ?? Fallback;
  
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

/**
 * Renders a custom component message part.
 * This component looks up the registered component by name and renders it,
 * falling back to the original text if the component is not found.
 */
export const MessagePartCustomComponent = ({
  Fallback,
}: {
  Fallback?: ComponentType<CustomComponentMessagePartProps>;
}) => {
  const part = useMessagePart();
  
  if (part.type !== "custom-component") {
    throw new Error("MessagePartCustomComponent can only be used with custom-component message parts");
  }
  
  return (
    <CustomComponentDisplay
      componentName={part.componentName}
      props={part.props}
      originalText={part.originalText}
      status={{ type: "complete" }}
      Fallback={Fallback}
    />
  );
};