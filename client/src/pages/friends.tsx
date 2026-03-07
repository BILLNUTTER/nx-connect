import { useState } from "react";
import { useDiscoverUsers, useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useUnfriend } from "@/hooks/use-users";
import { Card, Button, Avatar } from "@/components/ui/shared";
import { UserPlus, UserCheck, UserMinus, Search } from "lucide-react";
import type { User } from "@shared/schema";

export default function FriendsPage() {
  const [tab, setTab] = useState<"discover" | "friends" | "requests">("discover");
  
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex bg-card rounded-2xl p-1 shadow-sm border border-border/50">
        {[
          { id: "discover", label: "Discover" },
          { id: "friends", label: "My Friends" },
          { id: "requests", label: "Requests" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              tab === t.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tab === "discover" && <DiscoverTab />}
        {tab === "friends" && <FriendsListTab />}
        {tab === "requests" && <RequestsTab />}
      </div>
    </div>
  );
}

function DiscoverTab() {
  const { data: users, isLoading } = useDiscoverUsers();
  const sendReq = useSendFriendRequest();

  if (isLoading) return <div className="col-span-full text-center py-10">Loading suggestions...</div>;
  if (!users?.length) return <div className="col-span-full text-center py-10 text-muted-foreground">No new people to discover right now.</div>;

  return users.map(user => (
    <UserCard key={user.id} user={user}>
      <Button size="sm" onClick={() => sendReq.mutate(user.id)} disabled={sendReq.isPending}>
        <UserPlus className="w-4 h-4 mr-2" /> Add Friend
      </Button>
    </UserCard>
  ));
}

function FriendsListTab() {
  const { data: users, isLoading } = useFriends();
  const unfriend = useUnfriend();

  if (isLoading) return <div className="col-span-full text-center py-10">Loading friends...</div>;
  if (!users?.length) return <div className="col-span-full text-center py-10 text-muted-foreground">You haven't added any friends yet.</div>;

  return users.map(user => (
    <UserCard key={user.id} user={user}>
      <Button variant="secondary" size="sm" onClick={() => {
        if(confirm(`Unfriend ${user.name}?`)) unfriend.mutate(user.id);
      }} disabled={unfriend.isPending}>
        <UserMinus className="w-4 h-4 mr-2" /> Unfriend
      </Button>
    </UserCard>
  ));
}

function RequestsTab() {
  const { data: users, isLoading } = useFriendRequests();
  const acceptReq = useAcceptFriendRequest();

  if (isLoading) return <div className="col-span-full text-center py-10">Loading requests...</div>;
  if (!users?.length) return <div className="col-span-full text-center py-10 text-muted-foreground">No pending friend requests.</div>;

  return users.map(user => (
    <UserCard key={user.id} user={user}>
      <Button size="sm" onClick={() => acceptReq.mutate(user.id)} disabled={acceptReq.isPending}>
        <UserCheck className="w-4 h-4 mr-2" /> Accept
      </Button>
    </UserCard>
  ));
}

function UserCard({ user, children }: { user: User, children: React.ReactNode }) {
  return (
    <Card className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left hover:border-primary/30 transition-colors">
      <Avatar url={user.profilePicture} name={user.name} size="lg" />
      <div className="flex-1">
        <h3 className="font-bold text-lg">{user.name}</h3>
        <p className="text-muted-foreground text-sm">@{user.username}</p>
      </div>
      <div>{children}</div>
    </Card>
  );
}
