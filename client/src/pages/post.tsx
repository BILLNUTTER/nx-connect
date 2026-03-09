import { useState } from "react";
import { useLocation } from "wouter";
import { usePost, useLikePost, useComments, useCreateComment, useDeletePost, useHidePost, useLikeComment } from "@/hooks/use-posts";
import { useFriends } from "@/hooks/use-users";
import { useGetOrCreateConversation } from "@/hooks/use-chats";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo, isOnline, LinkedText } from "@/components/ui/shared";
import { ArrowLeft, Heart, MessageCircle, Send, MessageSquare, Trash2, EyeOff, Eye, CornerDownRight, Download } from "lucide-react";

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
  const likeComment = useLikeComment();
  const { data: friends } = useFriends();
  const getOrCreate = useGetOrCreateConversation();
  const [content, setContent] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");

  if (isLoading) return (
    <div className="max-w-2xl mx-auto space-y-4 py-4">
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-secondary rounded w-32" />
            <div className="h-3 bg-secondary rounded w-20" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-secondary rounded w-full" />
          <div className="h-4 bg-secondary rounded w-5/6" />
          <div className="h-4 bg-secondary rounded w-4/6" />
        </div>
        <div className="h-8 bg-secondary rounded w-1/3" />
      </div>
    </div>
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
  const isAdminPost = !!(post as any).isAdminPost;

  const handleSend = async () => {
    if (!content.trim()) return;
    await createComment.mutateAsync({ postId: id, content });
    setContent("");
  };

  const handleReplySend = async () => {
    if (!replyContent.trim() || !replyingTo) return;
    await createComment.mutateAsync({ postId: id, content: replyContent, replyTo: replyingTo.id });
    setReplyContent("");
    setReplyingTo(null);
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

      <Card
        className={isAdminPost ? 'border border-amber-300/80 dark:border-amber-500/50 overflow-hidden' : ''}
        style={isAdminPost ? { background: 'linear-gradient(160deg, rgba(251,191,36,0.10) 0%, var(--card) 60%)' } : undefined}
      >
        {isAdminPost && <div className="h-[3px] bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 -mx-5 -mt-5 mb-5" />}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {isAdminPost ? (
              <div className="cursor-default" data-testid="button-post-author-avatar">
                <div className="ring-2 ring-amber-400 dark:ring-amber-500 rounded-full p-0.5">
                  <Avatar url={post.author?.profilePicture} name="NX" online={false} />
                </div>
              </div>
            ) : (
              <button
                onClick={() => authorId && setLocation(`/profile/${authorId}`)}
                className="hover:opacity-80 transition-opacity"
                data-testid="button-post-author-avatar"
              >
                <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} online={isOnline((post.author as any)?.lastSeen)} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isAdminPost ? (
                  <span className="font-bold text-amber-700 dark:text-amber-300" data-testid="button-post-author-name">
                    NX-Connect
                  </span>
                ) : (
                  <button
                    onClick={() => authorId && setLocation(`/profile/${authorId}`)}
                    className="font-bold hover:underline text-left text-foreground"
                    data-testid="button-post-author-name"
                  >
                    {post.author?.name}
                  </button>
                )}
                {isAdminPost && (
                  <span className="px-2 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-full font-bold border border-amber-300 dark:border-amber-600 flex items-center gap-0.5">
                    ✦ OFFICIAL
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                @{isAdminPost ? "nx-connect" : post.author?.username} · <TimeAgo date={post.createdAt!} />
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

        {(post.content !== "📷" || !(post as any).imageUrl) && (
          <p className="text-xl leading-relaxed whitespace-pre-wrap mb-4" data-testid="text-post-content"><LinkedText text={post.content} /></p>
        )}
        {(post as any).imageUrl && (
          <div className="relative mb-6 rounded-2xl overflow-hidden border border-border/50 group/img">
            <img src={(post as any).imageUrl} alt="Post" className="w-full object-cover max-h-[500px]" data-testid="img-post-detail" />
            {(post as any).expiresAt && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>⏳ Expires <TimeAgo date={(post as any).expiresAt} /></span>
              </div>
            )}
            <a
              href={(post as any).imageUrl}
              download={`nx-photo-${post.id}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover/img:opacity-100 transition-opacity"
              title="Save photo to gallery"
              data-testid="button-save-photo-detail"
            >
              <Download className="w-3.5 h-3.5" /> Save Photo
            </a>
          </div>
        )}

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
          <div className="space-y-3 mb-6">
            {comments.filter((c: any) => !c.replyTo).map((c: any) => {
              const cAuthorId = c.author?.id || (c.authorId as any)?.id;
              const hasLikedComment = (c.likes || []).includes(user?.id || "");
              const replies = comments.filter((r: any) => r.replyTo === c.id);
              return (
                <div key={c.id}>
                  <div className="flex gap-3">
                    <button onClick={() => cAuthorId && setLocation(`/profile/${cAuthorId}`)} className="shrink-0 hover:opacity-80 transition-opacity">
                      <Avatar url={c.author?.profilePicture} name={c.author?.name || "U"} size="sm" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="bg-secondary/50 rounded-2xl px-4 py-3">
                        <div className="flex items-baseline gap-2 mb-1">
                          <button onClick={() => cAuthorId && setLocation(`/profile/${cAuthorId}`)} className="font-bold text-sm hover:underline text-left">
                            {c.author?.name}
                          </button>
                          <span className="text-xs text-muted-foreground"><TimeAgo date={c.createdAt!} /></span>
                        </div>
                        <p className="text-sm">{c.content}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 px-2">
                        <button
                          onClick={() => likeComment.mutate({ postId: id, commentId: c.id })}
                          className={`flex items-center gap-1 text-xs font-semibold transition-colors ${hasLikedComment ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
                          data-testid={`button-like-comment-${c.id}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${hasLikedComment ? "fill-current" : ""}`} />
                          {c.likes?.length > 0 && <span>{c.likes.length}</span>}
                          Like
                        </button>
                        <button
                          onClick={() => { setReplyingTo({ id: c.id, name: c.author?.name || "User" }); setReplyContent(""); }}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                          data-testid={`button-reply-comment-${c.id}`}
                        >
                          <CornerDownRight className="w-3.5 h-3.5" /> Reply
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="ml-12 mt-2 space-y-2">
                      {replies.map((r: any) => {
                        const rAuthorId = r.author?.id || (r.authorId as any)?.id;
                        const hasLikedReply = (r.likes || []).includes(user?.id || "");
                        return (
                          <div key={r.id} className="flex gap-2">
                            <button onClick={() => rAuthorId && setLocation(`/profile/${rAuthorId}`)} className="shrink-0 hover:opacity-80 transition-opacity">
                              <Avatar url={r.author?.profilePicture} name={r.author?.name || "U"} size="sm" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="bg-secondary/30 rounded-2xl px-3 py-2">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <button onClick={() => rAuthorId && setLocation(`/profile/${rAuthorId}`)} className="font-bold text-xs hover:underline text-left">
                                    {r.author?.name}
                                  </button>
                                  <span className="text-[10px] text-muted-foreground"><TimeAgo date={r.createdAt!} /></span>
                                </div>
                                <p className="text-xs">{r.content}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1 px-1">
                                <button
                                  onClick={() => likeComment.mutate({ postId: id, commentId: r.id })}
                                  className={`flex items-center gap-1 text-[10px] font-semibold transition-colors ${hasLikedReply ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
                                >
                                  <Heart className={`w-3 h-3 ${hasLikedReply ? "fill-current" : ""}`} />
                                  {r.likes?.length > 0 && <span>{r.likes.length}</span>}
                                  Like
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Reply input */}
                  {replyingTo?.id === c.id && (
                    <div className="ml-12 mt-2 flex items-center gap-2">
                      <Avatar url={user?.profilePicture} name={user?.name || "U"} size="sm" />
                      <div className="flex-1 flex items-center bg-secondary rounded-full px-3 py-2 gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          placeholder={`Reply to ${replyingTo.name}...`}
                          className="flex-1 bg-transparent border-none outline-none text-xs"
                          onKeyDown={e => e.key === "Enter" && handleReplySend()}
                          data-testid="input-reply"
                        />
                        <button onClick={() => setReplyingTo(null)} className="text-muted-foreground text-xs">✕</button>
                        <button
                          onClick={handleReplySend}
                          disabled={!replyContent.trim() || createComment.isPending}
                          className="text-primary disabled:opacity-40 transition-opacity"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
