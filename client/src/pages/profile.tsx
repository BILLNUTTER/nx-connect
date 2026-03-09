import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUserPosts } from "@/hooks/use-users";
import { useLikePost, useDeletePost, useHidePost } from "@/hooks/use-posts";
import { Card, Button, Input, Avatar, TimeAgo, LinkedText } from "@/components/ui/shared";
import { Camera, LogOut, Pencil, X, User, AtSign, Phone, Mail, Users, Eye, EyeOff, Trash2, ThumbsUp, MessageCircle, Globe, ImagePlus, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Post } from "@shared/schema";

async function compressImage(file: File, maxWidth = 900, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const { data: posts, isLoading: postsLoading } = useUserPosts(user?.id || "");

  if (!user) return null;

  const startEditing = () => {
    setEditName(user.name || "");
    setEditUsername(user.username || "");
    setEditPhone((user as any).phone || "");
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const updates: any = {};
      if (editName.trim() && editName.trim() !== user.name) updates.name = editName.trim();
      if (editUsername.trim() && editUsername.trim() !== user.username) updates.username = editUsername.trim();
      if (editPhone.trim() !== ((user as any).phone || "")) updates.phone = editPhone.trim();
      if (Object.keys(updates).length === 0) { setIsEditing(false); return; }
      await updateProfile(updates);
      setIsEditing(false);
      toast({ title: "Profile updated!", description: "Your details have been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not update profile", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const compressed = await compressImage(file, 400, 0.82);
      await updateProfile({ profilePicture: compressed });
      toast({ title: "Profile photo updated!" });
    } catch {
      toast({ title: "Error", description: "Could not upload photo", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const compressed = await compressImage(file, 1200, 0.80);
      await updateProfile({ coverPhoto: compressed });
      toast({ title: "Cover photo updated!" });
    } catch {
      toast({ title: "Error", description: "Could not upload cover photo", variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  const coverPhoto = (user as any).coverPhoto;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      <Card className="relative overflow-hidden p-0">
        <div className="relative h-36 group/cover">
          {coverPhoto ? (
            <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10" />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={isUploadingCover}
            className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover/cover:opacity-100"
            data-testid="button-upload-cover"
            title="Change cover photo"
          >
            {isUploadingCover ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-white">
                <ImagePlus className="w-6 h-6 drop-shadow" />
                <span className="text-xs font-semibold drop-shadow">Change Cover</span>
              </div>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFile}
            data-testid="input-cover-file"
          />
        </div>

        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end justify-between mb-4">
            <div className="relative group/avatar">
              <div className="ring-4 ring-card rounded-full">
                <Avatar url={user.profilePicture} name={user.name} size="xl" online />
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/45 rounded-full transition-all flex items-center justify-center opacity-0 group-hover/avatar:opacity-100"
                data-testid="button-upload-avatar"
                title="Change profile photo"
              >
                {isUploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white drop-shadow" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
                data-testid="input-avatar-file"
              />
            </div>

            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile" className="flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cancelEditing} data-testid="button-cancel-edit">
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" onClick={handleSaveDetails} disabled={isSaving} data-testid="button-save-profile">
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-primary font-medium">@{user.username}</p>
              <p className="text-xs text-muted-foreground mt-1">Tap the cover or avatar to change photos from your gallery</p>
            </>
          ) : (
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name" data-testid="input-edit-name" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5" /> Username
                </label>
                <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="username" data-testid="input-edit-username" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </label>
                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Your phone number" type="tel" data-testid="input-edit-phone" />
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => avatarInputRef.current?.click()}
          disabled={isUploadingAvatar}
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
          data-testid="button-change-profile-photo"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            {isUploadingAvatar ? (
              <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <div className="font-semibold text-sm">Profile Photo</div>
            <div className="text-xs text-muted-foreground">From gallery</div>
          </div>
        </button>

        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploadingCover}
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
          data-testid="button-change-cover-photo"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
            {isUploadingCover ? (
              <div className="w-4 h-4 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5 text-accent" />
            )}
          </div>
          <div>
            <div className="font-semibold text-sm">Cover Photo</div>
            <div className="text-xs text-muted-foreground">From gallery</div>
          </div>
        </button>
      </div>

      <Card>
        <h3 className="text-base font-bold mb-4 text-foreground">Account Details</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email (private)</p>
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium text-foreground">{(user as any).phone || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
            <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-medium text-green-600 capitalize">{user.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Friends</p>
              <p className="text-sm font-bold text-foreground">{user.friends.length}</p>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Your Posts
            {posts && <span className="text-sm font-normal text-muted-foreground">({posts.length})</span>}
          </h3>
        </div>

        {postsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                <div className="h-4 bg-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No posts yet</p>
            <p className="text-sm mt-1">Share something with your friends!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts?.map(post => (
              <OwnPostCard key={post.id} post={post} currentUserId={user.id} />
            ))}
          </div>
        )}
      </div>

      <ChangePasswordSection />

      <Card className="border-destructive/20">
        <h3 className="text-base font-bold mb-1 text-destructive">Sign Out</h3>
        <p className="text-sm text-muted-foreground mb-4">You'll need to log back in to access your account.</p>
        <Button variant="destructive" onClick={logout} className="w-full flex items-center justify-center gap-2" data-testid="button-logout">
          <LogOut className="w-4 h-4" /> Log Out
        </Button>
      </Card>
    </div>
  );
}

function ChangePasswordSection() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setOpen(false);
      toast({ title: "Password changed!", description: "Your password has been updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not change password", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
        data-testid="button-toggle-change-password"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Change Password</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              data-testid="input-current-password"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              data-testid="input-new-password"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              onKeyDown={e => e.key === "Enter" && handleSave()}
              data-testid="input-confirm-password"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full" data-testid="button-save-password">
            {saving ? "Saving..." : "Update Password"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function OwnPostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const [, setLocation] = useLocation();
  const likePost = useLikePost();
  const deletePost = useDeletePost();
  const hidePost = useHidePost();
  const hasLiked = post.likes.includes(currentUserId || "");
  const isHidden = (post as any).hidden;

  return (
    <div
      className={`bg-card border rounded-xl shadow-sm overflow-hidden transition-all ${isHidden ? "border-amber-400/40 bg-amber-50/5" : "border-border"}`}
      data-testid={`own-post-card-${post.id}`}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TimeAgo date={post.createdAt!} />
            <span>·</span>
            <Globe className="w-3 h-3" />
            {isHidden && (
              <span className="flex items-center gap-1 text-amber-500 font-semibold">
                <EyeOff className="w-3 h-3" /> Hidden
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => hidePost.mutate(post.id!)}
              disabled={hidePost.isPending}
              title={isHidden ? "Unhide post" : "Hide from public"}
              className={`p-1.5 rounded-lg transition-colors ${isHidden ? "text-amber-500 hover:bg-amber-100/20" : "text-muted-foreground hover:bg-secondary"}`}
              data-testid={`button-hide-post-${post.id}`}
            >
              {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { if (confirm("Delete this post?")) deletePost.mutate(post.id!); }}
              disabled={deletePost.isPending}
              title="Delete post"
              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              data-testid={`button-delete-post-${post.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setLocation(`/post/${post.id}`)}
          className="w-full text-left"
          data-testid={`button-open-post-${post.id}`}
        >
          {((post as any).content !== "📷" || !(post as any).imageUrl) && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground line-clamp-5"><LinkedText text={post.content} /></p>
          )}
        </button>

        {(post as any).imageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border/40 cursor-pointer" onClick={() => setLocation(`/post/${post.id}`)}>
            <img src={(post as any).imageUrl} alt="Post" className="w-full object-cover max-h-[200px]" />
          </div>
        )}
      </div>

      <div className="border-t border-border/50 mx-4" />

      <div className="px-2 py-1 flex">
        <button
          onClick={() => likePost.mutate(post.id!)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
            hasLiked ? "text-primary" : "text-muted-foreground hover:bg-secondary/60"
          }`}
          data-testid={`button-like-post-${post.id}`}
        >
          <ThumbsUp className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
          {post.likes.length > 0 ? post.likes.length : ""} Like{post.likes.length !== 1 ? "s" : ""}
        </button>
        <button
          onClick={() => setLocation(`/post/${post.id}`)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary/60 transition-colors"
          data-testid={`button-comment-post-${post.id}`}
        >
          <MessageCircle className="w-4 h-4" /> Comments
        </button>
      </div>
    </div>
  );
}
