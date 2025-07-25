'use client'

import { useEffect } from "react";
import { AssistantComponentProps } from "./makeAssistantComponent";
import { useComponentsStore } from "../context/react/AssistantContext";

// Registration hook (mirrors useAssistantToolUI exactly)
export const useAssistantComponent = (
  component: AssistantComponentProps<any> | null,
) => {
  const componentsStore = useComponentsStore();
  
  useEffect(() => {
    if (!component?.componentName || !component?.render) return;
    
    // Register component with store and return cleanup function
    return componentsStore.getState().setComponent(
      component.componentName, 
      component.render
    );
  }, [componentsStore, component?.componentName, component?.render]);
};