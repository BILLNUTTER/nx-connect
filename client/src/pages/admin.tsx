import { useState } from "react";
import { useAdminStats, useAdminUsers, useAdminPasswordRequests, useAdminActions, useAdminPosts, useAdminProfile } from "@/hooks/use-admin";
import { setAdminKey as persistAdminKey, apiFetch } from "@/lib/api";
import { useUserPosts } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Avatar, TimeAgo, isOnline, LinkedText, VerifiedBadge } from "@/components/ui/shared";
import { ShieldAlert, Users, CheckCircle, Ban, BellRing, ArrowLeft, Heart, Copy, Send, FileText, Trash2, Globe, Lock, Camera, X, BadgeCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, Post } from "@shared/schema";

function AdminProfileSection() {
  const { data: adminUser, isLoading, updateProfile } = useAdminProfile();
  const { toast } = useToast();
  const [photoUrl, setPhotoUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    const updates: { profilePicture?: string; name?: string } = {};
    if (photoUrl.trim()) updates.profilePicture = photoUrl.trim();
    if (displayName.trim()) updates.name = displayName.trim();
    if (!Object.keys(updates).length) return;
    await updateProfile.mutateAsync(updates);
    toast({ title: "Admin profile updated!" });
    setPhotoUrl("");
    setDisplayName("");
    setEditing(false);
  };

  return (
    <Card className="p-5 border border-amber-300/60 dark:border-amber-500/30" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, var(--card) 70%)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-500" /> NX-Connect Official Profile
        </h2>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
          data-testid="button-edit-admin-profile"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="ring-2 ring-amber-400 dark:ring-amber-500 rounded-full p-0.5 shrink-0">
          {isLoading ? (
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 animate-pulse" />
          ) : (
            <Avatar url={adminUser?.profilePicture} name="NX" size="lg" online={false} />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-amber-700 dark:text-amber-300">{adminUser?.name || "NX-Connect"}</div>
          <div className="text-xs text-muted-foreground">@{adminUser?.username || "admin"}</div>
          <span className="inline-flex items-center gap-0.5 mt-1 px-2 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-full font-bold border border-amber-300 dark:border-amber-600">
            ✦ OFFICIAL
          </span>
        </div>
      </div>
      {editing && (
        <div className="mt-4 space-y-3 border-t border-amber-200/50 dark:border-amber-700/30 pt-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1 font-medium">Profile Photo URL</label>
            <Input
              placeholder="https://example.com/photo.jpg"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              data-testid="input-admin-profile-photo"
            />
            {photoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={photoUrl} alt="preview" className="w-10 h-10 rounded-full object-cover border border-amber-300" onError={e => (e.currentTarget.style.display = 'none')} />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 font-medium">Display Name</label>
            <Input
              placeholder={adminUser?.name || "NX-Connect"}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              data-testid="input-admin-display-name"
            />
          </div>
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleSave}
            disabled={updateProfile.isPending || (!photoUrl.trim() && !displayName.trim())}
            data-testid="button-save-admin-profile"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(user?.isAdmin || false);
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "feed">("dashboard");

  const handleAuthenticate = async () => {
    if (!adminKey.trim()) return;
    if (user?.isAdmin) { setIsAuthenticated(true); return; }
    setAuthLoading(true);
    try {
      // Verify key by attempting a protected endpoint
      persistAdminKey(adminKey.trim());
      await apiFetch("/api/admin/stats");
      setIsAuthenticated(true);
    } catch {
      persistAdminKey("");
      toast({ title: "Invalid admin key", description: "The key you entered is incorrect.", variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

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
            onKeyDown={e => e.key === "Enter" && handleAuthenticate()}
            className="mb-4"
            data-testid="input-admin-key"
          />
          <Button
            className="w-full"
            data-testid="button-admin-login"
            disabled={authLoading || !adminKey.trim()}
            onClick={handleAuthenticate}
          >
            {authLoading ? "Verifying..." : "Authenticate"}
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
          <h1 className="text-4xl font-display font-bold text-gradient">NX-Connect Command Center</h1>
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
          <AdminProfileSection />
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
          {users?.map((u, i) => (
            <option key={u.id || u.username || i} value={u.id!}>{u.name} (@{u.username})</option>
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
  const [resolved, setResolved] = useState<Record<string, { phone: string; password: string }>>({});

  const handleApprove = async (reqId: string) => {
    const pw = passwords[reqId];
    if (!pw || pw.length < 6) {
      toast({ title: "Password required", description: "Enter at least 6 characters.", variant: "destructive" });
      return;
    }
    const result = await resolvePassword.mutateAsync({ id: reqId, password: pw });
    const phone = result?.phone || "";
    setResolved(prev => ({ ...prev, [reqId]: { phone, password: pw } }));
    setPasswords(prev => ({ ...prev, [reqId]: "" }));
    toast({ title: "Password set!", description: "Copy the password and send it to the user via WhatsApp." });
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

            {resolved[req.id] ? (
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl space-y-3">
                <div className="text-green-700 font-bold text-sm flex items-center gap-1">✓ Password set — send to user via WhatsApp</div>
                <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wide w-20 shrink-0">New Password</span>
                  <span className="font-mono font-bold text-foreground flex-1">{resolved[req.id].password}</span>
                  <button onClick={() => copyToClipboard(resolved[req.id].password)} className="text-primary hover:opacity-70 shrink-0" data-testid={`button-copy-password-${req.id}`}><Copy className="w-4 h-4" /></button>
                </div>
                {resolved[req.id].phone && (
                  <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wide w-20 shrink-0">WhatsApp</span>
                    <span className="font-mono text-foreground flex-1">{resolved[req.id].phone}</span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => copyToClipboard(resolved[req.id].phone)} className="text-primary hover:opacity-70"><Copy className="w-4 h-4" /></button>
                      <a
                        href={`https://wa.me/${resolved[req.id].phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Your NX-Connect password has been reset. New password: ${resolved[req.id].password}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:opacity-70 font-bold text-xs underline"
                        data-testid={`button-whatsapp-${req.id}`}
                      >
                        Open WhatsApp
                      </a>
                    </div>
                  </div>
                )}
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
  const { restrictUser, reactivateUser, verifyUser } = useAdminActions();

  return (
    <Card>
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" /> All Registered Users
        <span className="text-sm text-muted-foreground font-normal ml-2">— click a user to manage</span>
      </h2>
      <div className="space-y-3">
        {users?.map((u, i) => (
          <div
            key={u.id || u.username || i}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
            onClick={() => onSelectUser(u)}
            data-testid={`row-user-${u.id || i}`}
          >
            <Avatar url={u.profilePicture} name={u.name || "U"} online={isOnline((u as any).lastSeen)} />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate flex items-center gap-1">
                {u.name}
                {(u as any).isVerified && <VerifiedBadge size="xs" />}
              </div>
              <div className="text-sm text-muted-foreground">@{u.username} · {u.email}</div>
              {u.phone && <div className="text-xs text-muted-foreground font-mono">{u.phone}</div>}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
              u.status === "active" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
            }`}>
              {u.status?.toUpperCase()}
            </span>
            {u.id && (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyUser.mutate(u.id!)}
                  title={(u as any).isVerified ? "Remove verification" : "Grant verification badge"}
                  data-testid={`button-verify-${u.id}`}
                  className={(u as any).isVerified ? "border-blue-400 text-blue-500" : "text-muted-foreground"}
                >
                  <BadgeCheck className="w-4 h-4" />
                </Button>
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
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function UserDetailView({ user, onBack }: { user: User; onBack: () => void }) {
  const { sendNotification, sendChat, restrictUser, reactivateUser, adminDeletePost, deleteUser, verifyUser } = useAdminActions();
  const { toast } = useToast();
  const firstName = (user.name || "there").split(" ")[0];
  const welcomeTemplate = `Hey ${firstName}! 😊 Welcome to NX-Connect.\nBring your friends along and earn your Verified Badge ✅\nLet's grow your circle together!`;
  const [chatMsg, setChatMsg] = useState(welcomeTemplate);
  const [alertMsg, setAlertMsg] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [deleteUserModal, setDeleteUserModal] = useState(false);

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

  const handleDeleteUser = async () => {
    try {
      await deleteUser.mutateAsync(user.id!);
      toast({ title: "Account deleted", description: `${user.name}'s account and all their data have been permanently removed.` });
      setDeleteUserModal(false);
      onBack();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const [deleteModal, setDeleteModal] = useState<{ postId: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const handleDeletePost = (postId: string) => {
    setDeleteReason("");
    setDeleteModal({ postId });
  };

  const confirmDeletePost = async () => {
    if (!deleteModal) return;
    try {
      await adminDeletePost.mutateAsync({ id: deleteModal.postId, reason: deleteReason.trim() || "Violated community guidelines" });
      toast({ title: "Post deleted", description: "User has been notified." });
      setDeleteModal(null);
    } catch {
      toast({ title: "Delete failed", description: "Could not delete the post. Try again.", variant: "destructive" });
    }
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
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {user.name}
              {(user as any).isVerified && <VerifiedBadge size="md" />}
            </h2>
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
            {user.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => verifyUser.mutate(user.id!)}
                disabled={verifyUser.isPending}
                className={(user as any).isVerified ? "border-blue-400 text-blue-500 bg-blue-50 dark:bg-blue-950/20" : "text-muted-foreground"}
                data-testid="button-verify-user-detail"
              >
                <BadgeCheck className="w-4 h-4 mr-1" />
                {(user as any).isVerified ? "Remove Verified" : "Grant Verified"}
              </Button>
            )}
            {user.id ? (
              user.status === "active" ? (
                <Button variant="destructive" size="sm" onClick={handleSuspend} data-testid="button-suspend-user">
                  <Ban className="w-4 h-4 mr-1" /> Suspend
                </Button>
              ) : (
                <Button className="bg-green-500 hover:bg-green-600 text-white" size="sm" onClick={handleActivate} data-testid="button-activate-user">
                  <CheckCircle className="w-4 h-4 mr-1" /> Activate
                </Button>
              )
            ) : (
              <span className="text-xs text-muted-foreground">Legacy account</span>
            )}
            {user.id && (
              <Button
                size="sm"
                className="bg-black hover:bg-black/80 text-white border border-red-800"
                onClick={() => setDeleteUserModal(true)}
                data-testid="button-delete-user"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Account
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
          <h3 className="font-bold mb-1 flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Send DM to {user.name?.split(" ")[0]}</h3>
          <p className="text-xs text-muted-foreground mb-3">One-way only — user cannot reply to admin messages. Edit the template below before sending.</p>
          <div className="relative">
            <textarea
              className="w-full bg-secondary border border-primary/30 rounded-xl p-3 text-foreground outline-none focus:border-primary resize-none text-sm"
              rows={5}
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              data-testid="input-user-chat"
            />
            <button
              type="button"
              onClick={() => setChatMsg(welcomeTemplate)}
              className="absolute top-2 right-2 text-[10px] text-primary/70 hover:text-primary bg-background border border-border rounded px-1.5 py-0.5 font-medium transition-colors"
              title="Reset to template"
            >
              Reset
            </button>
          </div>
          <Button onClick={handleSendChat} disabled={!chatMsg.trim() || sendChat.isPending} className="w-full mt-3" size="sm">
            <Send className="w-4 h-4 mr-2" /> {sendChat.isPending ? "Sending…" : "Send Message"}
          </Button>
        </Card>
      </div>

      <UserPostsList userId={user.id!} userName={user.name || "User"} onDeletePost={handleDeletePost} />

      {deleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setDeleteModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDeleteModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" data-testid="button-close-delete-modal">
              <X className="w-5 h-5" />
            </button>
            <Trash2 className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="text-lg font-bold text-center mb-1">Delete Post</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">The user will receive a notification with the reason below.</p>
            <textarea
              className="w-full bg-secondary border border-border rounded-xl p-3 text-foreground outline-none focus:border-primary resize-none h-24 text-sm mb-4"
              placeholder="Reason for removal (e.g. Inappropriate content, spam, harassment...)"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              data-testid="input-delete-reason"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDeletePost} disabled={adminDeletePost.isPending} data-testid="button-confirm-delete-post">
                {adminDeletePost.isPending ? "Deleting..." : "Delete & Notify"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setDeleteUserModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-card border border-destructive/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDeleteUserModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" data-testid="button-close-delete-user-modal">
              <X className="w-5 h-5" />
            </button>
            <Trash2 className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h3 className="text-xl font-bold text-center mb-1">Delete Account</h3>
            <p className="text-sm text-muted-foreground text-center mb-2">
              You are about to permanently delete <strong>{user.name}</strong>'s account.
            </p>
            <p className="text-xs text-destructive/80 bg-destructive/10 rounded-lg p-3 text-center mb-5">
              This will erase all their posts, messages, comments, notifications, and stories. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteUserModal(false)} data-testid="button-cancel-delete-user">Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteUser} disabled={deleteUser.isPending} data-testid="button-confirm-delete-user">
                {deleteUser.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
          {posts.map((post: Post, i: number) => (
            <Card key={post.id || i} data-testid={`card-post-${post.id || i}`}>
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
              {(post.content !== "📷" || !(post as any).imageUrl) && (
                <p className="text-foreground whitespace-pre-wrap text-sm"><LinkedText text={post.content} /></p>
              )}
              {(post as any).imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                  <img src={(post as any).imageUrl} alt="Post" className="w-full object-cover max-h-[300px]" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function AdminFeedView() {
  const { data: posts, isLoading } = useAdminPosts();
  const { adminDeletePost } = useAdminActions();
  const { toast } = useToast();
  const [deleteModal, setDeleteModal] = useState<{ postId: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const handleDelete = (postId: string) => {
    setDeleteReason("");
    setDeleteModal({ postId });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await adminDeletePost.mutateAsync({ id: deleteModal.postId, reason: deleteReason.trim() || "Violated community guidelines" });
      toast({ title: "Post deleted", description: "User has been notified." });
      setDeleteModal(null);
    } catch {
      toast({ title: "Delete failed", description: "Could not delete the post. Try again.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-center text-muted-foreground animate-pulse py-20">Loading feed...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground px-1">Viewing all posts. Use the delete button to remove posts that violate community rules.</p>
      {!posts?.length && <Card className="text-center py-12 text-muted-foreground">No posts yet.</Card>}
      {posts?.map((post, i) => (
        <Card key={post.id || i} data-testid={`feed-post-${post.id || i}`}>
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
          {(post.content !== "📷" || !(post as any).imageUrl) && (
            <p className="text-foreground whitespace-pre-wrap text-sm"><LinkedText text={post.content} /></p>
          )}
          {(post as any).imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
              <img src={(post as any).imageUrl} alt="Post" className="w-full object-cover max-h-[300px]" />
            </div>
          )}
        </Card>
      ))}

      {deleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setDeleteModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDeleteModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" data-testid="button-close-feed-delete-modal">
              <X className="w-5 h-5" />
            </button>
            <Trash2 className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="text-lg font-bold text-center mb-1">Delete Post</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">The user will receive a notification with the reason below.</p>
            <textarea
              className="w-full bg-secondary border border-border rounded-xl p-3 text-foreground outline-none focus:border-primary resize-none h-24 text-sm mb-4"
              placeholder="Reason for removal (e.g. Inappropriate content, spam, harassment...)"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              data-testid="input-feed-delete-reason"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDelete} disabled={adminDeletePost.isPending} data-testid="button-confirm-feed-delete-post">
                {adminDeletePost.isPending ? "Deleting..." : "Delete & Notify"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
