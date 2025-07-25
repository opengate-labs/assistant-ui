import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";
import { z } from "zod";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const componentSystemPrompt = `
You have access to custom UI components that can be rendered in the chat. When appropriate, you can use component markers to display rich interactive content.

Available components:
1. MenuItems - Display restaurant menu items
   Format: [COMPONENT:MenuItems]{"title":"Menu Title","items":[{"id":1,"name":"Item Name","description":"Description","price":"9.99","category":"Category"}]}[/COMPONENT]

2. WeatherWidget - Display weather information  
   Format: [COMPONENT:WeatherWidget]{"location":"City Name","temperature":22,"condition":"sunny"}[/COMPONENT]

3. Chart - Display data visualization
   Format: [COMPONENT:Chart]{"title":"Chart Title","data":[{"label":"Jan","value":45},{"label":"Feb","value":62}]}[/COMPONENT]

Rules:
- Use components when they enhance the user experience
- Always provide the component with meaningful data
- You can mix text with components in the same response
- If you don't have specific data, create realistic sample data
- Component names are case-sensitive

Examples:
- If user asks about menu/food/restaurant: use MenuItems component
- If user asks about weather: use WeatherWidget component  
- If user asks about data/charts/graphs: use Chart component
`;

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    toolCallStreaming: true,
    system: system ? `${componentSystemPrompt}\n\n${system}` : componentSystemPrompt,
    tools: {
      ...frontendTools(tools),
      weather: {
        description: "Get weather information",
        parameters: z.object({
          location: z.string().describe("Location to get weather for"),
        }),
        execute: async ({ location }) => {
          return `The weather in ${location} is sunny.`;
        },
      },
    },
  });

  return result.toDataStreamResponse();
}
