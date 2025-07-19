"use client";

import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { IFeed } from "@/types";
import DataGridTable from "@/app/dashboard/components/DataGridTable";
import TotalCard from "@/app/dashboard/components/TotalCard";

// Generate a random ID for thread tracking
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  feeds?: IFeed[];
}

interface ChatProps {
  className?: string;
}

export default function Chat({ className }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => generateId());
  const [currentFeeds, setCurrentFeeds] = useState<IFeed[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Schema for input validation
  const messageSchema = z.string().min(1, "Message cannot be empty").max(1000, "Message too long");

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      messageSchema.parse(input);
      
      // Add user message to chat
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: input,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      
      // Call the agent API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: input,
          thread_id: threadId,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to get response from agent");
      }
      
      const data = await response.json();
      
      // Extract text and feeds from the response
      const { text, feeds = [] } = data;
      
      // Update current feeds state
      setCurrentFeeds(feeds);
      
      // Add assistant message to chat
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: text,
        timestamp: new Date(),
        feeds: feeds,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      
      // Add error message
      if (error instanceof z.ZodError) {
        alert(error.format()._errors.join(', '));
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setThreadId(generateId());
  };

  return (
    <div className={`flex flex-col h-full max-w-6xl mx-auto ${className}`}>
      <div className="flex justify-between items-center mb-4 p-4 bg-white rounded-t-lg shadow">
        <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
        <button
          onClick={startNewChat}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          New Chat
        </button>
      </div>
      
      
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p>Ask a question about feed data</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === "user" ? "flex justify-end" : "flex justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none shadow"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white p-3 rounded-lg rounded-bl-none shadow">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
     
      <form onSubmit={handleSubmit} className="p-4 bg-white rounded-b-lg shadow">
        <div className="flex flex-col gap-2">
          {currentFeeds.length > 0 && (
            <div className="text-sm text-gray-500 mb-2">
              Found {currentFeeds.length} feed records. You can filter and explore them in the table above.
            </div>
          )}
          <div className="flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition disabled:bg-blue-300"
              disabled={isLoading}
            >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending
              </span>
            ) : (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </span>
            )}
          </button>
          </div>
          
          {/* Data Grid for displaying feed records */}
          <div className="mt-10 pt-4 space-y-6 border-t border-gray-200">
            {currentFeeds.length > 0 && (
              <div className="mb-4">
                <TotalCard 
                  totalRecords={currentFeeds.length} 
                  isFiltered={false} 
                />
              </div>
            )}
            
            {currentFeeds.length > 0 && (
              <div className="mb-4 mt-6">
                <DataGridTable 
                  feeds={currentFeeds} 
                  title="Feed Records" 
                  description="Data retrieved from your query"
                  enableFiltering={true}
                  enableExport={true}
                />
              </div>
            )}
          </div>
          
        </div>
      </form>
    </div>
  );
}