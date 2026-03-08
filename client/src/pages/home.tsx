import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { usePosts, useCreatePost, useLikePost, useDeletePost, useHidePost } from "@/hooks/use-posts";
import { usePhotos, useMyTodayPhoto, useCreatePhoto } from "@/hooks/use-photos";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo, isOnline } from "@/components/ui/shared";
import { Heart, MessageCircle, ThumbsUp, Globe, MoreHorizontal, Trash2, EyeOff, Eye, Camera, X, Image, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Post, DailyPhoto } from "@shared/schema";

export default function HomeFeed() {
  const { data: posts, isLoading } = usePosts();
  const { user } = useAuth();

  if (isLoading) return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      <div className="bg-card border border-border rounded-xl p-3 overflow-hidden">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-full bg-secondary animate-pulse" />
              <div className="h-2.5 w-12 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
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
      <StoriesBar />
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

function StoriesBar() {
  const { user } = useAuth();
  const { data: photos } = usePhotos();
  const { data: myToday } = useMyTodayPhoto();
  const [viewPhoto, setViewPhoto] = useState<DailyPhoto | null>(null);
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-sm p-3" data-testid="stories-bar">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => {
            if (myToday?.hasPosted && myToday.photo) setViewPhoto(myToday.photo);
            else setShowAddPhoto(true);
          }} data-testid="button-add-story">
            <div className="relative">
              <div className={`w-16 h-16 rounded-full overflow-hidden border-3 ${myToday?.hasPosted ? "border-primary ring-2 ring-primary/30" : "border-dashed border-border"}`} style={{ borderWidth: myToday?.hasPosted ? 3 : 2, borderStyle: myToday?.hasPosted ? "solid" : "dashed" }}>
                {myToday?.hasPosted && myToday.photo ? (
                  <img src={myToday.photo.imageUrl} alt="My story" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <Avatar url={user?.profilePicture} name={user?.name || "U"} size="md" />
                  </div>
                )}
              </div>
              {!myToday?.hasPosted && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                  <span className="text-primary-foreground text-xs font-bold leading-none">+</span>
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-foreground truncate max-w-[64px]">
              {myToday?.hasPosted ? "Your story" : "Add story"}
            </span>
          </div>

          {photos?.filter(p => p.author?.id !== user?.id).map(photo => (
            <div
              key={photo.id}
              className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
              onClick={() => setViewPhoto(photo)}
              data-testid={`button-view-story-${photo.id}`}
            >
              <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-primary ring-2 ring-primary/20">
                <img src={photo.imageUrl} alt={photo.author?.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-[11px] font-medium text-foreground truncate max-w-[64px]">
                {photo.author?.name?.split(" ")[0]}
              </span>
            </div>
          ))}

          {(!photos || photos.filter(p => p.author?.id !== user?.id).length === 0) && !myToday?.hasPosted && (
            <div className="flex items-center text-xs text-muted-foreground px-2 py-4">
              No stories yet — be the first!
            </div>
          )}
        </div>
      </div>

      {viewPhoto && <StoryViewer photo={viewPhoto} onClose={() => setViewPhoto(null)} />}
      {showAddPhoto && <AddPhotoModal onClose={() => setShowAddPhoto(false)} />}
    </>
  );
}

