import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { X, Send, User } from "lucide-react";
import { toast } from "sonner";

const FixiChatbot = () => {
  const { api } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi! I'm Fixi, your friendly AI assistant. How can I help you today? I can guide you on reporting issues, explain how Fixify works, or share civic awareness tips!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post("/chat", {
        message: userMessage,
        session_id: sessionId
      });
      
      setSessionId(response.data.session_id);
      setMessages(prev => [...prev, { role: "bot", content: response.data.response }]);
    } catch (error) {
      toast.error("Failed to send message");
      setMessages(prev => [...prev, { role: "bot", content: "Sorry, I'm having trouble responding. Please try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl shadow-slate-900/15 ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-2xl ${isOpen ? 'hidden' : ''}`}
        data-testid="fixi-chat-btn"
      >
        <img
          src="/images/Fixi.png"
          alt="Fixi AI"
          className="h-9 w-9 rounded-full object-cover"
        />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 animate-fade-in" data-testid="fixi-chat-window">
          {/* Header */}
          <div className="border-b border-slate-200 bg-white px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/Fixi.png"
                  alt="Fixi AI"
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                />
                <div>
                  <h3 className="font-semibold text-slate-900">Fixi AI</h3>
                  <p className="text-xs text-slate-500">Civic reporting assistant</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setIsOpen(false)}
                data-testid="fixi-close-btn"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="h-[360px] bg-slate-50/70 px-4 py-4" ref={scrollRef}>
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" 
                      ? "bg-slate-200 text-slate-700" 
                      : "bg-white ring-1 ring-slate-200"
                  }`}>
                    {msg.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <img
                        src="/images/Fixi.png"
                        alt="Fixi AI"
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white rounded-br-sm"
                      : "bg-white text-slate-700 rounded-bl-sm ring-1 ring-slate-200"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <img
                    src="/images/Fixi.png"
                    alt="Fixi AI"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-slate-200">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about reports, categories, maps..."
                className="flex-1 rounded-full border-slate-200 bg-slate-50 focus:border-slate-400"
                disabled={loading}
                data-testid="fixi-input"
              />
              <Button 
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="h-10 w-10 rounded-full bg-slate-900 p-0 hover:bg-slate-800"
                data-testid="fixi-send-btn"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FixiChatbot;
