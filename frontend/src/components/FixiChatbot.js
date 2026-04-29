import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { X, Send, User, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../context/LanguageContext";

const defaultSuggestions = [
  "How do I report an issue?",
  "Give me a civic awareness tip",
  "What can I do in the community hub?",
];

const FixiChatbot = () => {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", content: t.chatbotGreeting }
  ]);
  const [suggestions, setSuggestions] = useState(defaultSuggestions);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length) return [{ role: "bot", content: t.chatbotGreeting }];
      const [first, ...rest] = prev;
      if (first.role !== "bot") return prev;
      return [{ ...first, content: t.chatbotGreeting }, ...rest];
    });
  }, [t.chatbotGreeting]);

  useEffect(() => {
    setSuggestions(defaultSuggestions);
  }, [t.chatbotGreeting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const sendMessage = async (messageOverride = null) => {
    const userMessage = (messageOverride ?? input).trim();
    if (!userMessage || loading) return;

    if (!messageOverride) {
      setInput("");
    }
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post("/chat", {
        message: userMessage,
        session_id: sessionId,
        history: messages.slice(-6).map((msg) => ({
          role: msg.role === "bot" ? "assistant" : "user",
          content: msg.content,
        })),
      });
      
      setSessionId(response.data.session_id);
      setMessages(prev => [...prev, { role: "bot", content: response.data.response }]);
      setSuggestions(
        Array.isArray(response.data.suggestions) && response.data.suggestions.length
          ? response.data.suggestions
          : defaultSuggestions
      );
    } catch (error) {
      toast.error("Failed to send message");
      setMessages(prev => [...prev, { role: "bot", content: "Sorry, I'm having trouble responding. Please try again!" }]);
      setSuggestions(defaultSuggestions);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    if (loading) return;
    await sendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ");
      setInput(transcript.trim());
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      toast.error("Could not capture voice input");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixi-launcher fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-full bg-white px-4 py-3 shadow-xl shadow-slate-900/20 ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-2xl ${isOpen ? 'hidden' : ''}`}
        data-testid="fixi-chat-btn"
      >
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
          <img
            src="/images/Fixi.png"
            alt="Fixi AI"
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-green-500 animate-pulse" />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-slate-900">{t.chatbotTitle}</p>
        </div>
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
                  <h3 className="font-semibold text-slate-900">{t.chatbotTitle}</h3>
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

          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.chatbotPlaceholder}
                className="flex-1 rounded-full border-slate-200 bg-slate-50 focus:border-slate-400"
                disabled={loading}
                data-testid="fixi-input"
              />
              <Button
                onClick={toggleVoiceInput}
                type="button"
                variant="outline"
                className={`h-10 w-10 rounded-full p-0 ${isRecording ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" : ""}`}
                disabled={loading}
                title={isRecording ? "Stop recording" : "Use voice input"}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
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
