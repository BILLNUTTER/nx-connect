import { Link, useLocation } from "wouter";
import { Home, Users, MessageCircle, Bell, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: notifications } = useNotifications();

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  if (!user) return <>{children}</>;

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/friends", icon: Users, label: "Friends" },
    { href: "/chats", icon: MessageCircle, label: "Chats" },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-display font-bold text-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              NX
            </div>
            <span className="font-display font-bold text-xl hidden sm:block text-foreground tracking-tight">NUTTERX</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4">
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative p-3 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? "text-primary bg-primary/10 shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                  title={item.label}
                >
                  <item.icon className={`w-6 h-6 ${isActive ? "fill-primary/20" : ""}`} />
                  {item.badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-[10px] font-bold text-white flex items-center justify-center rounded-full shadow-sm animate-in zoom-in">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 p-1.5 rounded-full hover:bg-secondary/50 transition-colors">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground border-2 border-border">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
            </Link>
            <button
              onClick={logout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors hidden sm:flex"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 animate-in">
        {children}
      </main>
    </div>
  );
}
