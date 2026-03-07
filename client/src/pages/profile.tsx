import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Avatar } from "@/components/ui/shared";
import { Camera, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleUpdate = async () => {
    if (!photoUrl.trim()) return;
    setIsUpdating(true);
    try {
      await updateProfile(photoUrl);
      setSuccess(true);
      setPhotoUrl("");
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <h1 className="text-3xl font-display font-bold mb-8 text-center">Your Profile</h1>

      <Card className="text-center py-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-primary/20 to-accent/20"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative group mb-6">
            <Avatar url={user.profilePicture} name={user.name} size="xl" />
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-sm">
              <Camera className="w-8 h-8" />
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-1">{user.name}</h2>
          <p className="text-lg text-primary font-medium mb-8">@{user.username}</p>

          <div className="w-full max-w-md bg-secondary/50 rounded-2xl p-6 text-left space-y-4">
            <div className="flex justify-between border-b border-border/50 pb-4">
              <span className="text-muted-foreground">Status</span>
              <span className="font-bold text-green-500 capitalize">{user.status}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-4">
              <span className="text-muted-foreground">Friends</span>
              <span className="font-bold">{user.friends.length}</span>
            </div>
            <div className="text-sm text-muted-foreground italic text-center mt-4">
              Phone and email are strictly private and not visible to others.
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold mb-4">Update Profile Picture</h3>
        <div className="flex gap-4">
          <Input 
            placeholder="Paste image URL here..." 
            value={photoUrl} 
            onChange={(e) => setPhotoUrl(e.target.value)} 
          />
          <Button onClick={handleUpdate} disabled={isUpdating || !photoUrl.trim()}>
            {isUpdating ? "Saving..." : "Update"}
          </Button>
        </div>
        {success && (
          <div className="mt-4 flex items-center gap-2 text-green-500 font-medium bg-green-500/10 p-3 rounded-xl">
            <CheckCircle className="w-5 h-5" /> Profile picture updated successfully!
          </div>
        )}
      </Card>
    </div>
  );
}
