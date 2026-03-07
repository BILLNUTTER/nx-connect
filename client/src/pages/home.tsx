import { useState } from "react";
import { usePosts, useCreatePost, useLikePost, useCreateComment, useComments } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo } from "@/components/ui/shared";
import { Heart, MessageCircle, Send } from "lucide-react";
import type { Post } from "@shared/schema";

export default function HomeFeed() {
  const { data: posts, isLoading } = usePosts();
  const { user } = useAuth();
  
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
          <p className="text-muted-foreground">Be the first to share something with your friends!</p>
        </Card>
      ) : (
        posts?.map(post => <PostItem key={post.id} post={post} currentUserId={user?.id} />)
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
    <Card className="mb-8">
      <div className="flex gap-4">
        <Avatar url={user?.profilePicture} name={user?.name || "U"} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="flex-1 bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground min-h-[80px]"
        />
      </div>
      <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
        <Button onClick={handleSubmit} disabled={!content.trim() || createPost.isPending}>
          {createPost.isPending ? "Posting..." : "Share Post"}
        </Button>
      </div>
    </Card>
  );
}

function PostItem({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const [showComments, setShowComments] = useState(false);
  const likePost = useLikePost();
  const hasLiked = post.likes.includes(currentUserId || "");

  return (
    <Card className="transition-all hover:shadow-xl hover:border-border">
      <div className="flex items-center gap-3 mb-4">
        <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} />
        <div>
          <div className="font-bold text-foreground">{post.author?.name}</div>
          <div className="text-xs text-muted-foreground flex gap-1">
            @{post.author?.username} • <TimeAgo date={post.createdAt!} />
          </div>
        </div>
      </div>
      
      <p className="text-lg whitespace-pre-wrap mb-6">{post.content}</p>
      
      <div className="flex items-center gap-4 pt-4 border-t border-border/50">
        <button 
          onClick={() => likePost.mutate(post.id)}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasLiked ? 'text-pink-500' : 'text-muted-foreground hover:text-pink-500'}`}
        >
          <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
          {post.likes.length}
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Comment
        </button>
      </div>

      {showComments && <CommentSection postId={post.id} />}
    </Card>
  );
}

function CommentSection({ postId }: { postId: string }) {
  const { data: comments, isLoading } = useComments(postId);
  const createComment = useCreateComment();
  const [content, setContent] = useState("");
  const { user } = useAuth();

  const handleSend = async () => {
    if (!content.trim()) return;
    await createComment.mutateAsync({ postId, content });
    setContent("");
  };

  return (
    <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
      {isLoading ? <div className="text-sm text-muted-foreground">Loading comments...</div> : 
        comments?.map(c => (
          <div key={c.id} className="flex gap-3 bg-secondary/30 p-3 rounded-2xl">
            <Avatar url={c.author?.profilePicture} name={c.author?.name || "U"} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{c.author?.name}</span>
                <TimeAgo date={c.createdAt!} />
              </div>
              <p className="text-sm text-foreground mt-0.5">{c.content}</p>
            </div>
          </div>
        ))
      }
      
      <div className="flex items-center gap-3 pt-2">
        <Avatar url={user?.profilePicture} name={user?.name || "U"} size="sm" />
        <div className="flex-1 flex items-center bg-secondary rounded-full px-4 py-2">
          <input 
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} disabled={!content.trim() || createComment.isPending} className="text-primary disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
