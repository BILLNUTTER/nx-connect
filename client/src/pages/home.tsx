import { useState } from "react";
import { useLocation } from "wouter";
import { usePosts, useCreatePost, useLikePost, useCreateComment, useComments } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo } from "@/components/ui/shared";
import { Heart, MessageCircle, Send, X, ArrowLeft } from "lucide-react";
import type { Post, Comment } from "@shared/schema";

export default function HomeFeed() {
  const { data: posts, isLoading } = usePosts();
  const { user } = useAuth();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (isLoading) return <div className="text-center py-10 text-muted-foreground animate-pulse">Loading feed...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <CreatePostBox />

      {posts?.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No posts yet</h3>
          <p className="text-muted-foreground">Be the first to share something!</p>
        </Card>
      ) : (
        posts?.map(post => (
          <PostItem
            key={post.id}
            post={post}
            currentUserId={user?.id}
            onOpenDetail={() => setSelectedPost(post)}
          />
        ))
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUserId={user?.id}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}

function CreatePostBox() {
  const [content, setContent] = useState("");
  const createPost = useCreatePost();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await createPost.mutateAsync(content);
    setContent("");
  };

  return (
    <Card className="mb-4">
      <div className="flex gap-4">
        <Avatar url={user?.profilePicture} name={user?.name || "U"} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="flex-1 bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground min-h-[80px]"
          data-testid="input-create-post"
        />
      </div>
      <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
        <Button onClick={handleSubmit} disabled={!content.trim() || createPost.isPending} data-testid="button-share-post">
          {createPost.isPending ? "Posting..." : "Share Post"}
        </Button>
      </div>
    </Card>
  );
}

function PostItem({
  post,
  currentUserId,
  onOpenDetail,
}: {
  post: Post;
  currentUserId?: string;
  onOpenDetail: () => void;
}) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;

  return (
    <Card className="transition-all hover:shadow-xl hover:border-border">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => authorId && setLocation(`/profile/${authorId}`)}
          className="hover:opacity-80 transition-opacity"
          data-testid={`button-author-avatar-${post.id}`}
        >
          <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} />
        </button>
        <div>
          <button
            onClick={() => authorId && setLocation(`/profile/${authorId}`)}
            className="font-bold text-foreground hover:underline text-left"
            data-testid={`button-author-name-${post.id}`}
          >
            {post.author?.name}
          </button>
          <div className="text-xs text-muted-foreground flex gap-1">
            @{post.author?.username} • <TimeAgo date={post.createdAt!} />
          </div>
        </div>
      </div>

      <button
        onClick={onOpenDetail}
        className="w-full text-left mb-4 hover:opacity-80 transition-opacity"
        data-testid={`button-open-post-${post.id}`}
      >
        <p className="text-lg whitespace-pre-wrap">{post.content}</p>
      </button>

      <div className="flex items-center gap-4 pt-4 border-t border-border/50">
        <button
          onClick={() => likePost.mutate(post.id)}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
          {post.likes.length}
        </button>
        <button
          onClick={onOpenDetail}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="w-5 h-5" />
          Comment
        </button>
      </div>
    </Card>
  );
}

function PostDetailModal({
  post,
  currentUserId,
  onClose,
}: {
  post: Post;
  currentUserId?: string;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const { data: comments, isLoading } = useComments(post.id);
  const createComment = useCreateComment();
  const [content, setContent] = useState("");
  const { user } = useAuth();
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;

  const handleSend = async () => {
    if (!content.trim()) return;
    await createComment.mutateAsync({ postId: post.id, content });
    setContent("");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="modal-post-detail"
    >
      <div
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onClose(); authorId && setLocation(`/profile/${authorId}`); }}
              className="hover:opacity-80 transition-opacity"
              data-testid="button-modal-author"
            >
              <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} />
            </button>
            <div>
              <button
                onClick={() => { onClose(); authorId && setLocation(`/profile/${authorId}`); }}
                className="font-bold hover:underline text-left"
              >
                {post.author?.name}
              </button>
              <div className="text-xs text-muted-foreground">
                @{post.author?.username} • <TimeAgo date={post.createdAt!} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors" data-testid="button-close-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-border/50">
          <p className="text-lg whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => likePost.mutate(post.id)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
              data-testid="button-modal-like"
            >
              <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
              {post.likes.length} {post.likes.length === 1 ? "Like" : "Likes"}
            </button>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <MessageCircle className="w-4 h-4" /> {comments?.length ?? 0} Comments
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground animate-pulse">Loading comments...</div>
          ) : !comments?.length ? (
            <div className="text-center text-muted-foreground py-8">No comments yet. Be the first!</div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <Avatar url={c.author?.profilePicture} name={c.author?.name || "U"} size="sm" />
                <div className="flex-1 bg-secondary/50 rounded-2xl p-3">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-sm">{c.author?.name}</span>
                    <span className="text-xs text-muted-foreground"><TimeAgo date={c.createdAt!} /></span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3">
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
        </div>
      </div>
    </div>
  );
}
