import { FC } from "react";
import { CustomComponentMessagePartComponent } from "../context/stores/AssistantComponents";
import { useAssistantComponent } from "./useAssistantComponent";

// Props for component definition (mirrors AssistantToolUIProps pattern)
export type AssistantComponentProps<TProps = any> = {
  componentName: string;
  render: CustomComponentMessagePartComponent<TProps>;
};

// Component type with metadata (mirrors AssistantToolUI)
export type AssistantComponent = FC & {
  unstable_component: AssistantComponentProps;
};

// Factory function (mirrors makeAssistantToolUI exactly)
export const makeAssistantComponent = <TProps,>(
  component: AssistantComponentProps<TProps>,
): AssistantComponent => {
  const Component: AssistantComponent = () => {
    // Self-registration happens here
    useAssistantComponent(component);
    return null; // Component renders nothing - purely for registration
  };
  
  // Attach metadata to component (same pattern as tool UI)
  Component.unstable_component = component;
  return Component;
};