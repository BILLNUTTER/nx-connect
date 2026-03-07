import { useState, useEffect, useRef } from "react";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-chats";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, Card, TimeAgo } from "@/components/ui/shared";
import { Send, MessageSquare } from "lucide-react";

export default function ChatsPage() {
  const { data: conversations, isLoading: convsLoading } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  if (convsLoading) return <div className="text-center py-10">Loading chats...</div>;

  return (
    <div className="max-w-6xl mx-auto bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-border flex flex-col ${activeConvId ? "hidden md:flex" : "flex"}`}>
        <div className="p-5 border-b border-border">
          <h2 className="text-2xl font-display font-bold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations?.length === 0 && (
            <div className="text-center py-10 text-muted-foreground px-4">
              Add friends to start messaging!
            </div>
          )}
          {conversations?.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeConvId === conv.id ? "bg-primary text-white shadow-md shadow-primary/20" : "hover:bg-secondary"
              }`}
            >
              <Avatar url={conv.otherUser?.profilePicture} name={conv.otherUser?.name || "U"} />
              <div className="text-left flex-1 overflow-hidden">
                <div className="font-bold truncate">{conv.otherUser?.name}</div>
                <div className={`text-xs truncate ${activeConvId === conv.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  @{conv.otherUser?.username}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-background ${!activeConvId ? "hidden md:flex" : "flex"}`}>
        {activeConvId ? (
          <ActiveChat conversationId={activeConvId} onBack={() => setActiveConvId(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Your Messages</h3>
            <p>Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveChat({ conversationId, onBack }: { conversationId: string, onBack: () => void }) {
  const { data: messages } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;
    await sendMessage.mutateAsync({ conversationId, content });
    setContent("");
  };

  return (
    <>
      <div className="p-4 border-b border-border flex items-center gap-4 bg-card">
        <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground">
          ← Back
        </button>
        <div className="font-bold text-lg">Conversation</div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages?.map(msg => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
                isMe ? "bg-primary text-white rounded-br-sm" : "bg-card border border-border/50 text-foreground rounded-bl-sm"
              }`}>
                {msg.content}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 mx-1">
                <TimeAgo date={msg.createdAt!} />
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={handleSend} className="flex items-center gap-3 bg-secondary rounded-full px-4 py-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none text-foreground py-2"
          />
          <button 
            type="submit" 
            disabled={!content.trim() || sendMessage.isPending}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform shadow-md"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </>
  );
}
