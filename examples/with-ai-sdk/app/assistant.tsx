"use client";

import { AssistantRuntimeProvider, makeAssistantComponent } from "@opengate-labs/assistant-ui-react";
import { Thread } from "@/components/assistant-ui/thread";
import { useChatRuntime } from "@opengate-labs/assistant-ui-react-ai-sdk";

// Example Menu Component
const MenuItemsComponent = makeAssistantComponent({
  componentName: "MenuItems",
  render: ({ props, status }) => {
    if (status?.type === "rendering") {
      return (
        <div className="animate-pulse border rounded-lg p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 my-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          {props.title || "Menu Items"}
        </h3>
        <div className="grid gap-3">
          {props.items?.map((item: any, index: number) => (
            <div key={item.id || index} className="flex justify-between items-center bg-white rounded-md p-3 shadow-sm">
              <div>
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-green-600">
                  ${item.price}
                </span>
                {item.category && (
                  <div className="text-xs text-gray-500">{item.category}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
});

// Weather Widget Component
const WeatherWidget = makeAssistantComponent({
  componentName: "WeatherWidget", 
  render: ({ props }) => (
    <div className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50 my-2">
      <div className="flex items-center space-x-4">
        <div className="text-4xl">
          {props.condition === "sunny" ? "☀️" : 
           props.condition === "cloudy" ? "☁️" : 
           props.condition === "rainy" ? "🌧️" : "🌤️"}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Weather in {props.location}
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {props.temperature}°C
          </p>
          <p className="text-sm text-gray-600 capitalize">
            {props.condition}
          </p>
        </div>
      </div>
    </div>
  )
});

// Simple Chart Component
const ChartComponent = makeAssistantComponent({
  componentName: "Chart",
  render: ({ props }) => (
    <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50 my-2">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        {props.title || "Chart"}
      </h3>
      <div className="space-y-2">
        {props.data?.map((item: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <span className="text-sm font-medium w-20 text-gray-700">
              {item.label}:
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
              <div 
                className="bg-purple-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${(item.value / Math.max(...props.data.map((d: any) => d.value))) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 w-12">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
});

export const Assistant = () => {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Register custom components by rendering them */}
      <MenuItemsComponent />
      <WeatherWidget />
      <ChartComponent />
      
      <div className="grid h-dvh gap-x-2 px-4 py-4">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
