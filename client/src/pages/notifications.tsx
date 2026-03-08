import { useState } from "react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { useAcceptFriendRequest } from "@/hooks/use-users";
import { Card, Button, TimeAgo, Avatar } from "@/components/ui/shared";
import { Bell, Heart, MessageCircle, UserPlus, Info, Check } from "lucide-react";
import { useLocation } from "wouter";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const acceptRequest = useAcceptFriendRequest();
  const [, setLocation] = useLocation();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-10">Loading notifications...</div>;

  const getSenderId = (notif: any) =>
    notif.senderId?.id || notif.senderId?._id || (typeof notif.senderId === "string" ? notif.senderId : null);

  const handleNotifClick = (notif: any) => {
    if (!notif.read) markRead.mutate(notif.id);
    const senderId = getSenderId(notif);
    if (notif.type === "friend_request") {
      setLocation("/friends");
    } else if (notif.type === "friend_accept" && senderId) {
      setLocation(`/profile/${senderId}`);
    } else if ((notif.type === "like" || notif.type === "comment" || notif.type === "friend_post") && notif.postId) {
      setLocation("/home");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      <h1 className="text-3xl font-display font-bold mb-8">Notifications</h1>

      {notifications?.length === 0 ? (
        <Card className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold">All caught up!</h3>
          <p className="text-muted-foreground">You have no new notifications.</p>
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
          };

          const isFriendRequest = notif.type === "friend_request";
          const senderId = getSenderId(notif);
          const senderObj = typeof (notif as any).senderId === "object" ? (notif as any).senderId : null;

          return (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`cursor-pointer flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-md ${
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
                <Avatar
                  url={senderObj.profilePicture}
                  name={senderObj.name || "?"}
                  size="sm"
                />
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${!notif.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {notif.content}
                </p>
                <div className="mt-1 text-xs text-primary font-medium">
                  <TimeAgo date={notif.createdAt!} />
                </div>
                {isFriendRequest && !notif.read && (
                  <p className="text-xs text-muted-foreground mt-1">Tap to view request</p>
                )}
                {isFriendRequest && notif.read && (
                  <p className="text-xs text-green-600 font-medium mt-1">Already friends</p>
                )}
                {(notif.type === "friend_accept") && senderId && (
                  <p className="text-xs text-muted-foreground mt-1">Tap to view profile</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {!notif.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                )}
                {isFriendRequest && !notif.read && senderId && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAcceptingId(notif.id);
                      acceptRequest.mutate(senderId, {
                        onSettled: () => setAcceptingId(null),
                      });
                      markRead.mutate(notif.id);
                    }}
                    disabled={acceptingId === notif.id}
                    data-testid={`button-accept-request-${notif.id}`}
                    className="text-xs px-3 py-1 h-auto"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {acceptingId === notif.id ? "Accepting..." : "Accept"}
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
