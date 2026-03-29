import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { X, ExternalLink, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";

/* ─── In-App Browser ─────────────────────────────────────────────── */
const _iabBus = new EventTarget();
export function openInAppBrowser(url: string) {
  _iabBus.dispatchEvent(new CustomEvent("iab:open", { detail: url }));
}

export function InAppBrowser() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  useEffect(() => {
    const h = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      setUrl(next);
      setLoading(true);
      setHistory([next]);
      setHistIdx(0);
    };
    _iabBus.addEventListener("iab:open", h);
    return () => _iabBus.removeEventListener("iab:open", h);
  }, []);

  if (!url) return null;

  const goBack = () => {
    if (histIdx > 0) { setHistIdx(histIdx - 1); setUrl(history[histIdx - 1]); setLoading(true); }
  };
  const goForward = () => {
    if (histIdx < history.length - 1) { setHistIdx(histIdx + 1); setUrl(history[histIdx + 1]); setLoading(true); }
  };
  const refresh = () => { setLoading(true); setUrl(u => u ? u + " " : u); setTimeout(() => setUrl(u => u?.trim() ?? u), 0); };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-1.5 px-2 py-2.5 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
        <button
          onClick={() => { setUrl(null); setHistory([]); setHistIdx(-1); }}
          className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <button onClick={goBack} disabled={histIdx <= 0} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-30" title="Back">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={goForward} disabled={histIdx >= history.length - 1} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-30" title="Forward">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 bg-secondary/50 rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground truncate block">{url}</span>
        </div>
        <button onClick={refresh} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground" title="Refresh">
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground" title="Open in browser">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      {/* Loading spinner overlay */}
      {loading && (
        <div className="absolute inset-x-0 bottom-0 top-[53px] flex flex-col items-center justify-center bg-background z-10 gap-3">
          <div className="w-10 h-10 rounded-full border-[3px] border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      )}
      {/* iframe */}
      <iframe
        key={url}
        src={url}
        className="flex-1 w-full border-none"
        onLoad={() => setLoading(false)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        title="In-app browser"
        referrerPolicy="no-referrer"
      />
    </div>,
    document.body
  );
}

export function isOnline(lastSeen?: string | Date | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

export function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-card rounded-3xl p-5 shadow-lg shadow-black/5 border border-border/50 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Button({ 
  children, variant = "primary", className = "", ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" }) {
  const base = "px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border-2 border-border text-foreground hover:border-primary/50 hover:bg-primary/5",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 ${className}`}
      {...props}
    />
  );
}

export function TimeAgo({ date }: { date: string | Date }) {
  return (
    <span className="text-xs text-muted-foreground">
      {formatDistanceToNow(new Date(date), { addSuffix: true })}
    </span>
  );
}

export function Avatar({
  url,
  name,
  size = "md",
  online,
  className = "",
}: {
  url?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base", xl: "w-24 h-24 text-2xl" };
  const dotSizes = { sm: "w-2.5 h-2.5 border-[2px]", md: "w-3 h-3 border-2", lg: "w-3.5 h-3.5 border-2", xl: "w-5 h-5 border-[3px]" };
  const sizeClass = sizes[size];
  const dotClass = dotSizes[size];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {url ? (
        <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover shadow-sm`} />
      ) : (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center text-white font-bold shadow-sm`}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {online && (
        <span className={`absolute bottom-0 right-0 ${dotClass} rounded-full bg-green-500 border-card shadow-sm`} />
      )}
    </div>
  );
}

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|www\.[a-zA-Z0-9][^\s<>"{}|\\^`[\]]*)/gi;

export function LinkedText({ text, className, linkClassName }: {
  text: string;
  className?: string;
  linkClassName?: string;
}) {
  const [, setLocation] = useLocation();

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const parsed = new URL(href);
      if (parsed.host === window.location.host) {
        // Internal link — navigate within the SPA
        setLocation(parsed.pathname + parsed.search + parsed.hash);
        return;
      }
    } catch {/* malformed URL */}
    // External link — open in the in-app browser overlay
    openInAppBrowser(href);
  };

  const parts = text.split(URL_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^https?:\/\//i.test(part) || /^www\.[a-zA-Z0-9]/i.test(part)) {
          const href = /^www\./i.test(part) ? `https://${part}` : part;
          return (
            <a
              key={i}
              href={href}
              onClick={(e) => handleLinkClick(e, href)}
              className={linkClassName ?? "text-primary underline underline-offset-2 hover:no-underline break-all cursor-pointer"}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function PhotoLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    // Lock scroll without causing page jump
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
      data-testid="photo-lightbox"
    >
      <button
        style={{ position: "absolute", top: 16, right: 16, zIndex: 10, color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", padding: 8, cursor: "pointer", lineHeight: 0 }}
        onClick={onClose}
        data-testid="button-close-lightbox"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <a
        href={src}
        download
        target="_blank"
        rel="noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ position: "absolute", bottom: 20, right: 20, zIndex: 10, background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 24, padding: "8px 18px", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        data-testid="button-download-lightbox"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Save
      </a>
      <img
        src={src}
        alt={alt || "Photo"}
        onClick={e => e.stopPropagation()}
        data-testid="lightbox-image"
        style={{ maxWidth: "95vw", maxHeight: "95vh", objectFit: "contain", borderRadius: 8, userSelect: "none" }}
      />
    </div>,
    document.body
  );
}

export function VerifiedBadge({ size = "sm", gold = false }: { size?: "xs" | "sm" | "md"; gold?: boolean }) {
  const sizeMap = { xs: 13, sm: 17, md: 22 };
  const px = sizeMap[size];
  const bg = gold ? "#F59E0B" : "#1877F2";
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 inline-block"
      title={gold ? "Official NX-Connect account" : "Verified account"}
      aria-label={gold ? "Official account" : "Verified account"}
    >
      <polygon
        points="12,2 14.3,6.5 19.1,4.9 17.5,9.7 22,12 17.5,14.3 19.1,19.1 14.3,17.5 12,22 9.7,17.5 4.9,19.1 6.5,14.3 2,12 6.5,9.7 4.9,4.9 9.7,6.5"
        fill={bg}
      />
      <path
        d="M8.5 12.5L11 15L16 9.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
