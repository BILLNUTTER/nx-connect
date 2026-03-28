import { useLocation } from "wouter";
import { useUserProfile, useUserPosts, useSendFriendRequest, useUnfriend, useAuthUser } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { useGetOrCreateConversation } from "@/hooks/use-chats";
import { Card, Button, Avatar, TimeAgo, isOnline, LinkedText, VerifiedBadge } from "@/components/ui/shared";
import { ArrowLeft, UserPlus, UserMinus, UserCheck, Heart, MessageCircle, MessageSquare, EyeOff, Eye, Trash2, Globe } from "lucide-react";
import { useLikePost, useDeletePost, useHidePost } from "@/hooks/use-posts";
import type { Post } from "@shared/schema";

export default function UserProfilePage() {
  const [location, setLocation] = useLocation();
  const id = location.split("/profile/")[1];
  const { user: currentUser } = useAuth();
  const { data: currentUserFull } = useAuthUser();
  const { data: profile, isLoading } = useUserProfile(id);
  const { data: posts, isLoading: postsLoading } = useUserPosts(id);
  const sendReq = useSendFriendRequest();
  const unfriend = useUnfriend();
  const getOrCreate = useGetOrCreateConversation();

  if (!id || isLoading) return (
    <div className="max-w-2xl mx-auto text-center py-20 text-muted-foreground animate-pulse">Loading profile...</div>
  );

  if (!profile) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-muted-foreground">User not found.</p>
    </div>
  );

  const isSelf = currentUser?.id === id;
  const friends: string[] = (currentUserFull as any)?.friends || [];
  const sentRequests: string[] = (currentUserFull as any)?.sentRequests || [];
  const friendRequests: string[] = (currentUserFull as any)?.friendRequests || [];

  const isFriend = friends.some(f => f === id || (f as any)?.id === id || (f as any)?._id === id);
  const hasSentRequest = sentRequests.some(r => r === id || (r as any)?.id === id);
  const hasReceivedRequest = friendRequests.some(r => r === id || (r as any)?.id === id);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
        data-testid="button-back"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <Card className="p-0 overflow-hidden">
        <div className="relative h-32">
          {(profile as any).coverPhoto ? (
            <img src={(profile as any).coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10" />
          )}
        </div>
        <div className="text-center pb-6 px-6">
          <div className="flex justify-center -mt-10 mb-3">
            <div className="ring-4 ring-card rounded-full">
              <Avatar url={profile.profilePicture} name={profile.name || "U"} size="xl" online={isOnline((profile as any).lastSeen)} />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2" data-testid="text-profile-name">
            {profile.name}
            {(profile as any).isVerified && <VerifiedBadge size="md" />}
          </h1>
          <p className="text-muted-foreground mt-1">@{profile.username}</p>

        <div className="flex justify-center gap-8 mt-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{posts?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{(profile as any).friends?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Friends</div>
          </div>
        </div>

        {!isSelf && (
          <div className="flex justify-center gap-3 flex-wrap">
            {isFriend ? (
              <>
                <Button variant="outline" onClick={() => unfriend.mutate(id)} disabled={unfriend.isPending} data-testid="button-unfriend">
                  <UserMinus className="w-4 h-4 mr-2" /> Unfriend
                </Button>
                <Button
                  onClick={async () => {
                    const conv = await getOrCreate.mutateAsync(id);
                    setLocation(`/chats?conv=${conv.id}`);
                  }}
                  disabled={getOrCreate.isPending}
                  data-testid="button-message-user"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Message
                </Button>
              </>
            ) : hasSentRequest ? (
              <Button variant="outline" disabled data-testid="button-request-sent">
                <UserCheck className="w-4 h-4 mr-2" /> Request Sent
              </Button>
            ) : hasReceivedRequest ? (
              <Button variant="outline" disabled data-testid="button-pending-request">
                <UserCheck className="w-4 h-4 mr-2" /> Respond to Request
              </Button>
            ) : (
              <Button onClick={() => sendReq.mutate(id)} disabled={sendReq.isPending} data-testid="button-add-friend">
                <UserPlus className="w-4 h-4 mr-2" /> Add Friend
              </Button>
            )}
          </div>
        )}
        </div>
      </Card>

      <h2 className="text-xl font-bold px-1">{isSelf ? "Your Posts" : `${profile.name}'s Posts`}</h2>

      {postsLoading ? (
        <div className="text-center text-muted-foreground animate-pulse py-8">Loading posts...</div>
      ) : !posts?.length ? (
        <Card className="text-center py-12 text-muted-foreground">No posts yet.</Card>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />)
      )}
    </div>
  );
}

function PostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const deletePost = useDeletePost();
  const hidePost = useHidePost();
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id;
  const isOwn = authorId === currentUserId;
  const isHidden = (post as any).hidden;

  return (
    <Card className={`transition-all hover:shadow-xl hover:border-border overflow-hidden ${isHidden ? "border-amber-400/40 bg-amber-50/5" : ""}`} data-testid={`post-card-${post.id}`}>
      {/* Author header — same style as the home feed */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => authorId && setLocation(`/profile/${authorId}`)} className="shrink-0 hover:opacity-80 transition-opacity">
          <Avatar url={(post.author as any)?.profilePicture} name={post.author?.name || "U"} size="md" online={isOnline((post.author as any)?.lastSeen)} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => authorId && setLocation(`/profile/${authorId}`)} className="font-semibold hover:underline text-left text-sm text-foreground">
              {post.author?.name}
            </button>
            {(post.author as any)?.isVerified && <VerifiedBadge size="xs" />}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TimeAgo date={post.createdAt!} />
            <span>·</span>
            <Globe className="w-3 h-3" />
            {isHidden && <span className="text-amber-500 font-medium ml-1">· Hidden</span>}
          </div>
        </div>
        {isOwn && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => hidePost.mutate(post.id)}
              disabled={hidePost.isPending}
              className={`p-1.5 rounded-lg transition-colors ${isHidden ? "text-amber-500 hover:bg-amber-100/20" : "text-muted-foreground hover:bg-secondary"}`}
              title={isHidden ? "Unhide" : "Hide from public"}
              data-testid={`button-hide-post-${post.id}`}
            >
              {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { if (confirm("Delete this post?")) deletePost.mutate(post.id); }}
              disabled={deletePost.isPending}
              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete post"
              data-testid={`button-delete-post-${post.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => setLocation(`/post/${post.id}`)}
        className="w-full text-left mb-3"
        data-testid={`button-open-post-${post.id}`}
      >
        {(!(post as any).imageUrl || (
          (post as any).content !== "📷" &&
          !(post as any).content?.toLowerCase().includes("updated their profile picture")
        )) && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed line-clamp-5"><LinkedText text={post.content} /></p>
        )}
      </button>

      {(post as any).imageUrl && (
        <div className="rounded-lg overflow-hidden border border-border/40 cursor-pointer mb-3" onClick={() => setLocation(`/post/${post.id}`)}>
          <img src={(post as any).imageUrl} alt="Post" className="w-full object-cover max-h-[240px]" />
        </div>
      )}

      <div className="flex items-center gap-4 pt-3 border-t border-border/50">
        <button
          onClick={(e) => { e.stopPropagation(); likePost.mutate(post.id); }}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
          {post.likes.length > 0 ? post.likes.length : ""} {post.likes.length === 1 ? "Like" : "Likes"}
        </button>
        <button
          onClick={() => setLocation(`/post/${post.id}`)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          data-testid={`button-comments-${post.id}`}
        >
          <MessageCircle className="w-5 h-5" /> View Post
        </button>
      </div>
    </Card>
  );
}
