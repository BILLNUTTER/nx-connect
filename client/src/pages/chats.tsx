import { useState, useEffect, useRef } from "react";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-chats";
import { useCreateGroup, useUpdateGroup, useRemoveGroupMember, useLeaveGroup, useGroupByToken, useJoinGroup } from "@/hooks/use-groups";
import { useFriends } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, TimeAgo, isOnline, LinkedText } from "@/components/ui/shared";
import { Send, MessageSquare, Lock, Users, Plus, Settings, X, Copy, Check, UserMinus, LogOut, Camera, ChevronLeft, Shield } from "lucide-react";
import { useSearch, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

async function compressImage(file: File, maxWidth = 400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function GroupAvatar({ photo, name, size = "md" }: { photo?: string; name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-12 h-12 text-base", lg: "w-16 h-16 text-xl" };
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (photo) return <img src={photo} alt={name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {initials || <Users className="w-4 h-4" />}
    </div>
  );
}

export default function ChatsPage() {
  const { data: conversations, isLoading } = useConversations();
  const { user } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(search);
  const defaultConvId = params.get("conv");
  const joinToken = params.get("join");
  const [activeConvId, setActiveConvId] = useState<string | null>(defaultConvId);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(!!joinToken);
  const { data: joinGroupInfo } = useGroupByToken(joinToken);
  const joinGroup = useJoinGroup();

  useEffect(() => {
    if (defaultConvId) setActiveConvId(defaultConvId);
  }, [defaultConvId]);

  useEffect(() => {
    if (joinToken) setShowJoinDialog(true);
  }, [joinToken]);

  const handleJoinGroup = async () => {
    if (!joinToken) return;
    try {
      const group = await joinGroup.mutateAsync(joinToken);
      setShowJoinDialog(false);
      setLocation('/chats');
      setActiveConvId(group.id);
      toast({ title: "Joined group!", description: `You're now in ${group.groupName}` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not join group", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Loading chats...</div>;

  return (
    <>
      <div className="flex overflow-hidden -m-4" style={{ height: "calc(100svh - 7rem)" }}>
        <div className={`w-full md:w-72 border-r border-border/60 flex flex-col bg-card shrink-0 ${activeConvId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-display font-bold">Messages</h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
              data-testid="button-new-group"
            >
              <Plus className="w-3.5 h-3.5" /> New Group
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {(!conversations || conversations.length === 0) ? (
              <div className="text-center py-14 text-muted-foreground px-4 space-y-3">
                <MessageSquare className="w-12 h-12 mx-auto opacity-25" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-xs">Accept a friend request or create a group to start chatting!</p>
              </div>
            ) : (
              conversations.map((conv: any) => {
                const isActive = activeConvId === conv.id;
                const hasUnread = conv.unreadCount > 0;
                const isGroup = conv.isGroup;
                const displayName = isGroup ? conv.groupName : conv.otherUser?.name;
                const displaySub = isGroup
                  ? `${conv.participants?.length ?? 0} members`
                  : (conv.lastMessage || `@${conv.otherUser?.username}`);

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
                      {isGroup ? (
                        <GroupAvatar photo={conv.groupPhoto} name={conv.groupName || "Group"} size="sm" />
                      ) : (
                        <Avatar url={conv.otherUser?.profilePicture} name={conv.otherUser?.name || "U"} online={isOnline(conv.otherUser?.lastSeen)} />
                      )}
                      {hasUnread && !isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold truncate text-sm flex items-center gap-1 ${hasUnread && !isActive ? "text-primary" : ""}`}>
                        {displayName || "Unknown"}
                        {isGroup && <Users className="w-3 h-3 shrink-0 opacity-50" />}
                      </div>
                      <div className={`text-xs truncate ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {displaySub}
                      </div>
                    </div>
                    {hasUnread && !isActive && (
                      <span className="shrink-0 text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">NEW</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={`flex-1 flex flex-col bg-background min-w-0 ${!activeConvId ? "hidden md:flex" : "flex"}`}>
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
              <p className="text-sm">Select a conversation or create a group to start chatting.</p>
            </div>
          )}
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreated={(id) => { setShowCreateGroup(false); setActiveConvId(id); }} />
      )}

      {showJoinDialog && joinGroupInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-1">Group Invite</h3>
            <p className="text-sm text-muted-foreground mb-5">You've been invited to join a group chat.</p>
            <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl mb-5">
              <GroupAvatar photo={joinGroupInfo.groupPhoto} name={joinGroupInfo.groupName || "Group"} size="lg" />
              <div>
                <div className="font-bold text-lg">{joinGroupInfo.groupName}</div>
                <div className="text-sm text-muted-foreground">{joinGroupInfo.participants?.length ?? 0} members</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowJoinDialog(false); setLocation('/chats'); }} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors">
                Decline
              </button>
              <button onClick={handleJoinGroup} disabled={joinGroup.isPending} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60" data-testid="button-join-group">
                {joinGroup.isPending ? "Joining..." : "Join Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  const [showSettings, setShowSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();

  const conv = conversations.find((c: any) => c.id === conversationId);
  const isGroup = !!conv?.isGroup;
  const otherUser = conv?.otherUser;
  const isAdminChat = !!conv?.isAdminChat;
  const canReply = !isAdminChat || !!currentUser?.isAdmin;
  const adminIdStr = conv?.adminId?.id || conv?.adminId?._id || conv?.adminId;
  const isGroupAdmin = isGroup && adminIdStr === currentUserId;

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
      <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
        <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {isGroup ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <GroupAvatar photo={conv?.groupPhoto} name={conv?.groupName || "Group"} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{conv?.groupName || "Group Chat"}</div>
              <div className="text-xs text-muted-foreground">
                {conv?.participants?.length ?? 0} members
                {isGroupAdmin && <span className="ml-2 text-primary font-semibold">· Admin</span>}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="shrink-0 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
              data-testid="button-group-settings"
              title="Group settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        ) : isAdminChat ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-md text-sm shrink-0">
              NX
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                NX-Connect
                <span className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold border border-primary/20">ADMIN</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Read-only</div>
            </div>
          </div>
        ) : otherUser ? (
          <button
            onClick={() => setLocation(`/profile/${otherUser.id || otherUser._id}`)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity rounded-xl px-1 py-0.5 flex-1 min-w-0"
            data-testid={`button-chat-view-profile-${otherUser.id || otherUser._id}`}
          >
            <Avatar url={otherUser.profilePicture} name={otherUser.name || "U"} size="sm" online={isOnline(otherUser?.lastSeen)} />
            <div className="text-left min-w-0">
              <div className="font-bold hover:text-primary transition-colors truncate">{otherUser.name}</div>
              <div className="text-xs text-muted-foreground truncate">@{otherUser.username} · tap to view profile</div>
            </div>
          </button>
        ) : (
          <div className="font-bold">Conversation</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages?.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{isGroup ? "Group created! Say hello." : "Say hello! Start the conversation."}</p>
          </div>
        )}
        {messages?.map((msg: any) => {
          if (msg.isSystem || msg.content?.startsWith('🎉')) {
            return (
              <div key={msg.id} className="flex justify-center my-1">
                <span className="text-xs text-muted-foreground/60 italic bg-muted/30 px-4 py-1.5 rounded-full">{msg.content}</span>
              </div>
            );
          }
          const isMe = msg.senderId === currentUserId;
          const senderName = msg.sender?.name || "";
          const senderPic = msg.sender?.profilePicture || "";

          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              {!isMe && isGroup && (
                <div className="mt-5 shrink-0">
                  <Avatar url={senderPic} name={senderName || "U"} size="sm" />
                </div>
              )}
              <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && isGroup && senderName && (
                  <span className="text-xs font-semibold text-primary mb-0.5 ml-1">{senderName}</span>
                )}
                <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                  isMe ? "bg-primary text-white rounded-br-sm" : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                }`}>
                  <LinkedText
                    text={msg.content}
                    linkClassName={isMe ? "text-white underline underline-offset-2 hover:no-underline break-all opacity-90" : "text-primary underline underline-offset-2 hover:no-underline break-all"}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                  <TimeAgo date={msg.createdAt} />
                </div>
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
              placeholder={isGroup ? "Message the group..." : "Type a message..."}
              className="flex-1 bg-transparent border-none outline-none text-foreground py-2 text-sm"
              data-testid="input-message"
            />
            <button
              type="submit"
              disabled={!content.trim() || sendMessage.isPending}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform shadow-md shrink-0"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-card border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Lock className="w-4 h-4" />
          <span>Read-only message from NX-Connect.</span>
        </div>
      )}

      {showSettings && isGroup && conv && (
        <GroupSettingsPanel
          conv={conv}
          currentUserId={currentUserId}
          isAdmin={isGroupAdmin}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

function GroupSettingsPanel({
  conv,
  currentUserId,
  isAdmin,
  onClose,
}: {
  conv: any;
  currentUserId?: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const updateGroup = useUpdateGroup();
  const removeMember = useRemoveGroupMember();
  const leaveGroup = useLeaveGroup();
  const [editName, setEditName] = useState(conv.groupName || "");
  const [editPhoto, setEditPhoto] = useState(conv.groupPhoto || "");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const inviteUrl = `${window.location.origin}/chats?join=${conv.inviteToken}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGroup.mutateAsync({ id: conv.id, groupName: editName, groupPhoto: editPhoto });
      toast({ title: "Group updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.82);
      setEditPhoto(compressed);
    } catch {
      toast({ title: "Could not load image", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({ title: "Invite link copied!" });
    });
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    try {
      await removeMember.mutateAsync({ groupId: conv.id, memberId });
      toast({ title: "Member removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    try {
      await leaveGroup.mutateAsync(conv.id);
      onClose();
      toast({ title: "You left the group" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-card p-5 border-b border-border flex items-center justify-between z-10">
          <h3 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Group Settings</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {isAdmin && (
            <div className="space-y-3 p-4 bg-secondary/30 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-semibold">Admin Controls</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group/photo shrink-0">
                  <GroupAvatar photo={editPhoto} name={editName || "G"} size="lg" />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/0 group-hover/photo:bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-all"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} data-testid="input-group-photo" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Group Name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Group name"
                    data-testid="input-group-name"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                data-testid="button-save-group-settings"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Invite Link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${copied ? "bg-green-500 text-white" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                data-testid="button-copy-invite"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Share this link — anyone who taps it can join the group</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Members ({conv.participants?.length ?? 0})
            </label>
            <div className="space-y-2">
              {(conv.participants || []).map((p: any) => {
                const memberId = p.id || p._id;
                const isMe = memberId === currentUserId;
                const adminId = conv.adminId?.id || conv.adminId?._id || conv.adminId;
                const isMemberAdmin = memberId === adminId;
                return (
                  <div key={memberId} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40">
                    <Avatar url={p.profilePicture} name={p.name || "U"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                        {p.name}
                        {isMemberAdmin && <Shield className="w-3.5 h-3.5 text-primary shrink-0" />}
                        {isMe && <span className="text-xs text-muted-foreground font-normal">(you)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">@{p.username}</div>
                    </div>
                    {isAdmin && !isMe && !isMemberAdmin && (
                      <button
                        onClick={() => handleRemove(memberId)}
                        disabled={removeMember.isPending}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="Remove member"
                        data-testid={`button-remove-member-${memberId}`}
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!isAdmin && (
            <button
              onClick={handleLeave}
              disabled={leaveGroup.isPending}
              className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
              data-testid="button-leave-group"
            >
              <LogOut className="w-4 h-4" /> Leave Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const createGroup = useCreateGroup();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupPhoto, setGroupPhoto] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const toggleMember = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.82);
      setGroupPhoto(compressed);
    } catch {
      toast({ title: "Could not load image", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    try {
      const group = await createGroup.mutateAsync({ groupName: groupName.trim(), groupPhoto: groupPhoto || undefined, memberIds: selectedIds });
      toast({ title: "Group created!", description: `"${group.groupName}" is ready.` });
      onCreated(group.id);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not create group", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-card p-5 border-b border-border flex items-center justify-between z-10">
          <h3 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> New Group</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative group/photo shrink-0">
              <GroupAvatar photo={groupPhoto} name={groupName || "G"} size="lg" />
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/0 group-hover/photo:bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-all"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} data-testid="input-new-group-photo" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Group Name *</label>
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Enter group name..."
                autoFocus
                data-testid="input-new-group-name"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Add Friends {selectedIds.length > 0 && <span className="text-primary normal-case">({selectedIds.length} selected)</span>}
            </label>
            {friendsLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm animate-pulse">Loading friends...</div>
            ) : !friends?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                You need friends to add to the group!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {friends.map((friend: any) => {
                  const fid = friend.id || friend._id;
                  const selected = selectedIds.includes(fid);
                  return (
                    <button
                      key={fid}
                      onClick={() => toggleMember(fid)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selected ? "bg-primary/15 border border-primary/30" : "bg-secondary/40 hover:bg-secondary"}`}
                      data-testid={`button-select-friend-${fid}`}
                    >
                      <Avatar url={friend.profilePicture} name={friend.name || "U"} size="sm" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-semibold text-sm truncate">{friend.name}</div>
                        <div className="text-xs text-muted-foreground">@{friend.username}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "bg-primary border-primary" : "border-border"}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || createGroup.isPending}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-create-group"
          >
            {createGroup.isPending ? "Creating..." : `Create Group${selectedIds.length > 0 ? ` (${selectedIds.length + 1} people)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
