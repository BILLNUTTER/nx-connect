import { useState } from "react";
import { useAdminStats, useAdminUsers, useAdminPasswordRequests, useAdminActions } from "@/hooks/use-admin";
import { usePosts } from "@/hooks/use-posts";
import { useUserPosts } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Avatar, TimeAgo, isOnline, LinkedText } from "@/components/ui/shared";
import { ShieldAlert, Users, CheckCircle, Ban, BellRing, ArrowLeft, Heart, MessageCircle, Copy, Send, FileText, Trash2, Globe, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, Post } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(user?.isAdmin || false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "feed">("dashboard");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-6" />
          <h1 className="text-2xl font-bold mb-6">Admin Access Required</h1>
          <Input
            type="password"
            placeholder="Enter Admin Key..."
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            className="mb-4"
            data-testid="input-admin-key"
          />
          <Button
            className="w-full"
            data-testid="button-admin-login"
            onClick={() => {
              if (adminKey === "admin123" || adminKey === "nutterx-admin-123" || user?.isAdmin) setIsAuthenticated(true);
              else alert("Invalid Key");
            }}
          >
            Authenticate
          </Button>
        </Card>
      </div>
    );
  }

  if (selectedUser) {
    return <UserDetailView user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient">NutterX Command Center</h1>
          <p className="text-muted-foreground mt-2">Manage users, oversee content, and handle requests.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-primary/20">
          <ShieldAlert className="w-5 h-5" /> Admin Mode
        </div>
      </div>

      <div className="flex gap-2 bg-secondary rounded-xl p-1 w-fit">
        <button
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === "dashboard" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === "feed" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("feed")}
        >
          All Posts Feed
        </button>
      </div>

      {activeTab === "dashboard" ? (
        <>
          <AdminStats />
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <GlobalNotification />
              <AdminPostBroadcast />
            </div>
            <PasswordRequests />
          </div>
          <UsersManagement onSelectUser={setSelectedUser} />
        </>
      ) : (
        <AdminFeedView />
      )}
    </div>
  );
}