function StoryViewer({ photo, onClose }: { photo: DailyPhoto; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const expiresAt = photo.expiresAt ? new Date(photo.expiresAt) : null;
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000)) : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="story-viewer"
    >
      <div className="relative max-w-sm w-full">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
          data-testid="button-close-story"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <img src={photo.imageUrl} alt={photo.caption || "Story"} className="w-full object-cover max-h-[75vh]" />

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => { onClose(); setLocation(`/profile/${photo.author?.id}`); }}
                className="hover:opacity-80 transition-opacity"
              >
                <Avatar url={photo.author?.profilePicture} name={photo.author?.name || "U"} size="sm" online={isOnline((photo.author as any)?.lastSeen)} />
              </button>
              <div>
                <button
                  onClick={() => { onClose(); setLocation(`/profile/${photo.author?.id}`); }}
                  className="text-white font-semibold text-sm hover:underline block"
                >
                  {photo.author?.name}
                </button>
                {hoursLeft !== null && (
                  <span className="text-white/60 text-xs">{hoursLeft}h left</span>
                )}
              </div>
            </div>
            {photo.caption && (
              <p className="text-white text-sm leading-relaxed">{photo.caption}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddPhotoModal({ onClose }: { onClose: () => void }) {
  const createPhoto = useCreatePhoto();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState(false);

  const handleSubmit = async () => {
    if (!imageUrl.trim()) return;
    try {
      await createPhoto.mutateAsync({ imageUrl: imageUrl.trim(), caption: caption.trim() || undefined });
      toast({ title: "Story posted!", description: "It will disappear in 24 hours." });
      onClose();
    } catch (err: any) {
      const msg = err?.message || "Failed to post story";
      if (msg.includes("once") || msg.includes("day")) {
        toast({ title: "Already posted today", description: "You can post one photo story per day.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="add-photo-modal"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Post daily photo</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-add-photo">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Image URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setPreview(false); }}
                onBlur={() => imageUrl.trim() && setPreview(true)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                data-testid="input-photo-url"
              />
              <button
                onClick={() => imageUrl.trim() && setPreview(p => !p)}
                className="px-3 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors text-muted-foreground"
                data-testid="button-preview-photo"
                title="Preview"
              >
                <Image className="w-4 h-4" />
              </button>
            </div>
          </div>

          {preview && imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/30">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full max-h-56 object-cover"
                onError={() => setPreview(false)}
                data-testid="img-photo-preview"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Caption <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something about your photo..."
              maxLength={300}
              rows={2}
              className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none"
              data-testid="input-photo-caption"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">{caption.length}/300</div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-xl px-3 py-2.5">
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>One photo per day · disappears after 24 hours</span>
          </div>
        </div>

        <div className="px-5 pb-5">
          <Button
            onClick={handleSubmit}
            disabled={!imageUrl.trim() || createPhoto.isPending}
            className="w-full"
            data-testid="button-submit-photo"
          >
            {createPhoto.isPending ? "Posting..." : "Post story"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreatePostBox() {
  const [content, setContent] = useState("");
  const [composing, setComposing] = useState(false);
  const createPost = useCreatePost();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openCompose = () => {
    setComposing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await createPost.mutateAsync(content);
    setContent("");
    setComposing(false);
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex gap-3 items-start">
          <Avatar url={user?.profilePicture} name={user?.name || "U"} online />
          {!composing ? (
            <button
              onClick={openCompose}
              className="flex-1 bg-secondary/60 hover:bg-secondary rounded-full px-4 py-2.5 text-left text-muted-foreground transition-colors cursor-text text-sm"
              data-testid="input-create-post-trigger"
            >
              What's on your mind, {user?.name?.split(" ")[0]}?
            </button>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); autoResize(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
              placeholder={`What's on your mind, ${user?.name?.split(" ")[0] || "you"}?`}
              className="flex-1 bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground min-h-[60px] leading-relaxed"
              data-testid="input-create-post"
              rows={2}
            />
          )}
        </div>
      </div>

      {composing && (
        <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
            <Globe className="w-4 h-4 text-primary mr-1" />
            Public
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setContent(""); setComposing(false); }}
              data-testid="button-cancel-post"
            >
              Cancel
            </Button>
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
      )}

      {!composing && (
        <div className="border-t border-border/50 px-4 py-2 flex items-center gap-1">
          <button
            onClick={openCompose}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-secondary/60 transition-colors"
            data-testid="button-photo-post-shortcut"
          >
            <Camera className="w-4 h-4 text-primary" />
            Photo
          </button>
          <button
            onClick={openCompose}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-secondary/60 transition-colors"
            data-testid="button-text-post-shortcut"
          >
            <MessageCircle className="w-4 h-4 text-green-500" />
            Feeling
          </button>
        </div>
      )}
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
