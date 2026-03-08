import { useState } from "react";
import { useLocation } from "wouter";
import { usePost, useLikePost, useComments, useCreateComment, useDeletePost, useHidePost } from "@/hooks/use-posts";
import { useFriends } from "@/hooks/use-users";
import { useGetOrCreateConversation } from "@/hooks/use-chats";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo, isOnline, LinkedText } from "@/components/ui/shared";
import { ArrowLeft, Heart, MessageCircle, Send, MessageSquare, Trash2, EyeOff, Eye } from "lucide-react";

export default function PostPage() {
  const [location, setLocation] = useLocation();
  const id = location.split("/post/")[1];
  const { user } = useAuth();
  const { data: post, isLoading } = usePost(id);
  const { data: comments, isLoading: commentsLoading } = useComments(id);
  const likePost = useLikePost();
  const deletePost = useDeletePost();
  const hidePost = useHidePost();
  const createComment = useCreateComment();
  const { data: friends } = useFriends();
  const getOrCreate = useGetOrCreateConversation();
  const [content, setContent] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) return (
    <div className="max-w-2xl mx-auto py-20 text-center text-muted-foreground animate-pulse">Loading post...</div>
  );

  if (!post) return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <p className="text-muted-foreground mb-4">Post not found.</p>
      <Button onClick={() => setLocation("/home")}>Go Home</Button>
    </div>
  );

  const friendIds = new Set((friends || []).map((f: any) => f.id || f._id));
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;
  const isOwnPost = authorId === user?.id;
  const isFriend = !isOwnPost && authorId && friendIds.has(authorId);
  const hasLiked = post.likes.includes(user?.id || "");
  const isHidden = (post as any).hidden;

  const handleSend = async () => {
    if (!content.trim()) return;
    await createComment.mutateAsync({ postId: id, content });
    setContent("");
  };

  const handleMessage = async () => {
    if (!authorId) return;
    const conv = await getOrCreate.mutateAsync(authorId);
    setLocation(`/chats?conv=${conv.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
        data-testid="button-back"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => authorId && setLocation(`/profile/${authorId}`)}
              className="hover:opacity-80 transition-opacity"
              data-testid="button-post-author-avatar"
            >
              <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} online={isOnline((post.author as any)?.lastSeen)} />
            </button>
            <div>
              <button
                onClick={() => authorId && setLocation(`/profile/${authorId}`)}
                className="font-bold text-foreground hover:underline text-left"
                data-testid="button-post-author-name"
              >
                {post.author?.name}
              </button>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                @{post.author?.username} · <TimeAgo date={post.createdAt!} />
                {isHidden && <span className="text-amber-500 font-semibold ml-1">· Hidden</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFriend && (
              <button
                onClick={handleMessage}
                disabled={getOrCreate.isPending}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
                data-testid="button-message-author"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </button>
            )}
            {isOwnPost && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => hidePost.mutate(id)}
                  disabled={hidePost.isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-secondary/60 hover:bg-secondary px-3 py-1.5 rounded-full transition-colors"
                  data-testid="button-hide-post"
                >
                  {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {isHidden ? "Unhide" : "Hide"}
                </button>
                <button
                  onClick={() => { if (confirm("Delete this post?")) deletePost.mutate(id, { onSuccess: () => setLocation("/home") }); }}
                  disabled={deletePost.isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 px-3 py-1.5 rounded-full transition-colors"
                  data-testid="button-delete-post"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xl leading-relaxed whitespace-pre-wrap mb-6" data-testid="text-post-content"><LinkedText text={post.content} /></p>

        <div className="flex items-center gap-4 pt-4 border-t border-border/50">
          <button
            onClick={() => likePost.mutate(id)}
            className={`flex items-center gap-2 font-semibold transition-colors ${hasLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
            data-testid="button-like-post"
          >
            <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
            {post.likes.length} {post.likes.length === 1 ? "Like" : "Likes"}
          </button>
          <span className="text-muted-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {comments?.length ?? 0} Comments
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold mb-4">Comments</h3>

        {commentsLoading ? (
          <div className="text-center text-muted-foreground py-6 animate-pulse">Loading comments...</div>
        ) : !comments?.length ? (
          <div className="text-center text-muted-foreground py-6">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No comments yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <button
                  onClick={() => {
                    const cAuthorId = (c.author as any)?.id || (c.authorId as any)?.id;
                    if (cAuthorId) setLocation(`/profile/${cAuthorId}`);
                  }}
                  className="shrink-0 hover:opacity-80 transition-opacity"
                >
                  <Avatar url={c.author?.profilePicture} name={c.author?.name || "U"} size="sm" />
                </button>
                <div className="flex-1 bg-secondary/50 rounded-2xl p-3">
                  <div className="flex items-baseline gap-2 mb-1">
                    <button
                      onClick={() => {
                        const cAuthorId = (c.author as any)?.id || (c.authorId as any)?.id;
                        if (cAuthorId) setLocation(`/profile/${cAuthorId}`);
                      }}
                      className="font-bold text-sm hover:underline text-left"
                    >
                      {c.author?.name}
                    </button>
                    <span className="text-xs text-muted-foreground"><TimeAgo date={c.createdAt!} /></span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Avatar url={user?.profilePicture} name={user?.name || "U"} size="sm" />
          <div className="flex-1 flex items-center bg-secondary rounded-full px-4 py-2.5 gap-2">
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-transparent border-none outline-none text-sm"
              onKeyDown={e => e.key === "Enter" && handleSend()}
              data-testid="input-comment"
            />
            <button
              onClick={handleSend}
              disabled={!content.trim() || createComment.isPending}
              className="text-primary disabled:opacity-40 transition-opacity"
              data-testid="button-send-comment"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