function AdminStats() {
  const { data: stats } = useAdminStats();
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-gradient-to-br from-primary to-accent text-white border-none">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="text-4xl font-bold">{stats?.totalUsers || 0}</div>
            <div className="text-white/80 font-medium">Total Registered Users</div>
          </div>
        </div>
      </Card>
      <Card className="bg-secondary border-none">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-background rounded-2xl shadow-sm">
            <BellRing className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="text-4xl font-bold text-foreground">{stats?.totalPosts || 0}</div>
            <div className="text-muted-foreground font-medium">Total Posts Created</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function GlobalNotification() {
  const [msg, setMsg] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const { sendNotification } = useAdminActions();
  const { toast } = useToast();
  const { data: users } = useAdminUsers();

  const handleSend = async () => {
    if (!msg) return;
    await sendNotification.mutateAsync({ content: msg, userId: targetUserId || undefined });
    setMsg("");
    setTargetUserId("");
    toast({ title: "Alert sent", description: targetUserId ? "Notification sent to user." : "Broadcast sent to all users." });
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BellRing className="w-5 h-5 text-accent" /> Send Alert Notification
      </h2>
      <p className="text-sm text-muted-foreground mb-4">Send a system alert notification to all users or a specific user.</p>
      <div className="space-y-3">
        <select
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary text-sm"
          value={targetUserId}
          onChange={e => setTargetUserId(e.target.value)}
          data-testid="select-notification-user"
        >
          <option value="">All users (broadcast)</option>
          {users?.map(u => (
            <option key={u.id} value={u.id!}>{u.name} (@{u.username})</option>
          ))}
        </select>
        <textarea
          className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground outline-none focus:border-primary resize-none h-24"
          placeholder="Alert message content..."
          value={msg}
          onChange={e => setMsg(e.target.value)}
          data-testid="input-broadcast"
        />
        <Button onClick={handleSend} disabled={!msg || sendNotification.isPending} className="w-full">
          <BellRing className="w-4 h-4 mr-2" /> Send Alert
        </Button>
      </div>
    </Card>
  );
}

function AdminPostBroadcast() {
  const [content, setContent] = useState("");
  const { createAdminPost } = useAdminActions();
  const { toast } = useToast();

  const handlePost = async () => {
    if (!content.trim()) return;
    await createAdminPost.mutateAsync(content.trim());
    setContent("");
    toast({ title: "Posted!", description: "Your admin post is now visible to everyone." });
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" /> Post to Everyone
      </h2>
      <p className="text-sm text-muted-foreground mb-4">Create an official post that appears on every user's feed.</p>
      <div className="space-y-3">
        <textarea
          className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground outline-none focus:border-primary resize-none h-24"
          placeholder="Write an official announcement..."
          value={content}
          onChange={e => setContent(e.target.value)}
          data-testid="input-admin-post"
        />
        <Button onClick={handlePost} disabled={!content.trim() || createAdminPost.isPending} className="w-full">
          <FileText className="w-4 h-4 mr-2" /> Publish to Everyone
        </Button>
      </div>
    </Card>
  );
}

function PasswordRequests() {
  const { data: requests } = useAdminPasswordRequests();
  const { resolvePassword } = useAdminActions();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});

  const handleApprove = async (reqId: string) => {
    const pw = passwords[reqId];
    if (!pw || pw.length < 6) {
      toast({ title: "Password required", description: "Enter at least 6 characters.", variant: "destructive" });
      return;
    }
    const result = await resolvePassword.mutateAsync({ id: reqId, password: pw });
    const phone = result?.phone || "";
    if (phone) setRevealedPhones(prev => ({ ...prev, [reqId]: phone }));
    setPasswords(prev => ({ ...prev, [reqId]: "" }));
    toast({ title: "Password set!", description: phone ? `Send '${pw}' to ${phone} externally.` : "Password updated successfully." });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: text });
  };

  const pending = requests?.filter(r => r.status === "pending") ?? [];

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Lock className="w-5 h-5 text-destructive" /> Password Reset Requests
      </h2>
      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
        {!pending.length && <div className="text-muted-foreground text-center py-8">No pending requests.</div>}
        {pending.map(req => (
          <div key={req.id} className="bg-secondary p-4 rounded-xl space-y-3" data-testid={`card-password-request-${req.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                {req.username && <div className="font-bold">@{req.username}</div>}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm bg-background px-3 py-1 rounded-lg border border-border font-mono flex items-center gap-2">
                    📧 {req.email}
                    <button onClick={() => copyToClipboard(req.email)} className="text-primary hover:opacity-70"><Copy className="w-3 h-3" /></button>
                  </span>
                  <span className="text-sm bg-background px-3 py-1 rounded-lg border border-border font-mono flex items-center gap-2">
                    📱 {req.phone}
                    <button onClick={() => copyToClipboard(req.phone)} className="text-primary hover:opacity-70"><Copy className="w-3 h-3" /></button>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground"><TimeAgo date={req.createdAt!} /></div>
              </div>
            </div>

            {revealedPhones[req.id] ? (
              <div className="bg-green-500/10 text-green-600 p-3 rounded-xl text-sm font-medium border border-green-500/20">
                ✓ Password set. Send via phone: <span className="font-bold">{revealedPhones[req.id]}</span>
                <button onClick={() => copyToClipboard(revealedPhones[req.id])} className="ml-2 underline text-green-700">copy</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Set new password (min 6 chars)"
                  value={passwords[req.id] || ""}
                  onChange={e => setPasswords(prev => ({ ...prev, [req.id]: e.target.value }))}
                  className="flex-1 text-sm"
                  data-testid={`input-new-password-${req.id}`}
                />
                <Button
                  size="sm"
                  onClick={() => handleApprove(req.id)}
                  disabled={resolvePassword.isPending}
                  data-testid={`button-approve-${req.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function UsersManagement({ onSelectUser }: { onSelectUser: (u: User) => void }) {
  const { data: users } = useAdminUsers();
  const { restrictUser, reactivateUser } = useAdminActions();

  return (
    <Card>
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" /> All Registered Users
        <span className="text-sm text-muted-foreground font-normal ml-2">— click a user to manage</span>
      </h2>
      <div className="space-y-3">
        {users?.map(u => (
          <div
            key={u.id}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
            onClick={() => onSelectUser(u)}
            data-testid={`row-user-${u.id}`}
          >
            <Avatar url={u.profilePicture} name={u.name || "U"} online={isOnline((u as any).lastSeen)} />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{u.name}</div>
              <div className="text-sm text-muted-foreground">@{u.username} · {u.email}</div>
              {u.phone && <div className="text-xs text-muted-foreground font-mono">{u.phone}</div>}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
              u.status === "active" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
            }`}>
              {u.status?.toUpperCase()}
            </span>
            <div onClick={e => e.stopPropagation()}>
              {u.status === "active" ? (
                <Button variant="destructive" size="sm" onClick={() => restrictUser.mutate(u.id!)} data-testid={`button-restrict-${u.id}`}>
                  <Ban className="w-4 h-4 mr-1" /> Suspend
                </Button>
              ) : (
                <Button className="bg-green-500 hover:bg-green-600 text-white" size="sm" onClick={() => reactivateUser.mutate(u.id!)} data-testid={`button-reactivate-${u.id}`}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Activate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function UserDetailView({ user, onBack }: { user: User; onBack: () => void }) {
  const { sendNotification, sendChat, restrictUser, reactivateUser, adminDeletePost } = useAdminActions();
  const { toast } = useToast();
  const [chatMsg, setChatMsg] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [showActions, setShowActions] = useState(false);

  const handleSendChat = async () => {
    if (!chatMsg.trim()) return;
    await sendChat.mutateAsync({ userId: user.id!, content: chatMsg.trim() });
    setChatMsg("");
    toast({ title: "Chat sent", description: "One-way admin message delivered." });
  };

  const handleSendAlert = async () => {
    if (!alertMsg.trim()) return;
    await sendNotification.mutateAsync({ content: alertMsg.trim(), userId: user.id! });
    setAlertMsg("");
    toast({ title: "Alert sent", description: "Notification delivered to user." });
  };

  const handleSuspend = async () => {
    await restrictUser.mutateAsync(user.id!);
    toast({
      title: "Account suspended",
      description: `Use the phone number ${user.phone || "(no phone)"} to inform the user externally.`,
    });
  };

  const handleActivate = async () => {
    await reactivateUser.mutateAsync(user.id!);
    toast({ title: "Account activated" });
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    await adminDeletePost.mutateAsync(postId);
    toast({ title: "Post deleted" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
        data-testid="button-back-admin"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar url={user.profilePicture} name={user.name || "U"} size="xl" />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">@{user.username}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-secondary rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">Email</div>
                <div className="font-medium truncate">{user.email}</div>
              </div>
              <div className="bg-secondary rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">Phone (for external contact)</div>
                <div className="font-bold font-mono flex items-center gap-2">
                  {user.phone || "—"}
                  {user.phone && (
                    <button onClick={() => { navigator.clipboard.writeText(user.phone!); toast({ title: "Phone copied!" }); }} className="text-primary">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end shrink-0">
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${user.status === "active" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
              {user.status?.toUpperCase()}
            </span>
            {user.status === "active" ? (
              <Button variant="destructive" size="sm" onClick={handleSuspend} data-testid="button-suspend-user">
                <Ban className="w-4 h-4 mr-1" /> Suspend
              </Button>
            ) : (
              <Button className="bg-green-500 hover:bg-green-600 text-white" size="sm" onClick={handleActivate} data-testid="button-activate-user">
                <CheckCircle className="w-4 h-4 mr-1" /> Activate
              </Button>
            )}
            {user.status === "restricted" && user.phone && (
              <p className="text-xs text-muted-foreground text-right max-w-[180px]">Contact user externally at <strong>{user.phone}</strong> to inform of suspension.</p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold mb-3 flex items-center gap-2"><BellRing className="w-4 h-4 text-accent" /> Send Alert Notification</h3>
          <textarea
            className="w-full bg-secondary border border-border rounded-xl p-3 text-foreground outline-none focus:border-primary resize-none h-20 text-sm"
            placeholder="Alert message..."
            value={alertMsg}
            onChange={e => setAlertMsg(e.target.value)}
            data-testid="input-user-alert"
          />
          <Button onClick={handleSendAlert} disabled={!alertMsg.trim() || sendNotification.isPending} className="w-full mt-3" size="sm">
            <BellRing className="w-4 h-4 mr-2" /> Send Alert
          </Button>
        </Card>

        <Card>
          <h3 className="font-bold mb-1 flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Send Chat Message</h3>
          <p className="text-xs text-muted-foreground mb-3">One-way only — user cannot reply to admin messages.</p>
          <textarea
            className="w-full bg-secondary border border-border rounded-xl p-3 text-foreground outline-none focus:border-primary resize-none h-20 text-sm"
            placeholder="Message to user..."
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
            data-testid="input-user-chat"
          />
          <Button onClick={handleSendChat} disabled={!chatMsg.trim() || sendChat.isPending} className="w-full mt-3" size="sm">
            <Send className="w-4 h-4 mr-2" /> Send Message
          </Button>
        </Card>
      </div>

      <UserPostsList userId={user.id!} userName={user.name || "User"} onDeletePost={handleDeletePost} />
    </div>
  );
}

function UserPostsList({ userId, userName, onDeletePost }: { userId: string; userName: string; onDeletePost: (id: string) => void }) {
  const { data: posts, isLoading } = useUserPosts(userId);

  return (
    <>
      <h3 className="text-xl font-bold px-1">Posts by {userName} ({posts?.length ?? 0})</h3>
      {isLoading ? (
        <div className="text-center text-muted-foreground animate-pulse py-10">Loading posts...</div>
      ) : !posts?.length ? (
        <Card className="text-center py-12 text-muted-foreground">This user hasn't posted anything yet.</Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post: Post) => (
            <Card key={post.id} data-testid={`card-post-${post.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} size="sm" />
                  <div>
                    <div className="font-bold text-sm">{post.author?.name}</div>
                    <div className="text-xs text-muted-foreground"><TimeAgo date={post.createdAt!} /></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Heart className="w-4 h-4" /> {post.likes.length}</span>
                  <Button variant="destructive" size="sm" onClick={() => onDeletePost(post.id!)} data-testid={`button-delete-post-${post.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap text-sm"><LinkedText text={post.content} /></p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function AdminFeedView() {
  const { data: posts, isLoading } = usePosts();
  const { adminDeletePost } = useAdminActions();
  const { toast } = useToast();

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    await adminDeletePost.mutateAsync(postId);
    toast({ title: "Post deleted" });
  };

  if (isLoading) return <div className="text-center text-muted-foreground animate-pulse py-20">Loading feed...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground px-1">Viewing all posts. Use the delete button to remove posts that violate community rules.</p>
      {!posts?.length && <Card className="text-center py-12 text-muted-foreground">No posts yet.</Card>}
      {posts?.map(post => (
        <Card key={post.id} data-testid={`feed-post-${post.id}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} size="sm" />
              <div>
                <div className="font-bold text-sm flex items-center gap-2">
                  {post.author?.name}
                  {post.isAdminPost && (
                    <span className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold border border-primary/20">OFFICIAL</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">@{post.author?.username} · <TimeAgo date={post.createdAt!} /></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Heart className="w-4 h-4" /> {post.likes.length}</span>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id!)} data-testid={`button-delete-feed-post-${post.id}`}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
          <p className="text-foreground whitespace-pre-wrap text-sm"><LinkedText text={post.content} /></p>
        </Card>
      ))}
    </div>
  );
}
