import { Link, useLocation } from "wouter";
import { Home, Users, MessageCircle, Bell, User as UserIcon, LogOut, Moon, Sun, ChevronDown, Search, X, FileText, MapPin, Phone, Mail, Instagram, Share2, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useFriendRequests } from "@/hooks/use-users";
import { useConversations } from "@/hooks/use-chats";
import { useState, useRef, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Avatar, isOnline } from "@/components/ui/shared";

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("nx-theme");
    if (saved) return saved === "dark";
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("nx-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("nx-theme", "light");
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ users: any[]; posts: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((data: any) => {
        setResults(data);
        setOpen(true);
      })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    setLocation(path);
  }, [setLocation]);

  const hasResults = results && (results.users.length > 0 || results.posts.length > 0);

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Search NX-Connect..."
          className="w-full bg-secondary/70 border border-border/50 rounded-full pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-muted-foreground"
          data-testid="input-search"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); setResults(null); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-clear-search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <div className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              Searching...
            </div>
          )}

          {!loading && !hasResults && results && (
            <div className="p-6 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No results for "{query}"</p>
            </div>
          )}

          {!loading && hasResults && (
            <>
              {results!.users.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> People
                  </div>
                  {results!.users.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => navigate(`/profile/${user.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                      data-testid={`search-result-user-${user.id}`}
                    >
                      <Avatar url={user.profilePicture} name={user.name || "U"} size="sm" online={isOnline(user.lastSeen)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results!.users.length > 0 && results!.posts.length > 0 && (
                <div className="border-t border-border/50 mx-4" />
              )}

              {results!.posts.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Posts
                  </div>
                  {results!.posts.map((post: any) => (
                    <button
                      key={post.id}
                      onClick={() => navigate(`/post/${post.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                      data-testid={`search-result-post-${post.id}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2 text-foreground">{post.content}</p>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          by {post.author?.name || "Unknown"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="h-2" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: notifications } = useNotifications();
  const { data: friendRequests } = useFriendRequests();
  const { data: conversations } = useConversations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDark, toggle: toggleTheme } = useTheme();

  const handleShare = async () => {
    const url = window.location.origin;
    const message = `I found more friends on this app from all around the world. Come join us — it's real enjoyable! 🌍\n\nConnect Without Compromise on NX-Connect.\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on NX-Connect", text: message, url });
      } else {
        await navigator.clipboard.writeText(message);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {}
    setMenuOpen(false);
  };

  const unreadNotifCount = notifications?.filter((n) => !n.read).length || 0;
  const pendingRequestCount = friendRequests?.length || 0;
  const unreadChatCount = (conversations as any[])?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) || 0;

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
    { href: "/home", icon: Home, label: "Home", badge: 0 },
    { href: pendingRequestCount > 0 ? "/friends?tab=requests" : "/friends", matchHref: "/friends", icon: Users, label: "Friends", badge: pendingRequestCount },
    { href: "/chats", icon: MessageCircle, label: "Chats", badge: unreadChatCount },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadNotifCount },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-14 flex items-center gap-3">
            <Link href="/home" className="flex items-center gap-2 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-display font-bold text-lg shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                NX
              </div>
              <span className="font-display font-bold text-lg hidden sm:block text-foreground tracking-tight">NX-Connect</span>
            </Link>

            <SearchBar />

            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 p-1.5 rounded-full hover:bg-secondary/50 transition-colors"
                data-testid="button-profile-menu"
              >
                <Avatar url={user.profilePicture} name={user.name || "U"} size="sm" online />
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
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
                    <button
                      onClick={() => { toggleTheme(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-sm font-medium"
                      data-testid="menu-item-theme-toggle"
                    >
                      {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                      {isDark ? "Light theme" : "Dark theme"}
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-sm font-medium"
                      data-testid="menu-item-share"
                    >
                      {shareCopied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4 text-blue-500" />}
                      {shareCopied ? "Link Copied!" : "Invite Friends"}
                    </button>
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

          <div className="flex items-center justify-center border-t border-border/30 -mx-4 px-2">
            {navItems.map((item) => {
              const matchPath = (item as any).matchHref || item.href;
              const isActive = location === matchPath || location.startsWith(`${matchPath}/`) || location.startsWith(`${matchPath}?`);
              return (
                <Link
                  key={matchPath}
                  href={item.href}
                  className={`relative flex-1 flex items-center justify-center py-2.5 transition-all duration-200 border-b-2 ${
                    isActive
                      ? "text-primary border-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/30"
                  }`}
                  title={item.label}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "fill-primary/15" : ""}`} />
                  {item.badge > 0 && (
                    <span className="absolute top-1.5 right-1/4 min-w-[16px] h-[16px] bg-destructive text-[10px] font-bold text-white flex items-center justify-center rounded-full px-1 shadow-sm animate-in zoom-in">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full max-w-4xl mx-auto animate-in ${location.startsWith('/chats') || location.startsWith('/friends') ? "p-4 overflow-hidden" : "p-4"}`}>
        {children}
      </main>

      {!location.startsWith('/chats') && !location.startsWith('/friends') && <footer className="border-t border-border/40 bg-secondary/10 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-sans font-black text-xs shadow-md">NX</div>
              <div>
                <div className="font-sans font-bold text-sm leading-none">NX-Connect</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Nairobi, Kenya</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <a href="tel:+254758891491" className="flex items-center gap-1 hover:text-foreground transition-colors"><Phone className="w-3 h-3" /> 0758 891 491</a>
              <a href="tel:+254713881613" className="flex items-center gap-1 hover:text-foreground transition-colors"><Phone className="w-3 h-3" /> 0713 881 613</a>
              <a href="mailto:nutterxapp@gmail.com" className="flex items-center gap-1 hover:text-foreground transition-colors"><Mail className="w-3 h-3" /> nutterxapp@gmail.com</a>
              <a href="https://www.instagram.com/nutterx_?igsh=MTkwcWNya2Y0bTgzcw==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors"><Instagram className="w-3 h-3" /> @nutterx_</a>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground text-center mt-4 pt-4 border-t border-border/30">
            © {new Date().getFullYear()} NX-Connect · Nairobi, Kenya · All rights reserved.
          </div>
        </div>
      </footer>}
    </div>
  );
}
