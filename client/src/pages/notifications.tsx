import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { useAcceptFriendRequest } from "@/hooks/use-users";
import { Card, Button, TimeAgo } from "@/components/ui/shared";
import { Bell, Heart, MessageCircle, UserPlus, Info, Check, X } from "lucide-react";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const acceptRequest = useAcceptFriendRequest();

  if (isLoading) return <div className="text-center py-10">Loading notifications...</div>;

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
            like: <Heart className="w-6 h-6 text-pink-500" />,
            comment: <MessageCircle className="w-6 h-6 text-blue-500" />,
            friend_request: <UserPlus className="w-6 h-6 text-primary" />,
            friend_accept: <UserPlus className="w-6 h-6 text-green-500" />,
            friend_post: <Bell className="w-6 h-6 text-accent" />,
            system: <Info className="w-6 h-6 text-yellow-500" />
          };

          const isFriendRequest = notif.type === 'friend_request';
          const senderId = (notif as any).senderId?.id || (notif as any).sender?.id;

          return (
            <Card 
              key={notif.id} 
              className={`flex items-start gap-4 transition-colors ${!notif.read ? "bg-primary/5 border-primary/20" : ""}`}
            >
              <div className="p-3 bg-background rounded-full shadow-sm border border-border/50">
                {icons[notif.type as keyof typeof icons]}
              </div>
              <div className="flex-1">
                <p className={`text-lg ${!notif.read ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                  {notif.content}
                </p>
                <div className="mt-2 text-sm text-primary font-medium">
                  <TimeAgo date={notif.createdAt!} />
                </div>
              </div>
              <div className="flex gap-2">
                {isFriendRequest && senderId && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        acceptRequest.mutate(senderId);
                        markRead.mutate(notif.id);
                      }}
                      disabled={acceptRequest.isPending}
                      data-testid="button-accept-request"
                    >
                      <Check className="w-4 h-4 mr-1" /> Accept
                    </Button>
                  </>
                )}
                {!notif.read && !isFriendRequest && (
                  <div className="w-3 h-3 rounded-full bg-primary shadow-sm shadow-primary/50 mt-4"></div>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
