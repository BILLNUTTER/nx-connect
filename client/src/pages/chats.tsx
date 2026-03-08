import { useState, useEffect, useRef } from "react";
import { useConversations, useMessages, useSendMessage, useGetOrCreateConversation } from "@/hooks/use-chats";
import { useFriends } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, TimeAgo } from "@/components/ui/shared";
import { Send, MessageSquare, Users } from "lucide-react";
import { useSearch } from "wouter";

export default function ChatsPage() {
  const { data: conversations, isLoading: convsLoading } = useConversations();
  const { data: friends } = useFriends();
  const { user } = useAuth();
  const getOrCreate = useGetOrCreateConversation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultConvId = params.get("conv");

  const [activeConvId, setActiveConvId] = useState<string | null>(defaultConvId);
  const [tab, setTab] = useState<"chats" | "friends">("chats");

  useEffect(() => {
    if (defaultConvId) setActiveConvId(defaultConvId);
  }, [defaultConvId]);

  const startChat = async (friendId: string) => {
    const conv = await getOrCreate.mutateAsync(friendId);
    setActiveConvId(conv.id);
    setTab("chats");
  };

  const existingParticipants = new Set(
    (conversations || []).flatMap((c: any) => c.participants || [])
  );

  const friendsWithoutChat = (friends || []).filter((f: any) => {
    const fid = f.id || f._id;
    return !existingParticipants.has(fid) || true;
  });

  if (convsLoading) return <div className="text-center py-10">Loading chats...</div>;

  return (
    <div className="max-w-6xl mx-auto bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden flex h-[calc(100vh-8rem)]">
      <div className={`w-full md:w-80 border-r border-border flex flex-col ${activeConvId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-border">
          <h2 className="text-2xl font-display font-bold mb-3">Messages</h2>
          <div className="flex bg-secondary/50 rounded-xl p-1 gap-1">
            <button
              onClick={() => setTab("chats")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                tab === "chats" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              data-testid="tab-chats"
            >
              <MessageSquare className="w-4 h-4" /> Chats
            </button>
            <button
              onClick={() => setTab("friends")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                tab === "friends" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              data-testid="tab-friends"
            >
              <Users className="w-4 h-4" /> Friends
              {friends && friends.length > 0 && (
                <span className="w-4 h-4 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                  {friends.length > 9 ? "9+" : friends.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tab === "chats" ? (
            <>
              {(!conversations || conversations.length === 0) ? (
                <div className="text-center py-10 text-muted-foreground px-4 space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm">No conversations yet.</p>
                  <p className="text-xs">Switch to Friends tab to start a chat!</p>
                </div>
              ) : (
                conversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      activeConvId === conv.id
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "hover:bg-secondary"
                    }`}
                    data-testid={`conv-item-${conv.id}`}
                  >
                    <Avatar url={conv.otherUser?.profilePicture} name={conv.otherUser?.name || "U"} />
                    <div className="text-left flex-1 overflow-hidden">
                      <div className="font-bold truncate">{conv.otherUser?.name}</div>
                      <div className={`text-xs truncate ${activeConvId === conv.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        @{conv.otherUser?.username}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </>
          ) : (
            <>
              {(!friends || friends.length === 0) ? (
                <div className="text-center py-10 text-muted-foreground px-4 space-y-2">
                  <Users className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm">No friends yet.</p>
                  <p className="text-xs">Add friends to start chatting!</p>
                </div>
              ) : (
                friends.map((friend: any) => {
                  const fid = friend.id || friend._id;
                  return (
                    <button
                      key={fid}
                      onClick={() => startChat(fid)}
                      disabled={getOrCreate.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-all"
                      data-testid={`friend-chat-${fid}`}
                    >
                      <Avatar url={friend.profilePicture} name={friend.name || "U"} />
                      <div className="text-left flex-1 overflow-hidden">
                        <div className="font-bold truncate">{friend.name}</div>
                        <div className="text-xs text-muted-foreground truncate">@{friend.username}</div>
                      </div>
                      <span className="text-xs text-primary font-semibold shrink-0">Chat →</span>
                    </button>
                  );
                })
              )}
            </>
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
            <p>Select a conversation or start a new chat.</p>
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
  const { data: messages } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const [content, setContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const conv = conversations.find((c: any) => c.id === conversationId);
  const otherUser = conv?.otherUser;

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
        {otherUser ? (
          <>
            <Avatar url={otherUser.profilePicture} name={otherUser.name || "U"} size="sm" />
            <div>
              <div className="font-bold">{otherUser.name}</div>
              <div className="text-xs text-muted-foreground">@{otherUser.username}</div>
            </div>
          </>
        ) : (
          <div className="font-bold text-lg">Conversation</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages?.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Say hello! Start the conversation.</p>
          </div>
        )}
        {messages?.map(msg => {
          const isMe = msg.senderId === currentUserId;
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
    </>
  );
}
