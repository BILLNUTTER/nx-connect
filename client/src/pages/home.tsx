import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { usePosts, useCreatePost, useLikePost, useDeletePost, useHidePost, usePrefetchPost } from "@/hooks/use-posts";
import { usePhotos, useMyTodayPhoto, useCreatePhoto } from "@/hooks/use-photos";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Avatar, TimeAgo, isOnline, LinkedText, PhotoLightbox } from "@/components/ui/shared";
import { Heart, MessageCircle, ThumbsUp, Globe, MoreHorizontal, Trash2, EyeOff, Eye, Camera, X, Image, Send, Download } from "lucide-react";
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
          <PostItem key={post.id} post={post} currentUserId={user?.id} isAdmin={!!user?.isAdmin} />
        ))
      )}
    </div>
  );
}

function StoriesBar() {
  const { user } = useAuth();
  const { data: photos } = usePhotos();
  const { data: myToday } = useMyTodayPhoto();
  const [viewState, setViewState] = useState<{ photos: DailyPhoto[]; startIndex: number } | null>(null);
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  const friendPhotos = photos?.filter(p => p.author?.id !== user?.id) ?? [];

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-sm p-3" data-testid="stories-bar">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => {
            if (myToday?.hasPosted && myToday.photo) setViewState({ photos: [myToday.photo], startIndex: 0 });
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

          {friendPhotos.map((photo, i) => (
            <div
              key={photo.id}
              className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
              onClick={() => setViewState({ photos: friendPhotos, startIndex: i })}
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

          {friendPhotos.length === 0 && !myToday?.hasPosted && (
            <div className="flex items-center text-xs text-muted-foreground px-2 py-4">
              No stories yet — be the first!
            </div>
          )}
        </div>
      </div>

      {viewState && (
        <StoryViewer
          photos={viewState.photos}
          startIndex={viewState.startIndex}
          onClose={() => setViewState(null)}
        />
      )}
      {showAddPhoto && <AddPhotoModal onClose={() => setShowAddPhoto(false)} />}
    </>
  );
}

function StoryViewer({ photos, startIndex, onClose }: {
  photos: DailyPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const DURATION = 5000;

  const photo = photos[currentIndex];
  const expiresAt = photo?.expiresAt ? new Date(photo.expiresAt) : null;
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000)) : null;

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onClose();
    }
  }, [currentIndex, photos.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  // Reset progress bar when story changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Progress animation + auto-advance
  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setProgress(pct);
      if (elapsed < DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        goNext();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentIndex, paused, goNext]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" data-testid="story-viewer">
      {/* Phone-frame story panel: full-screen on mobile, 9:16 centered column on desktop */}
      <div
        className="relative bg-black overflow-hidden w-full h-full sm:rounded-2xl sm:shadow-2xl sm:h-[95vh]"
        style={{ maxWidth: 'min(calc(95vh * 9 / 16), 100vw)' }}
      >
        {/* Story image — fills frame, object-cover for proper story feel */}
        <img
          src={photo.imageUrl}
          alt={photo.caption || "Story"}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          data-testid="story-image"
        />

        {/* Dark gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

        {/* Progress bars row */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-3 pt-3 pb-1">
          {photos.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author info + close button */}
        <div className="absolute top-7 left-0 right-0 z-10 flex items-center justify-between px-4 pt-2">
          <button
            className="flex items-center gap-2"
            onClick={() => { onClose(); setLocation(`/profile/${photo.author?.id}`); }}
          >
            <Avatar url={photo.author?.profilePicture} name={photo.author?.name || "U"} size="sm" online={isOnline((photo.author as any)?.lastSeen)} />
            <div className="text-left">
              <div className="text-white font-semibold text-sm leading-tight drop-shadow">{photo.author?.name}</div>
              {hoursLeft !== null && (
                <div className="text-white/60 text-xs">{hoursLeft}h left</div>
              )}
            </div>
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1"
            data-testid="button-close-story"
          >
            <X className="w-6 h-6 drop-shadow" />
          </button>
        </div>

        {/* Caption */}
        {photo.caption && (
          <div className="absolute bottom-10 left-0 right-0 z-10 px-5">
            <p className="text-white text-sm leading-relaxed drop-shadow">{photo.caption}</p>
          </div>
        )}

        {/* Tap zones: left half = previous, right half = next/close */}
        <div className="absolute inset-0 flex z-20" style={{ top: "80px", bottom: "80px" }}>
          <div
            className="flex-1 cursor-pointer"
            onClick={goPrev}
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => { setPaused(false); }}
          />
          <div
            className="flex-1 cursor-pointer"
            onClick={goNext}
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => { setPaused(false); }}
          />
        </div>
      </div>
    </div>
  );
}

