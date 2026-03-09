import { useState } from "react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-notifications";
import { useAcceptFriendRequest } from "@/hooks/use-users";
import { Card, Button, TimeAgo, Avatar, isOnline } from "@/components/ui/shared";
import { Bell, Heart, MessageCircle, UserPlus, Info, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const acceptRequest = useAcceptFriendRequest();
  const [, setLocation] = useLocation();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Loading notifications...</div>;

  const getSenderId = (notif: any) =>
    notif.senderId?.id || notif.senderId?._id || (typeof notif.senderId === "string" ? notif.senderId : null);

  const getPostId = (notif: any) => {
    const p = notif.postId;
    if (!p) return null;
    return typeof p === "string" ? p : (p.id || p._id);
  };

  const getPostSnippet = (notif: any) => {
    const p = notif.postId;
    if (!p || typeof p === "string") return null;
    return p.content ? String(p.content).slice(0, 60) + (p.content.length > 60 ? "…" : "") : null;
  };

  const handleNotifClick = (notif: any) => {
    if (!notif.read) markRead.mutate(notif.id);
    const senderId = getSenderId(notif);
    const postId = getPostId(notif);
    if (notif.type === "friend_request") {
      setLocation(notif.read && senderId ? `/profile/${senderId}` : "/friends?tab=requests");
    } else if (notif.type === "friend_accept" && senderId) {
      setLocation(`/profile/${senderId}`);
    } else if ((notif.type === "like" || notif.type === "comment") && postId) {
      setLocation(`/post/${postId}`);
    } else if (notif.type === "friend_post" && postId) {
      setLocation(`/post/${postId}`);
    } else if (notif.type === "friend_suggestion") {
      const sId = getSenderId(notif);
      if (sId) setLocation(`/profile/${sId}`);
      else setLocation("/friends?tab=discover");
    } else if (notif.type === "system" && notif.content?.toLowerCase().includes("follow suggestion")) {
      setLocation("/friends?tab=discover");
    } else if (notif.type === "system" && notif.content?.toLowerCase().includes("joined")) {
      setLocation("/friends?tab=discover");
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2"
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4" />
            {markAllRead.isPending ? "Marking…" : "Mark all read"}
          </Button>
        )}
      </div>

      {notifications?.length === 0 ? (
        <Card className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold">All caught up!</h3>
          <p className="text-muted-foreground">You have no notifications.</p>
        </Card>
      ) : (
        notifications?.map(notif => {
          const icons = {
            like: <Heart className="w-5 h-5 text-pink-500" />,
            comment: <MessageCircle className="w-5 h-5 text-blue-500" />,
            friend_request: <UserPlus className="w-5 h-5 text-primary" />,
            friend_accept: <UserPlus className="w-5 h-5 text-green-500" />,
            friend_post: <Bell className="w-5 h-5 text-accent" />,
            system: <Info className="w-5 h-5 text-yellow-500" />,
            friend_suggestion: <UserPlus className="w-5 h-5 text-violet-500" />,
          };

          const isFriendRequest = notif.type === "friend_request";
          const isFriendSuggestion = notif.type === "friend_suggestion";
          const isPostNotif = notif.type === "like" || notif.type === "comment" || notif.type === "friend_post";
          const senderId = getSenderId(notif);
          const postId = getPostId(notif);
          const postSnippet = getPostSnippet(notif);
          const senderObj = typeof (notif as any).senderId === "object" ? (notif as any).senderId : null;
          const isClickable = (isPostNotif && postId) || notif.type === "friend_accept" || notif.type === "friend_request" || isFriendSuggestion;

          return (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                isClickable ? "cursor-pointer hover:shadow-md" : "cursor-default"
              } ${
                !notif.read
                  ? "bg-primary/5 border-primary/20 hover:bg-primary/8"
                  : "bg-card border-border/50 hover:bg-secondary/30"
              }`}
              data-testid={`notification-item-${notif.id}`}
            >
              <div className="p-2.5 bg-background rounded-full shadow-sm border border-border/50 shrink-0">
                {icons[notif.type as keyof typeof icons]}
              </div>

              {senderObj && (
                <Avatar url={senderObj.profilePicture} name={senderObj.name || "?"} size="sm" online={isOnline(senderObj?.lastSeen)} />
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${!notif.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                  {notif.content}
                </p>

                {postSnippet && (
                  <div className="mt-1.5 px-3 py-1.5 bg-secondary/60 rounded-lg border border-border/40 text-xs text-muted-foreground italic truncate">
                    "{postSnippet}"
                  </div>
                )}

                <div className="mt-1.5 flex items-center gap-2 text-xs text-primary font-medium">
                  <TimeAgo date={notif.createdAt!} />
                  {isPostNotif && postId && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      · <ExternalLink className="w-3 h-3" /> Tap to view post
                    </span>
                  )}
                  {notif.type === "friend_accept" && senderId && (
                    <span className="text-muted-foreground">· Tap to view profile</span>
                  )}
                  {isFriendSuggestion && (
                    <span className="text-muted-foreground">· Tap to view profile &amp; follow</span>
                  )}
                  {isFriendRequest && !notif.read && (
                    <span className="text-muted-foreground">· Tap to view request</span>
                  )}
                </div>

                {isFriendRequest && notif.read && (
                  <p className="text-xs text-green-600 font-medium mt-1">Request handled</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {!notif.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                )}
                {isFriendRequest && !notif.read && senderId && (
                  <Button
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      setAcceptingId(notif.id);
                      acceptRequest.mutate(senderId, { onSettled: () => setAcceptingId(null) });
                      markRead.mutate(notif.id);
                    }}
                    disabled={acceptingId === notif.id}
                    data-testid={`button-accept-request-${notif.id}`}
                    className="text-xs px-3 py-1 h-auto"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {acceptingId === notif.id ? "Accepting…" : "Accept"}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
