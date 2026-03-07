import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button, Card, Input } from "@/components/ui/shared";
import { ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  
  const [tab, setTab] = useState<"login" | "signup" | "forgot">(initialTab as any);
  const { login, signup, forgotPassword, isLoggingIn, isSigningUp } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "", username: "", phone: "", email: "", password: "", desiredPassword: ""
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
        await forgotPassword({ username: formData.username, desiredPassword: formData.desiredPassword });
        setSuccess("Password reset request sent to admins.");
        setTab("login");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-display font-bold text-3xl shadow-xl shadow-primary/30 mb-4">
            NX
          </div>
          <h1 className="text-3xl font-display font-bold">Welcome to NutterX</h1>
        </div>

        <Card className="p-8">
          <div className="flex mb-8 bg-secondary rounded-xl p-1">
            <button
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${tab === "login" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => { setTab("login"); setError(""); }}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${tab === "signup" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => { setTab("signup"); setError(""); }}
            >
              Create Account
            </button>
          </div>

          {error && <div className="p-3 mb-6 bg-destructive/10 text-destructive rounded-xl text-sm font-medium text-center">{error}</div>}
          {success && <div className="p-3 mb-6 bg-green-500/10 text-green-600 rounded-xl text-sm font-medium text-center">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <>
                <Input name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
                <Input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
                <Input name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required />
              </>
            )}
            
            <Input name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />
            
            {tab !== "forgot" && (
              <Input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required minLength={6} />
            )}
            
            {tab === "forgot" && (
              <Input name="desiredPassword" type="password" placeholder="New Desired Password" value={formData.desiredPassword} onChange={handleChange} required minLength={6} />
            )}

            <Button type="submit" className="w-full mt-6 py-4" disabled={isLoggingIn || isSigningUp}>
              {tab === "login" ? "Sign In" : tab === "signup" ? "Create Account" : "Submit Request"}
            </Button>
          </form>

          {tab === "login" && (
            <button onClick={() => setTab("forgot")} className="w-full text-center text-sm text-primary mt-6 hover:underline font-medium">
              Forgot password?
            </button>
          )}
          {tab === "forgot" && (
            <button onClick={() => setTab("login")} className="w-full text-center flex items-center justify-center text-sm text-muted-foreground mt-6 hover:text-foreground font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}
