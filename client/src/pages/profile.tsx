import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Avatar } from "@/components/ui/shared";
import { Camera, CheckCircle, LogOut, Pencil, X, User, AtSign, Phone, Mail, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");

  if (!user) return null;

  const startEditing = () => {
    setEditName(user.name || "");
    setEditUsername(user.username || "");
    setEditPhone((user as any).phone || "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const updates: any = {};
      if (editName.trim() && editName.trim() !== user.name) updates.name = editName.trim();
      if (editUsername.trim() && editUsername.trim() !== user.username) updates.username = editUsername.trim();
      if (editPhone.trim() !== ((user as any).phone || "")) updates.phone = editPhone.trim();

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      await updateProfile(updates);
      setIsEditing(false);
      toast({ title: "Profile updated!", description: "Your details have been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not update profile", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePhoto = async () => {
    if (!photoUrl.trim()) return;
    setIsUpdatingPhoto(true);
    try {
      await updateProfile({ profilePicture: photoUrl.trim() });
      setPhotoUrl("");
      toast({ title: "Photo updated!", description: "Your profile picture has been changed." });
    } catch {
      toast({ title: "Error", description: "Could not update photo", variant: "destructive" });
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      <h1 className="text-3xl font-display font-bold mb-6 text-center">Your Profile</h1>

      <Card className="relative overflow-hidden p-0">
        <div className="h-28 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10" />

        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end justify-between mb-4">
            <div className="relative group">
              <Avatar url={user.profilePicture} name={user.name} size="xl" className="ring-4 ring-card" />
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
              </div>
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
            </>
          ) : (
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5" /> Username
                </label>
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="username"
                  data-testid="input-edit-username"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Your phone number"
                  type="tel"
                  data-testid="input-edit-phone"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

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

      <Card>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Update Profile Picture
        </h3>
        <div className="flex gap-3">
          <Input
            placeholder="Paste image URL..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            data-testid="input-photo-url"
          />
          <Button onClick={handleUpdatePhoto} disabled={isUpdatingPhoto || !photoUrl.trim()} data-testid="button-update-photo">
            {isUpdatingPhoto ? "Saving..." : "Update"}
          </Button>
        </div>
      </Card>

      <Card className="border-destructive/20">
        <h3 className="text-base font-bold mb-1 text-destructive">Sign Out</h3>
        <p className="text-sm text-muted-foreground mb-4">You'll need to log back in to access your account.</p>
        <Button
          variant="destructive"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </Button>
      </Card>
    </div>
  );
}
