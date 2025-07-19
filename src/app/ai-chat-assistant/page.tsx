import Chat from "./components/Chat";

export const metadata = {
  title: "AI Chat Assistant",
  description: "Chat with our AI assistant about feed data",
};

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4">
      <h1 className="text-2xl font-bold mb-4">AI Chat Assistant</h1>
      <div className="flex-1">
        <Chat className="h-full" />
      </div>
    </div>
  );
}
