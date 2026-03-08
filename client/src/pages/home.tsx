import { useState } from "react";
import { useLocation } from "wouter";
import { usePosts, useCreatePost, useLikePost } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { useFriends } from "@/hooks/use-users";
import { useGetOrCreateConversation } from "@/hooks/use-chats";
import { Card, Button, Avatar, TimeAgo } from "@/components/ui/shared";
import { Heart, MessageCircle, MessageSquare } from "lucide-react";
import type { Post } from "@shared/schema";

export default function HomeFeed() {
  const { data: posts, isLoading } = usePosts();
  const { user } = useAuth();
  const { data: friends } = useFriends();

  if (isLoading) return <div className="text-center py-10 text-muted-foreground animate-pulse">Loading feed...</div>;

  const friendIds = new Set((friends || []).map((f: any) => f.id || f._id));

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
            friendIds={friendIds}
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
  friendIds,
}: {
  post: Post;
  currentUserId?: string;
  friendIds: Set<string>;
}) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const getOrCreate = useGetOrCreateConversation();
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;
  const isOwnPost = authorId === currentUserId;
  const isFriend = !isOwnPost && authorId && friendIds.has(authorId);

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authorId) return;
    const conv = await getOrCreate.mutateAsync(authorId);
    setLocation(`/chats?conv=${conv.id}`);
  };

  return (
    <Card className="transition-all hover:shadow-xl hover:border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
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
              @{post.author?.username} · <TimeAgo date={post.createdAt!} />
            </div>
          </div>
        </div>
        {isFriend && (
          <button
            onClick={handleMessage}
            disabled={getOrCreate.isPending}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
            data-testid={`button-message-${post.id}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Message
          </button>
        )}
      </div>

      <button
        onClick={() => setLocation(`/post/${post.id}`)}
        className="w-full text-left mb-4 hover:opacity-80 transition-opacity"
        data-testid={`button-open-post-${post.id}`}
      >
        <p className="text-lg whitespace-pre-wrap line-clamp-5">{post.content}</p>
        <span className="text-sm text-primary font-medium mt-1 block">View post & comments →</span>
      </button>

      <div className="flex items-center gap-4 pt-4 border-t border-border/50">
        <button
          onClick={(e) => { e.stopPropagation(); likePost.mutate(post.id); }}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
          {post.likes.length}
        </button>
        <button
          onClick={() => setLocation(`/post/${post.id}`)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="w-5 h-5" />
          Comments
        </button>
      </div>
    </Card>
  );
}
