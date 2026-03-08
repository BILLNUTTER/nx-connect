import { useState } from "react";
import { useLocation } from "wouter";
import { usePosts, useCreatePost, useLikePost } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo } from "@/components/ui/shared";
import { Heart, MessageCircle } from "lucide-react";
import type { Post } from "@shared/schema";

export default function HomeFeed() {
  const { data: posts, isLoading } = usePosts();
  const { user } = useAuth();

  if (isLoading) return <div className="text-center py-10 text-muted-foreground animate-pulse">Loading feed...</div>;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <CreatePostBox />

      {posts?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No posts yet</h3>
          <p>Be the first to share something!</p>
        </div>
      ) : (
        posts?.map(post => (
          <PostItem
            key={post.id}
            post={post}
            currentUserId={user?.id}
          />
        ))
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
}: {
  post: Post;
  currentUserId?: string;
}) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;

  return (
    <div className="py-5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 mb-3">
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
          <div className="text-xs text-muted-foreground">
            @{post.author?.username} · <TimeAgo date={post.createdAt!} />
          </div>
        </div>
      </div>

      <button
        onClick={() => setLocation(`/post/${post.id}`)}
        className="w-full text-left"
        data-testid={`button-open-post-${post.id}`}
      >
        <p className="text-base whitespace-pre-wrap line-clamp-5 leading-relaxed">{post.content}</p>
      </button>

      <div className="flex items-center gap-5 mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); likePost.mutate(post.id); }}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${hasLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
          {post.likes.length}
        </button>
        <button
          onClick={() => setLocation(`/post/${post.id}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="w-4 h-4" />
          Comments
        </button>
      </div>
    </div>
  );
}
