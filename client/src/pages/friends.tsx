import { useState } from "react";
import { useDiscoverUsers, useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useUnfriend, useAuthUser } from "@/hooks/use-users";
import { useGetOrCreateConversation } from "@/hooks/use-chats";
import { Card, Button, Avatar, isOnline } from "@/components/ui/shared";
import { UserPlus, UserCheck, UserMinus, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
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
  const { data: currentUser } = useAuthUser();
  const sendReq = useSendFriendRequest();

  if (isLoading) return <div className="col-span-full text-center py-10">Loading suggestions...</div>;
  if (!users?.length) return <div className="col-span-full text-center py-10 text-muted-foreground">No new people to discover right now.</div>;

  return users.map(user => {
    const isRequestPending = currentUser?.sentRequests?.includes(user.id as string) || false;
    return (
      <UserCard key={user.id} user={user}>
        <Button 
          size="sm" 
          onClick={() => sendReq.mutate(user.id as string)} 
          disabled={sendReq.isPending || isRequestPending}
          variant={isRequestPending ? "outline" : "default"}
        >
          <UserPlus className="w-4 h-4 mr-2" /> {isRequestPending ? "Request Sent" : "Add Friend"}
        </Button>
      </UserCard>
    );
  });
}

function FriendsListTab() {
  const { data: users, isLoading } = useFriends();
  const unfriend = useUnfriend();
  const getOrCreate = useGetOrCreateConversation();
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="col-span-full text-center py-10">Loading friends...</div>;
  if (!users?.length) return <div className="col-span-full text-center py-10 text-muted-foreground">You haven't added any friends yet.</div>;

  return users.map(user => (
    <UserCard key={user.id} user={user}>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            const conv = await getOrCreate.mutateAsync(user.id as string);
            setLocation(`/chats?conv=${conv.id}`);
          }}
          disabled={getOrCreate.isPending}
          data-testid={`button-message-friend-${user.id}`}
        >
          <MessageSquare className="w-4 h-4 mr-1" /> Message
        </Button>
        <Button variant="secondary" size="sm" onClick={() => {
          if (confirm(`Unfriend ${user.name}?`)) unfriend.mutate(user.id as string);
        }} disabled={unfriend.isPending} data-testid={`button-unfriend-${user.id}`}>
          <UserMinus className="w-4 h-4 mr-1" /> Unfriend
        </Button>
      </div>
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
  const displayName = user.name || user.fullName || user.username || "Unknown";
  const [, setLocation] = useLocation();
  return (
    <Card className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left hover:border-primary/30 transition-colors">
      <button
        onClick={() => setLocation(`/profile/${user.id}`)}
        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
        data-testid={`button-view-profile-${user.id}`}
      >
        <Avatar url={user.profilePicture} name={displayName} size="lg" online={isOnline((user as any).lastSeen)} />
      </button>
      <div
        className="flex-1 cursor-pointer"
        onClick={() => setLocation(`/profile/${user.id}`)}
      >
        <h3 className="font-bold text-lg hover:text-primary transition-colors">{displayName}</h3>
        <p className="text-muted-foreground text-sm">@{user.username}</p>
      </div>
      <div>{children}</div>
    </Card>
  );
}
