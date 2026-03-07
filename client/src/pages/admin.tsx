import { useState } from "react";
import { useAdminStats, useAdminUsers, useAdminPasswordRequests, useAdminActions } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input } from "@/components/ui/shared";
import { ShieldAlert, Users, CheckCircle, Ban, BellRing } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(user?.isAdmin || false);

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
          />
          <Button 
            className="w-full"
            onClick={() => {
              // Simple mock validation for demonstration
              if (adminKey === "admin123" || user?.isAdmin) setIsAuthenticated(true);
              else alert("Invalid Key");
            }}
          >
            Authenticate
          </Button>
        </Card>
      </div>
    );
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

      <UsersManagement />
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
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><BellRing className="w-5 h-5 text-accent"/> Broadcast Notification</h2>
      <p className="text-sm text-muted-foreground mb-4">Send a system alert to all active users on the platform.</p>
      <div className="space-y-4">
        <textarea 
          className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground outline-none focus:border-primary resize-none h-24"
          placeholder="System message content..."
          value={msg}
          onChange={e => setMsg(e.target.value)}
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
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-destructive"/> Pending Password Resets</h2>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {!requests?.length && <div className="text-muted-foreground text-center py-8">No pending requests.</div>}
        {requests?.filter(r => r.status === 'pending').map(req => (
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

function UsersManagement() {
  const { data: users } = useAdminUsers();
  const { restrictUser, reactivateUser } = useAdminActions();

  return (
    <Card>
      <h2 className="text-xl font-bold mb-6">User Management</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="pb-3 font-medium">User</th>
              <th className="pb-3 font-medium">Contact</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users?.map(u => (
              <tr key={u.id} className="hover:bg-secondary/50 transition-colors">
                <td className="py-4">
                  <div className="font-bold">{u.name}</div>
                  <div className="text-sm text-muted-foreground">@{u.username}</div>
                </td>
                <td className="py-4">
                  <div className="text-sm">{u.email}</div>
                  <div className="text-sm text-muted-foreground">{u.phone}</div>
                </td>
                <td className="py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    u.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {u.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 text-right">
                  {u.status === 'active' ? (
                    <Button variant="destructive" size="sm" onClick={() => restrictUser.mutate(u.id)}>
                      <Ban className="w-4 h-4 mr-2" /> Restrict
                    </Button>
                  ) : (
                    <Button className="bg-green-500 hover:bg-green-600 text-white" size="sm" onClick={() => reactivateUser.mutate(u.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Reactivate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
