import { create } from "zustand";
import { ComponentType } from "react";

// Props that custom components receive (mirrors ToolCallMessagePartProps pattern)
export type CustomComponentMessagePartProps<TProps = any> = {
  componentName: string;
  props: TProps;
  status?: { 
    type: "rendering" | "complete" | "error"; 
    error?: string 
  };
  originalText?: string | undefined; // Fallback text if component fails
};

// Component type definition (mirrors ToolCallMessagePartComponent)
export type CustomComponentMessagePartComponent<TProps = any> = 
  ComponentType<CustomComponentMessagePartProps<TProps>>;

// Store state interface (mirrors AssistantToolUIsState)
type AssistantComponentsState = {
  getComponent: (name: string) => CustomComponentMessagePartComponent | null;
  setComponent: (
    name: string, 
    render: CustomComponentMessagePartComponent
  ) => () => void;
};

// Store factory (mirrors makeAssistantToolUIsStore exactly)
export const makeAssistantComponentsStore = () =>
  create<AssistantComponentsState>((set) => {
    const renderers = new Map<string, CustomComponentMessagePartComponent[]>();

    return {
      getComponent: (name) => {
        const arr = renderers.get(name);
        return arr?.at(-1) ?? null; // Last registered wins (allows overrides)
      },
      
      setComponent: (name, render) => {
        let arr = renderers.get(name);
        if (!arr) {
          arr = [];
          renderers.set(name, arr);
        }
        arr.push(render);
        set({}); // Notify listeners

        // Return unsubscribe function
        return () => {
          const index = arr.indexOf(render);
          if (index !== -1) {
            arr.splice(index, 1);
          }
          if (index === arr.length) {
            set({}); // Notify if we removed the active component
          }
        };
      },
    };
  });

// Store instance type
export type AssistantComponentsStore = ReturnType<typeof makeAssistantComponentsStore>;