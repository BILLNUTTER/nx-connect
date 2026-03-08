import { Link, useLocation } from "wouter";
import { Home, Users, MessageCircle, Bell, User as UserIcon, LogOut, Camera, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useState, useRef, useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: notifications } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                  data-testid={`nav-${item.label.toLowerCase()}`}
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

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 p-1.5 rounded-full hover:bg-secondary/50 transition-colors"
              data-testid="button-profile-menu"
            >
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground border-2 border-border">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-border/50 bg-secondary/30">
                  <div className="font-bold truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                </div>

                <div className="p-1.5">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-sm font-medium"
                    data-testid="menu-item-profile"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                    My Profile
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-sm font-medium"
                    data-testid="menu-item-update-photo"
                  >
                    <Camera className="w-4 h-4 text-accent" />
                    Update Photo
                  </Link>
                  <div className="border-t border-border/50 my-1.5" />
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive transition-colors text-sm font-medium"
                    data-testid="menu-item-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 animate-in">
        {children}
      </main>
    </div>
  );
}
