import React, { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../services/api";
import type { ChatMessage } from "../services/api";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface ChatInterfaceProps {
  taskId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ taskId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message locally
    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await sendChatMessage(taskId, userMessage, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Could not retrieve answer from research context." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <Bot size={20} />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Interactive Company Agent</h3>
          <p className="text-[10px] text-slate-500">Grounded in scraped website intelligence</p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Bot size={36} className="text-slate-700 animate-bounce" />
            <p className="text-sm font-semibold text-slate-400">Ask anything about this company</p>
            <p className="text-xs text-slate-600 max-w-xs">
              "What are their primary pricing models?" or "Which key technologies were detected on their home page?"
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 max-w-[85%] ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-850 text-blue-400 border border-slate-800"
                }`}
              >
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-slate-950 text-slate-300 rounded-tl-none border border-slate-800/80"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-start gap-3 mr-auto">
            <div className="p-2 rounded-lg bg-slate-850 text-blue-400 border border-slate-800 shrink-0">
              <Bot size={16} />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950 text-slate-500 rounded-tl-none border border-slate-800/80 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="bg-slate-950 border-t border-slate-800 p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow up question..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all cursor-pointer shadow-lg shadow-blue-600/10"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
export default ChatInterface;
