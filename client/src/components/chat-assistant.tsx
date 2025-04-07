import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message } from "@shared/schema";
import { Send, MessageSquare, X } from "lucide-react";

export default function ChatAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        content,
        isBot: false
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessageText("");
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !user) return;
    sendMessageMutation.mutate(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Suggestion chip click handler
  const handleSuggestionClick = (suggestion: string) => {
    setMessageText(suggestion);
    sendMessageMutation.mutate(suggestion);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Collapsed Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-full w-14 h-14 shadow-lg flex items-center justify-center transition-colors ${
          isOpen ? "bg-secondary hover:bg-secondary/90" : "bg-primary hover:bg-primary/90"
        }`}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="chat-transition bg-white rounded-lg shadow-lg w-80 sm:w-96 h-[500px] max-h-[80vh] flex flex-col overflow-hidden absolute bottom-16 right-0 animate-slide-up">
          {/* Chat Header */}
          <div className="bg-primary text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-sm">PGF Assistant</h3>
                <p className="text-xs text-green-200">Online</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-primary/80 rounded p-1 h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!user ? (
              <div className="max-w-[80%] bg-gray-100 rounded-t-lg rounded-br-lg p-3 text-sm">
                <p>Please log in to use the chat assistant.</p>
              </div>
            ) : messages.length === 0 ? (
              <>
                <div className="max-w-[80%] bg-gray-100 rounded-t-lg rounded-br-lg p-3 text-sm">
                  <p>Hello! I'm your PGF Assistant. How can I help you today?</p>
                </div>
                <div className="max-w-[80%] bg-gray-100 rounded-t-lg rounded-br-lg p-3 text-sm">
                  <p>I can help you with:</p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Medication reminders</li>
                    <li>Checking for drug interactions</li>
                    <li>Refill notifications</li>
                    <li>Side effect information</li>
                  </ul>
                </div>
              </>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id}
                  className={`max-w-[80%] ${
                    message.isBot 
                      ? "bg-gray-100 rounded-t-lg rounded-br-lg" 
                      : "bg-primary text-white rounded-t-lg rounded-bl-lg ml-auto"
                  } p-3 text-sm`}
                >
                  <p>{message.content}</p>
                  
                  {/* Suggestion chips for bot messages about refills */}
                  {message.isBot && message.content.includes("refill") && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button 
                        onClick={() => handleSuggestionClick("Yes, please send a refill request")}
                        className="bg-white border border-gray-300 hover:bg-gray-100 rounded-full px-3 py-1 text-xs"
                      >
                        Send refill request
                      </button>
                      <button 
                        onClick={() => handleSuggestionClick("Show me nearby pharmacies")}
                        className="bg-white border border-gray-300 hover:bg-gray-100 rounded-full px-3 py-1 text-xs"
                      >
                        Show nearby pharmacies
                      </button>
                      <button 
                        onClick={() => handleSuggestionClick("Check my insurance coverage")}
                        className="bg-white border border-gray-300 hover:bg-gray-100 rounded-full px-3 py-1 text-xs"
                      >
                        Check insurance coverage
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!user || sendMessageMutation.isPending}
                className="flex-1 px-3 py-2 rounded-full"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!user || !messageText.trim() || sendMessageMutation.isPending}
                className="bg-primary text-white rounded-full w-10 h-10 p-0 flex items-center justify-center"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
