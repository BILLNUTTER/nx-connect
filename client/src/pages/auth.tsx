import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button, Card, Input } from "@/components/ui/shared";
import { ArrowLeft, Mail, Phone, Instagram, MessageCircle, Shield, Users, Zap } from "lucide-react";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";

  const [tab, setTab] = useState<"login" | "signup" | "forgot">(initialTab as any);
  const { login, signup, forgotPassword, isLoggingIn, isSigningUp } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "", username: "", phone: "", email: "", password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      if (tab === "login") {
        await login({ username: formData.username, password: formData.password });
        setLocation("/home");
      } else if (tab === "signup") {
        await signup({
          name: formData.name, username: formData.username,
          phone: formData.phone, email: formData.email, password: formData.password
        });
        setLocation("/home");
      } else if (tab === "forgot") {
        await forgotPassword({ phone: formData.phone, email: formData.email });
        setSuccess("Request sent. Admin will contact you with a new password.");
        setTab("login");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <nav className="flex items-center justify-between px-5 py-4 border-b border-border/40 glass-panel">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-sans font-black text-base shadow-lg shadow-primary/30">
              NX
            </div>
            <span className="font-sans font-bold text-lg tracking-tight hidden sm:block">NX-Connect</span>
          </div>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href="https://www.instagram.com/nutterx_?igsh=MTkwcWNya2Y0bTgzcw==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary/50 hidden sm:flex">
            <Instagram className="w-4 h-4" />
            <span>Follow Us</span>
          </a>
          <a href="mailto:nutterxapp@gmail.com" className="flex items-center gap-1.5 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary/50 hidden sm:flex">
            <Mail className="w-4 h-4" />
            <span>Support</span>
          </a>
        </div>
      </nav>

      <div className="flex flex-1">
        <div className="hidden lg:flex flex-col justify-center px-16 bg-gradient-to-br from-primary/5 to-accent/5 border-r border-border/40 w-[420px] shrink-0">
          <div className="mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-sans font-black text-2xl shadow-xl shadow-primary/30 mb-6">NX</div>
            <h2 className="text-3xl font-sans font-black mb-3 leading-tight">Connect Without<br /><span className="text-gradient">Compromise.</span></h2>
            <p className="text-muted-foreground leading-relaxed">Join the NX-Connect community — a social platform built for real connections, not algorithms.</p>
          </div>

          <div className="space-y-5">
            {[
              { icon: Shield, color: "text-primary", bg: "bg-primary/10", title: "Private & Secure", desc: "Your data stays yours. No selling, no ads." },
              { icon: Users, color: "text-accent", bg: "bg-accent/10", title: "Real Connections", desc: "Connect only with friends you approve." },
              { icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10", title: "Lightning Fast", desc: "Snappy, smooth, and designed for mobile." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center ${f.color} shrink-0`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm mb-0.5">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-border/40 space-y-2 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground mb-3">Contact Support</div>
            <a href="tel:+254758891491" className="flex items-center gap-2 hover:text-foreground transition-colors"><Phone className="w-4 h-4" /> 0758 891 491</a>
            <a href="tel:+254713881613" className="flex items-center gap-2 hover:text-foreground transition-colors"><Phone className="w-4 h-4" /> 0713 881 613</a>
            <a href="mailto:nutterxapp@gmail.com" className="flex items-center gap-2 hover:text-foreground transition-colors"><Mail className="w-4 h-4" /> nutterxapp@gmail.com</a>
            <a href="https://www.instagram.com/nutterx_?igsh=MTkwcWNya2Y0bTgzcw==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors"><Instagram className="w-4 h-4" /> @nutterx_</a>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4">
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-sans font-black text-2xl shadow-xl shadow-primary/30 mb-3">
                NX
              </div>
              <h1 className="text-2xl font-sans font-black">Welcome to NX-Connect</h1>
            </div>

            <h2 className="text-2xl font-sans font-black mb-1 hidden lg:block">
              {tab === "login" ? "Welcome back" : tab === "signup" ? "Create your account" : "Reset password"}
            </h2>
            <p className="text-muted-foreground text-sm mb-6 hidden lg:block">
              {tab === "login" ? "Sign in to your NX-Connect account" : tab === "signup" ? "Join NX-Connect for free in seconds" : "We'll contact you with your new password"}
            </p>

            <Card className="p-7">
              {tab !== "forgot" && (
                <div className="flex mb-6 bg-secondary rounded-xl p-1">
                  <button
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${tab === "login" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => { setTab("login"); setError(""); }}
                    data-testid="tab-login"
                  >
                    Sign In
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${tab === "signup" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => { setTab("signup"); setError(""); }}
                    data-testid="tab-signup"
                  >
                    Create Account
                  </button>
                </div>
              )}

              {error && <div className="p-3 mb-5 bg-destructive/10 text-destructive rounded-xl text-sm font-medium text-center" data-testid="auth-error">{error}</div>}
              {success && <div className="p-3 mb-5 bg-green-500/10 text-green-600 rounded-xl text-sm font-medium text-center">{success}</div>}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {tab === "signup" && (
                  <>
                    <Input name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required data-testid="input-name" />
                    <Input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required data-testid="input-email" />
                    <Input name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required data-testid="input-phone" />
                  </>
                )}

                {tab !== "forgot" && (
                  <Input name="username" placeholder={tab === "login" ? "Username or Email" : "Username"} value={formData.username} onChange={handleChange} required data-testid="input-username" />
                )}

                {tab === "forgot" && (
                  <>
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-bold mb-1">Reset your password</h3>
                      <p className="text-xs text-muted-foreground">Provide your details and admin will contact you with a new password</p>
                    </div>
                    <Input name="phone" placeholder="Your Phone Number" value={formData.phone} onChange={handleChange} required data-testid="input-forgot-phone" />
                    <Input name="email" type="email" placeholder="Your Email Address" value={formData.email} onChange={handleChange} required data-testid="input-forgot-email" />
                  </>
                )}

                {tab !== "forgot" && (
                  <Input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required minLength={6} data-testid="input-password" />
                )}

                <Button type="submit" className="w-full mt-2 py-4 rounded-xl" disabled={isLoggingIn || isSigningUp} data-testid="button-auth-submit">
                  {isLoggingIn || isSigningUp ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Please wait...</span>
                  ) : (
                    tab === "login" ? "Sign In" : tab === "signup" ? "Create Account" : "Submit Request"
                  )}
                </Button>
              </form>

              {tab === "login" && (
                <button onClick={() => setTab("forgot")} className="w-full text-center text-sm text-primary mt-5 hover:underline font-medium" data-testid="link-forgot-password">
                  Forgot password?
                </button>
              )}
              {tab === "forgot" && (
                <button onClick={() => setTab("login")} className="w-full text-center flex items-center justify-center text-sm text-muted-foreground mt-5 hover:text-foreground font-medium">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
                </button>
              )}
            </Card>

            <div className="mt-6 bg-card border border-border/50 rounded-2xl p-4 lg:hidden">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Need Help?</div>
              <div className="grid grid-cols-2 gap-2">
                <a href="tel:+254758891491" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50">
                  <Phone className="w-4 h-4 text-green-500" /> 0758 891 491
                </a>
                <a href="mailto:nutterxapp@gmail.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50">
                  <Mail className="w-4 h-4 text-blue-500" /> Email Support
                </a>
                <a href="tel:+254713881613" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50">
                  <Phone className="w-4 h-4 text-green-500" /> 0713 881 613
                </a>
                <a href="https://www.instagram.com/nutterx_?igsh=MTkwcWNya2Y0bTgzcw==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50">
                  <Instagram className="w-4 h-4 text-pink-500" /> @nutterx_
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
