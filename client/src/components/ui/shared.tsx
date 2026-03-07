import React from "react";
import { formatDistanceToNow } from "date-fns";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-3xl p-5 shadow-lg shadow-black/5 border border-border/50 ${className}`}>
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

export function Avatar({ url, name, size = "md" }: { url?: string; name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base", xl: "w-24 h-24 text-2xl" };
  const sizeClass = sizes[size];
  
  if (url) return <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover shadow-sm`} />;
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center text-white font-bold shadow-sm`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
