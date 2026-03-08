import { useState, useEffect, useRef } from "react";
import { useConversations, useMessages, useSendMessage, useGetOrCreateConversation } from "@/hooks/use-chats";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, TimeAgo, isOnline, LinkedText } from "@/components/ui/shared";
import { Send, MessageSquare, Lock, ShieldAlert } from "lucide-react";
import { useSearch, useLocation } from "wouter";

export default function ChatsPage() {
  const { data: conversations, isLoading } = useConversations();
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultConvId = params.get("conv");
  const [activeConvId, setActiveConvId] = useState<string | null>(defaultConvId);

  useEffect(() => {
    if (defaultConvId) setActiveConvId(defaultConvId);
  }, [defaultConvId]);

  if (isLoading) return <div className="text-center py-10">Loading chats...</div>;

  return (
    <div className="max-w-6xl mx-auto bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden flex h-[calc(100vh-8rem)]">
      <div className={`w-full md:w-80 border-r border-border flex flex-col ${activeConvId ? "hidden md:flex" : "flex"}`}>
        <div className="p-5 border-b border-border">
          <h2 className="text-2xl font-display font-bold">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {(!conversations || conversations.length === 0) ? (
            <div className="text-center py-14 text-muted-foreground px-4 space-y-3">
              <MessageSquare className="w-12 h-12 mx-auto opacity-25" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-xs">Accept a friend request to start chatting!</p>
            </div>
          ) : (
            conversations.map((conv: any) => {
              const isActive = activeConvId === conv.id;
              const hasUnread = conv.unreadCount > 0;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : hasUnread
                        ? "bg-primary/8 hover:bg-primary/15 border border-primary/20"
                        : "hover:bg-secondary"
                  }`}
                  data-testid={`conv-item-${conv.id}`}
                >
                  <div className="relative shrink-0">
                    <Avatar url={conv.otherUser?.profilePicture} name={conv.otherUser?.name || "U"} online={isOnline(conv.otherUser?.lastSeen)} />
                    {hasUnread && !isActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold truncate ${hasUnread && !isActive ? "text-primary" : ""}`}>
                      {conv.otherUser?.name}
                    </div>
                    <div className={`text-xs truncate ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {conv.lastMessage || `@${conv.otherUser?.username}`}
                    </div>
                  </div>
                  {hasUnread && !isActive && (
                    <span className="shrink-0 text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-background ${!activeConvId ? "hidden md:flex" : "flex"}`}>
        {activeConvId ? (
          <ActiveChat
            conversationId={activeConvId}
            conversations={conversations || []}
            currentUserId={user?.id}
            onBack={() => setActiveConvId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Your Messages</h3>
            <p className="text-sm">Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveChat({
  conversationId,
  conversations,
  currentUserId,
  onBack,
}: {
  conversationId: string;
  conversations: any[];
  currentUserId?: string;
  onBack: () => void;
}) {
  const { data: messages, refetch } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const [content, setContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const { user: currentUser } = useAuth();
  const conv = conversations.find((c: any) => c.id === conversationId);
  const otherUser = conv?.otherUser;
  const isAdminChat = !!conv?.isAdminChat;
  const canReply = !isAdminChat || !!currentUser?.isAdmin;

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
        {isAdminChat ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-md text-sm shrink-0">
              NX
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                NX-Connect
                <span className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold border border-primary/20">ADMIN</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Read-only — no replies</div>
            </div>
          </div>
        ) : otherUser ? (
          <button
            onClick={() => setLocation(`/profile/${otherUser.id || otherUser._id}`)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity rounded-xl px-1 py-0.5"
            data-testid={`button-chat-view-profile-${otherUser.id || otherUser._id}`}
          >
            <Avatar url={otherUser.profilePicture} name={otherUser.name || "U"} size="sm" online={isOnline(otherUser?.lastSeen)} />
            <div className="text-left">
              <div className="font-bold hover:text-primary transition-colors">{otherUser.name}</div>
              <div className="text-xs text-muted-foreground">@{otherUser.username} · tap to view profile</div>
            </div>
          </button>
        ) : (
          <div className="font-bold text-lg">Conversation</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages?.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Say hello! Start the conversation.</p>
          </div>
        )}
        {messages?.map(msg => {
          if (msg.isSystem || msg.content.startsWith('🎉')) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-xs text-muted-foreground/60 italic bg-muted/30 px-4 py-1.5 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                isMe ? "bg-primary text-white rounded-br-sm" : "bg-card border border-border/50 text-foreground rounded-bl-sm"
              }`}>
                <LinkedText
                  text={msg.content}
                  linkClassName={isMe ? "text-white underline underline-offset-2 hover:no-underline break-all opacity-90" : "text-primary underline underline-offset-2 hover:no-underline break-all"}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 mx-1">
                <TimeAgo date={msg.createdAt!} />
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {canReply ? (
        <div className="p-4 bg-card border-t border-border">
          <form onSubmit={handleSend} className="flex items-center gap-3 bg-secondary rounded-full px-4 py-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none outline-none text-foreground py-2"
              data-testid="input-message"
            />
            <button
              type="submit"
              disabled={!content.trim() || sendMessage.isPending}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform shadow-md"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-card border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Lock className="w-4 h-4" />
          <span>This is a read-only message from NX-Connect. Replies are not allowed.</span>
        </div>
      )}
    </>
  );
}
