import { useState } from "react";
import { useLocation } from "wouter";
import { usePosts, useCreatePost, useLikePost } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo } from "@/components/ui/shared";
import { Heart, MessageCircle, ThumbsUp, Globe } from "lucide-react";
import type { Post } from "@shared/schema";

export default function HomeFeed() {
  const { data: posts, isLoading } = usePosts();
  const { user } = useAuth();

  if (isLoading) return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      <CreatePostBox />
      {[1,2,3].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
          <div className="flex gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-secondary rounded w-1/3" />
              <div className="h-3 bg-secondary rounded w-1/4" />
            </div>
          </div>
          <div className="h-4 bg-secondary rounded w-full mb-2" />
          <div className="h-4 bg-secondary rounded w-3/4" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-20">
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
          <PostItem key={post.id} post={post} currentUserId={user?.id} />
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
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex gap-3 items-start">
          <Avatar url={user?.profilePicture} name={user?.name || "U"} />
          <button
            onClick={() => {}}
            className="flex-1 bg-secondary/60 hover:bg-secondary rounded-full px-4 py-2.5 text-left text-muted-foreground transition-colors cursor-text"
            data-testid="input-create-post-trigger"
          >
            What's on your mind, {user?.name?.split(" ")[0]}?
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`What's on your mind, ${user?.name?.split(" ")[0] || "you"}?`}
          className={`w-full bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground mt-3 transition-all ${content ? "min-h-[80px]" : "h-0 mt-0 overflow-hidden"}`}
          data-testid="input-create-post"
        />
      </div>

      <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
          <Globe className="w-4 h-4 text-primary mr-1" />
          Public
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || createPost.isPending}
          data-testid="button-share-post"
          size="sm"
          className="px-5"
        >
          {createPost.isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}

function PostItem({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden" data-testid={`post-card-${post.id}`}>
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => authorId && setLocation(`/profile/${authorId}`)}
            className="hover:opacity-80 transition-opacity shrink-0"
            data-testid={`button-author-avatar-${post.id}`}
          >
            <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} />
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => authorId && setLocation(`/profile/${authorId}`)}
              className="font-semibold text-foreground hover:underline text-left text-sm"
              data-testid={`button-author-name-${post.id}`}
            >
              {post.author?.name}
            </button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TimeAgo date={post.createdAt!} />
              <span>·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>

        <button
          onClick={() => setLocation(`/post/${post.id}`)}
          className="w-full text-left"
          data-testid={`button-open-post-${post.id}`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
            {post.content}
          </p>
        </button>

        {post.likes.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <ThumbsUp className="w-2.5 h-2.5 text-primary-foreground fill-current" />
            </span>
            {post.likes.length}
          </div>
        )}
      </div>

      <div className="border-t border-border/50 mx-4" />

      <div className="px-2 py-1 flex">
        <button
          onClick={(e) => { e.stopPropagation(); likePost.mutate(post.id); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
            hasLiked ? "text-primary" : "text-muted-foreground hover:bg-secondary/60"
          }`}
          data-testid={`button-like-${post.id}`}
        >
          <ThumbsUp className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
          Like
        </button>
        <button
          onClick={() => setLocation(`/post/${post.id}`)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-secondary/60 transition-colors"
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
      </div>
    </div>
  );
}