function compressImage(file: File, maxWidth = 900, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AddPhotoModal({ onClose }: { onClose: () => void }) {
  const createPhoto = useCreatePhoto();
  const { toast } = useToast();
  const [imageData, setImageData] = useState("");
  const [caption, setCaption] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
      setUrlMode(false);
    } catch {
      toast({ title: "Error", description: "Could not read image.", variant: "destructive" });
    } finally {
      setCompressing(false);
    }
  };

  const finalImageUrl = urlMode ? urlInput.trim() : imageData;

  const handleSubmit = async () => {
    if (!finalImageUrl) return;
    try {
      await createPhoto.mutateAsync({ imageUrl: finalImageUrl, caption: caption.trim() || undefined });
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-file-gallery"
          />

          {!imageData && !urlMode ? (
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 rounded-2xl transition-colors group"
                data-testid="button-pick-from-gallery"
                disabled={compressing}
              >
                {compressing ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Processing image...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                    <Image className="w-10 h-10" />
                    <span className="font-semibold text-sm">Choose from gallery</span>
                    <span className="text-xs opacity-70">Tap to select a photo</span>
                  </div>
                )}
              </button>
              <button
                onClick={() => setUrlMode(true)}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                data-testid="button-use-url-instead"
              >
                Or paste an image URL instead
              </button>
            </div>
          ) : urlMode ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium flex-1">Image URL</label>
                <button onClick={() => setUrlMode(false)} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                data-testid="input-photo-url"
                autoFocus
              />
            </div>
          ) : null}

          {(imageData || (urlMode && urlInput)) && (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 group">
              <img
                src={finalImageUrl}
                alt="Preview"
                className="w-full max-h-64 object-cover"
                onError={() => { setImageData(""); setUrlInput(""); }}
                data-testid="img-photo-preview"
              />
              <button
                onClick={() => { setImageData(""); setUrlInput(""); setUrlMode(false); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                data-testid="button-remove-photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                  data-testid="button-change-photo"
                >
                  <Camera className="w-3 h-3" /> Change photo
                </button>
              </div>
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
            disabled={!finalImageUrl || createPhoto.isPending}
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
  const [imageData, setImageData] = useState("");
  const [compressing, setCompressing] = useState(false);
  const createPost = useCreatePost();
  const { user } = useAuth();
  const { data: posts } = usePosts();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const hasPhotoToday = !!posts?.some(p => {
    const authorId = (p.author as any)?.id || (p.authorId as any)?.id;
    if (authorId !== user?.id) return false;
    if (!(p as any).imageUrl) return false;
    const created = new Date((p as any).createdAt!);
    return Date.now() - created.getTime() < 24 * 60 * 60 * 1000;
  });

  const openCompose = (withPhoto = false) => {
    setComposing(true);
    if (withPhoto) {
      if (hasPhotoToday) {
        toast({ title: "Already posted a photo today", description: "You can post one photo per day. It disappears after 24 hours.", variant: "destructive" });
        return;
      }
      setTimeout(() => fileInputRef.current?.click(), 50);
    } else {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
    } catch {
      toast({ title: "Error", description: "Could not read image.", variant: "destructive" });
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageData) return;
    const finalContent = content.trim() || "📷";
    try {
      await createPost.mutateAsync({ content: finalContent, imageUrl: imageData || undefined });
      setContent("");
      setImageData("");
      setComposing(false);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("one photo") || msg.includes("photo per day")) {
        toast({ title: "Already posted a photo today", description: "You can post one photo per day.", variant: "destructive" });
      } else {
        toast({ title: "Error posting", description: msg || "Something went wrong.", variant: "destructive" });
      }
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  };

  const cancelCompose = () => { setContent(""); setImageData(""); setComposing(false); };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} data-testid="input-post-image-file" />

      <div className="p-4">
        <div className="flex gap-3 items-start">
          <Avatar url={user?.profilePicture} name={user?.name || "U"} online />
          {!composing ? (
            <button
              onClick={() => openCompose(false)}
              className="flex-1 bg-secondary/60 hover:bg-secondary rounded-full px-4 py-2.5 text-left text-muted-foreground transition-colors cursor-text text-sm"
              data-testid="input-create-post-trigger"
            >
              What's on your mind, {user?.name?.split(" ")[0]}?
            </button>
          ) : (
            <div className="flex-1 space-y-3">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => { setContent(e.target.value); autoResize(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
                placeholder={imageData ? "Add a caption (optional)..." : `What's on your mind, ${user?.name?.split(" ")[0] || "you"}?`}
                className="w-full bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground min-h-[60px] leading-relaxed"
                data-testid="input-create-post"
                rows={2}
              />
              {compressing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Processing image...
                </div>
              )}
              {imageData && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imageData} alt="Preview" className="w-full max-h-60 object-cover" />
                  <button
                    onClick={() => setImageData("")}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                    data-testid="button-remove-post-image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Disappears in 24h
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {composing && (
        <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
              <Globe className="w-4 h-4 text-primary mr-1" />
              Public
            </div>
            {!imageData && (
              <button
                onClick={() => {
                  if (hasPhotoToday) {
                    toast({ title: "Already posted a photo today", description: "One photo post per day.", variant: "destructive" });
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${hasPhotoToday ? "text-muted-foreground/50 cursor-not-allowed" : "text-primary hover:bg-primary/10"}`}
                disabled={hasPhotoToday || compressing}
                title={hasPhotoToday ? "Already posted a photo today" : "Add a photo (disappears in 24h)"}
                data-testid="button-attach-photo"
              >
                <Image className="w-4 h-4" />
                {hasPhotoToday ? "Photo used" : "Photo"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelCompose} data-testid="button-cancel-post">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && !imageData) || createPost.isPending || compressing}
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
            onClick={() => openCompose(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${hasPhotoToday ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:bg-secondary/60"}`}
            disabled={hasPhotoToday}
            title={hasPhotoToday ? "Already posted a photo today" : "Photo post (disappears in 24h)"}
            data-testid="button-photo-post-shortcut"
          >
            <Camera className={`w-4 h-4 ${hasPhotoToday ? "text-muted-foreground/40" : "text-primary"}`} />
            {hasPhotoToday ? "Photo used today" : "Photo"}
          </button>
          <button
            onClick={() => openCompose(false)}
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

function PostItem({ post, currentUserId, isAdmin }: { post: Post; currentUserId?: string; isAdmin?: boolean }) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const deletePost = useDeletePost();
  const hidePost = useHidePost();
  const prefetchPost = usePrefetchPost();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasLiked = post.likes.includes(currentUserId || "");
  const authorId = (post.author as any)?.id || (post.authorId as any)?.id || (post.authorId as any)?._id;
  const isOwn = authorId === currentUserId;
  const isHidden = (post as any).hidden;
  const isAdminPost = !!(post as any).isAdminPost;
  const canManage = isOwn || isAdmin;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className={`rounded-xl shadow-sm overflow-hidden ${isAdminPost ? 'border border-amber-300/80 dark:border-amber-500/50 shadow-amber-100/60 dark:shadow-amber-900/30' : 'bg-card border border-border'}`}
      style={isAdminPost ? { background: 'linear-gradient(160deg, rgba(251,191,36,0.10) 0%, var(--card) 60%)' } : undefined}
      data-testid={`post-card-${post.id}`}
      onMouseEnter={() => prefetchPost(post.id!)}
    >
      {isAdminPost && (
        <div className="h-[3px] w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
      )}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          {isAdminPost ? (
            <div className="shrink-0 cursor-default" data-testid={`button-author-avatar-${post.id}`}>
              <div className="ring-2 ring-amber-400 dark:ring-amber-500 rounded-full p-0.5">
                <Avatar url={post.author?.profilePicture} name="NX" online={false} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => authorId && setLocation(`/profile/${authorId}`)}
              className="hover:opacity-80 transition-opacity shrink-0"
              data-testid={`button-author-avatar-${post.id}`}
            >
              <Avatar url={post.author?.profilePicture} name={post.author?.name || "U"} online={isOnline((post.author as any)?.lastSeen)} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isAdminPost ? (
                <span className={`font-semibold text-sm text-amber-700 dark:text-amber-300`} data-testid={`button-author-name-${post.id}`}>
                  NX-Connect
                </span>
              ) : (
                <button
                  onClick={() => authorId && setLocation(`/profile/${authorId}`)}
                  className="font-semibold hover:underline text-left text-sm text-foreground"
                  data-testid={`button-author-name-${post.id}`}
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TimeAgo date={post.createdAt!} />
              <span>·</span>
              <Globe className="w-3 h-3" />
              {isHidden && <span className="text-amber-500 font-medium ml-1">· Hidden</span>}
            </div>
          </div>

          {canManage && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                data-testid={`button-post-menu-${post.id}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-xl py-1 w-48 overflow-hidden">
                  {isOwn && (
                    <button
                      onClick={() => { setMenuOpen(false); hidePost.mutate(post.id); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60 transition-colors text-left"
                      data-testid={`button-hide-post-${post.id}`}
                    >
                      {isHidden ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      {isHidden ? "Unhide post" : "Hide from public"}
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); if (confirm("Delete this post?")) deletePost.mutate(post.id); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive"
                    data-testid={`button-delete-post-${post.id}`}
                  >
                    <Trash2 className="w-4 h-4" /> {isAdmin && !isOwn ? "Remove (violates rules)" : "Delete post"}
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
          {(post.content !== "📷" || !(post as any).imageUrl) && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
              <LinkedText text={post.content} />
            </p>
          )}
        </button>

        {(post as any).imageUrl && (
          <div className="relative mt-2 rounded-xl overflow-hidden border border-border/50 group/img" data-testid={`img-post-${post.id}`}>
            <img
              src={(post as any).imageUrl}
              alt="Post"
              className="w-full object-contain cursor-pointer"
              onClick={() => setLightboxSrc((post as any).imageUrl)}
              data-testid={`button-open-photo-${post.id}`}
            />
            {(post as any).expiresAt && (
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Camera className="w-2.5 h-2.5" />
                <span>Expires in <TimeAgo date={(post as any).expiresAt} /></span>
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); setLightboxSrc((post as any).imageUrl); }}
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
              title="View full photo"
              data-testid={`button-save-photo-${post.id}`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

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
