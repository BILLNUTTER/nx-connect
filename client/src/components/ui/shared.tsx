import React, { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

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
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={linkClassName ?? "text-primary underline underline-offset-2 hover:no-underline break-all"}
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black flex items-center justify-center"
      onClick={onClose}
      data-testid="photo-lightbox"
    >
      <button
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
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
        className="absolute bottom-5 right-5 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
        data-testid="button-download-lightbox"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Save
      </a>
      <img
        src={src}
        alt={alt || "Photo"}
        className="max-w-full max-h-full object-contain select-none"
        onClick={e => e.stopPropagation()}
        data-testid="lightbox-image"
        style={{ maxHeight: "100dvh", maxWidth: "100dvw" }}
      />
    </div>
  );
}
