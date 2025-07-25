import {
  getExternalStoreMessages,
  type ThreadMessage,
} from "@opengate-labs/assistant-ui-react";
import type { Message } from "@ai-sdk/ui-utils";

export const getVercelAIMessages = (message: ThreadMessage) => {
  return getExternalStoreMessages(message) as Message[];
};
