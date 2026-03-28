import { useState, useCallback, useRef, useEffect } from "react";
import { useDiscoverUsers, useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useUnfriend, useAuthUser } from "@/hooks/use-users";
import { useGetOrCreateConversation } from "@/hooks/use-chats";
import { Card, Button, Avatar, isOnline, VerifiedBadge } from "@/components/ui/shared";
import { UserPlus, UserCheck, UserMinus, MessageSquare, Search, X, Link2, Users } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function FriendsPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTab = (params.get("tab") as "discover" | "friends" | "requests") || "discover";
  const [tab, setTab] = useState<"discover" | "friends" | "requests">(initialTab);
  const { data: requests } = useFriendRequests();
  const requestCount = requests?.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">
      <div className="flex bg-card rounded-2xl p-1 shadow-sm border border-border/50">
        {[
          { id: "discover", label: "Discover" },
          { id: "friends", label: "My Friends" },
          { id: "requests", label: "Requests", count: requestCount }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`relative flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              tab === t.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary/50"
            }`}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
            {(t as any).count > 0 && tab !== t.id && (
              <span className="absolute top-1 right-2 min-w-[18px] h-[18px] bg-destructive text-[10px] font-bold text-white flex items-center justify-center rounded-full px-1">
                {(t as any).count > 9 ? "9+" : (t as any).count}
              </span>
            )}
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
  const { data: suggestedUsers, isLoading } = useDiscoverUsers();
  const { data: currentUser } = useAuthUser();
  const sendReq = useSendFriendRequest();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [inviteUrl, setInviteUrl] = useState(window.location.origin);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch("/api/app-url").then((data: any) => {
      if (data?.url) setInviteUrl(data.url);
    }).catch(() => {});
  }, []);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast({ title: "Link copied!", description: "Share it with friends to invite them to NX-Connect." });
    });
  };

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        setSearchResults(data.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const displayUsers = searchResults !== null ? searchResults : (suggestedUsers || []);
  const isSearchMode = searchResults !== null;

  const renderUser = (user: any) => {
    const isFriend = currentUser?.friends?.includes(user.id as string) || false;
    const isRequestPending = currentUser?.sentRequests?.includes(user.id as string) || false;
    const hasReceivedRequest = currentUser?.friendRequests?.includes(user.id as string) || false;
    return (
      <UserCard key={user.id} user={user}>
        {isFriend ? (
          <Button size="sm" variant="outline" disabled>
            <UserCheck className="w-4 h-4 mr-2" /> Friends
          </Button>
        ) : hasReceivedRequest ? (
          <Button size="sm" onClick={() => sendReq.mutate(user.id as string)} disabled={sendReq.isPending}>
            <UserCheck className="w-4 h-4 mr-2" /> Accept
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => sendReq.mutate(user.id as string)}
            disabled={sendReq.isPending || isRequestPending}
            variant={isRequestPending ? "outline" : "default"}
          >
            <UserPlus className="w-4 h-4 mr-2" /> {isRequestPending ? "Request Sent" : "Add Friend"}
          </Button>
        )}
      </UserCard>
    );
  };

  return (
    <>
      <div className="col-span-full mb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search everyone on NX-Connect..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-10 py-3 text-sm outline-none focus:border-primary transition-colors"
            data-testid="input-discover-search"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setSearchResults(null); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-discover-search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isSearchMode && (
          <p className="text-xs text-muted-foreground mt-2 ml-1">
            {searching ? "Searching..." : `${displayUsers.length} result${displayUsers.length !== 1 ? "s" : ""} for "${query}"`}
          </p>
        )}
      </div>

      {!isSearchMode && isLoading && <div className="col-span-full text-center py-10">Loading suggestions...</div>}
      {!isSearchMode && !isLoading && displayUsers.length === 0 && (
        <div className="col-span-full flex flex-col items-center py-12 px-4 gap-5">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold mb-1">No one new to discover</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              It looks like you already know everyone here! Invite your friends to join NX-Connect.
            </p>
          </div>
          <div className="w-full max-w-sm bg-secondary/60 rounded-2xl p-4 flex items-center gap-3 border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5 font-medium">Invite link</p>
              <p className="text-sm font-mono truncate text-foreground">{inviteUrl}</p>
            </div>
            <Button
              onClick={handleCopyInvite}
              size="sm"
              className="shrink-0 gap-1.5"
              data-testid="button-copy-invite-link"
            >
              <Link2 className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">or try searching for someone above</p>
        </div>
      )}
      {searching && <div className="col-span-full text-center py-10 text-muted-foreground text-sm">Searching...</div>}
      {!searching && displayUsers.map(renderUser)}
    </>
  );
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
        <h3 className="font-bold text-lg hover:text-primary transition-colors flex items-center gap-1.5">
          {displayName}
          {(user as any).isVerified && <VerifiedBadge size="sm" />}
        </h3>
        <p className="text-muted-foreground text-sm">@{user.username}</p>
      </div>
      <div>{children}</div>
    </Card>
  );
}
