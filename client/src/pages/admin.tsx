import { useState } from "react";
import { useAdminStats, useAdminUsers, useAdminPasswordRequests, useAdminActions } from "@/hooks/use-admin";
import { useUserPosts } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Avatar, TimeAgo } from "@/components/ui/shared";
import { ShieldAlert, Users, CheckCircle, Ban, BellRing, ArrowLeft, Heart, MessageCircle, X } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(user?.isAdmin || false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient">NutterX Command Center</h1>
          <p className="text-muted-foreground mt-2">Manage users, oversee content, and handle requests.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-primary/20">
          <ShieldAlert className="w-5 h-5" /> Admin Mode Active
        </div>
      </div>

      <AdminStats />

      <div className="grid lg:grid-cols-2 gap-8">
        <GlobalNotification />
        <PasswordRequests />
      </div>

      <UsersManagement onSelectUser={setSelectedUser} />
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
  const { sendNotification } = useAdminActions();

  const handleSend = async () => {
    if (!msg) return;
    await sendNotification.mutateAsync({ content: msg });
    setMsg("");
    alert("Broadcast sent!");
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BellRing className="w-5 h-5 text-accent" /> Broadcast Notification
      </h2>
      <p className="text-sm text-muted-foreground mb-4">Send a system alert to all active users.</p>
      <div className="space-y-4">
        <textarea
          className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground outline-none focus:border-primary resize-none h-24"
          placeholder="System message content..."
          value={msg}
          onChange={e => setMsg(e.target.value)}
          data-testid="input-broadcast"
        />
        <Button onClick={handleSend} disabled={!msg || sendNotification.isPending} className="w-full">
          Send Broadcast
        </Button>
      </div>
    </Card>
  );
}

function PasswordRequests() {
  const { data: requests } = useAdminPasswordRequests();
  const { resolvePassword } = useAdminActions();

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-destructive" /> Pending Password Resets
      </h2>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {!requests?.length && <div className="text-muted-foreground text-center py-8">No pending requests.</div>}
        {requests?.filter(r => r.status === "pending").map(req => (
          <div key={req.id} className="bg-secondary p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold">@{req.username}</div>
              <div className="text-sm text-muted-foreground mt-1 bg-background px-2 py-1 rounded-md border border-border font-mono inline-block">
                Desired: {req.desiredPassword}
              </div>
            </div>
            <Button size="sm" onClick={() => resolvePassword.mutate(req.id)} disabled={resolvePassword.isPending}>
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
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
        <span className="text-sm text-muted-foreground font-normal ml-2">— click a user to view their posts</span>
      </h2>
      <div className="space-y-3">
        {users?.map(u => (
          <div
            key={u.id}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
            onClick={() => onSelectUser(u)}
            data-testid={`row-user-${u.id}`}
          >
            <Avatar url={u.profilePicture} name={u.name || "U"} />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{u.name}</div>
              <div className="text-sm text-muted-foreground">@{u.username} · {u.email}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
              u.status === "active" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
            }`}>
              {u.status?.toUpperCase()}
            </span>
            <div onClick={e => e.stopPropagation()}>
              {u.status === "active" ? (
                <Button variant="destructive" size="sm" onClick={() => restrictUser.mutate(u.id)}>
                  <Ban className="w-4 h-4 mr-1" /> Restrict
                </Button>
              ) : (
                <Button className="bg-green-500 hover:bg-green-600 text-white" size="sm" onClick={() => reactivateUser.mutate(u.id)}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Reactivate
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
  const { data: posts, isLoading } = useUserPosts(user.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
        data-testid="button-back-admin"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Users
      </button>

      <Card className="flex items-center gap-6 p-6">
        <Avatar url={user.profilePicture} name={user.name || "U"} size="xl" />
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="text-muted-foreground">@{user.username}</p>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span>{user.email}</span>
            <span>{user.phone}</span>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-bold ${
          user.status === "active" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
        }`}>
          {user.status?.toUpperCase()}
        </span>
      </Card>

      <h3 className="text-xl font-bold px-1">Posts by {user.name} ({posts?.length ?? 0})</h3>

      {isLoading ? (
        <div className="text-center text-muted-foreground animate-pulse py-10">Loading posts...</div>
      ) : !posts?.length ? (
        <Card className="text-center py-12 text-muted-foreground">This user hasn't posted anything yet.</Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id} data-testid={`card-post-${post.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} size="sm" />
                  <div>
                    <div className="font-bold text-sm">{post.author?.name}</div>
                    <div className="text-xs text-muted-foreground"><TimeAgo date={post.createdAt!} /></div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes.length}</span>
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
