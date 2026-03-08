import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { usePosts, useCreatePost, useLikePost, useDeletePost, useHidePost } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo, isOnline } from "@/components/ui/shared";
import { Heart, MessageCircle, ThumbsUp, Globe, MoreHorizontal, Trash2, EyeOff, Eye } from "lucide-react";
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
          <Avatar url={user?.profilePicture} name={user?.name || "U"} online />
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
  const deletePost = useDeletePost();
  const hidePost = useHidePost();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;
  const isOwn = authorId === currentUserId;
  const isHidden = (post as any).hidden;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden" data-testid={`post-card-${post.id}`}>
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => authorId && setLocation(`/profile/${authorId}`)}
            className="hover:opacity-80 transition-opacity shrink-0"
            data-testid={`button-author-avatar-${post.id}`}
          >
            <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} online={isOnline((post.author as any)?.lastSeen)} />
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
              {isHidden && <span className="text-amber-500 font-medium ml-1">· Hidden</span>}
            </div>
          </div>

          {isOwn && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                data-testid={`button-post-menu-${post.id}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-xl py-1 w-44 overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); hidePost.mutate(post.id); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60 transition-colors text-left"
                    data-testid={`button-hide-post-${post.id}`}
                  >
                    {isHidden ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    {isHidden ? "Unhide post" : "Hide from public"}
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); if (confirm("Delete this post?")) deletePost.mutate(post.id); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive"
                    data-testid={`button-delete-post-${post.id}`}
                  >
                    <Trash2 className="w-4 h-4" /> Delete post
                  </button>
                </div>
              )}
            </div>
          )}
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

        {(post.likes.length > 0 || (post as any).commentCount > 0) && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {post.likes.length > 0 && (
                <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <ThumbsUp className="w-2.5 h-2.5 text-primary-foreground fill-current" />
                </span>
              )}
              {post.likes.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {(post as any).friendLike
                    ? post.likes.length === 1
                      ? (post as any).friendLike.name
                      : `${(post as any).friendLike.name} and ${post.likes.length - 1} other${post.likes.length - 1 > 1 ? "s" : ""}`
                    : post.likes.length}
                </span>
              )}
            </div>
            {(post as any).commentCount > 0 && (
              <button
                onClick={() => setLocation(`/post/${post.id}`)}
                className="text-xs text-muted-foreground hover:underline"
                data-testid={`text-comment-count-${post.id}`}
              >
                {(post as any).commentCount} comment{(post as any).commentCount !== 1 ? "s" : ""}
              </button>
            )}
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

      {(post as any).latestComment && (
        <div className="px-4 pb-3 pt-1">
          <div className="flex gap-2 items-start">
            <Avatar
              url={(post as any).latestComment.author?.profilePicture}
              name={(post as any).latestComment.author?.name || "U"}
              size="sm"
            />
            <div className="flex-1 bg-secondary/50 rounded-2xl px-3 py-2">
              <button
                onClick={() => setLocation(`/profile/${(post as any).latestComment.author?.id}`)}
                className="text-xs font-semibold text-foreground hover:underline"
                data-testid={`button-comment-author-${post.id}`}
              >
                {(post as any).latestComment.author?.name}
              </button>
              <p className="text-xs text-foreground/90 mt-0.5 line-clamp-2">
                {(post as any).latestComment.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
