import { Link } from "wouter";
import { ArrowRight, Smartphone, Shield, Users, Download, Star } from "lucide-react";
import { Button } from "@/components/ui/shared";

export default function LandingPage() {
  const installPWA = () => {
    alert("In a real environment, this would trigger the PWA install prompt. Add to Home Screen to install NUTTERX!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans">
      <nav className="fixed top-0 left-0 right-0 glass-panel z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-display font-bold text-2xl shadow-lg shadow-primary/30">
              NX
            </div>
            <span className="font-display font-bold text-2xl tracking-tighter hidden sm:block">NUTTERX</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth?tab=signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="max-w-4xl mx-auto text-center mt-12 animate-in">
          <h1 className="text-6xl md:text-8xl font-display font-extrabold mb-8 leading-tight">
            Connect Without <br />
            <span className="text-gradient">Compromise.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Experience the next generation of social networking. Pure, fast, and designed exclusively for your mobile life.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth?tab=signup" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto text-lg px-8 py-6 rounded-2xl">
                Join NutterX Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 rounded-2xl bg-background/50" onClick={installPWA}>
              <Download className="w-5 h-5 mr-2" /> Download App
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/50 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Active Users", value: "2M+" },
            { label: "Daily Posts", value: "15M+" },
            { label: "Countries", value: "120" },
            { label: "Uptime", value: "99.9%" }
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-4xl font-display font-bold text-foreground mb-2">{stat.value}</div>
              <div className="text-muted-foreground font-medium uppercase tracking-wider text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">Why Choose NutterX?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">We've stripped away the noise to give you a platform focused on what matters: real connections.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-xl shadow-black/5 hover:-translate-y-2 transition-transform">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Mobile First</h3>
            <p className="text-muted-foreground leading-relaxed">Designed from the ground up for your phone. Fast, fluid, and feels like a native app no matter what device you use.</p>
          </div>
          <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-xl shadow-black/5 hover:-translate-y-2 transition-transform">
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
              <Shield className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Privacy Focused</h3>
            <p className="text-muted-foreground leading-relaxed">Your phone number and email stay private forever. You control who sees your content and who can message you.</p>
          </div>
          <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-xl shadow-black/5 hover:-translate-y-2 transition-transform">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-4">True Connections</h3>
            <p className="text-muted-foreground leading-relaxed">No algorithmic feeds forcing you to see things you don't want. Just posts from people you actually care about.</p>
          </div>
        </div>
      </section>

      {/* Manual / How it works */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-16">How NutterX Works</h2>
          <div className="space-y-12">
            {[
              { step: 1, title: "Create Your Identity", desc: "Sign up with your details. Choose a unique username and upload a profile picture. Only your name, username, and photo are public." },
              { step: 2, title: "Discover Friends", desc: "Head to the Friends tab to discover new people. Send a request, wait for them to accept, and start sharing moments." },
              { step: 3, title: "Share & Engage", desc: "Post updates to your Home feed. Like and comment on your friends' posts to keep the conversation going." },
              { step: 4, title: "Chat Privately", desc: "Slide into the Chats tab to send secure, direct messages to your approved friends in real-time." }
            ].map(item => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/25">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-display font-bold text-sm">NX</div>
          <span className="font-display font-bold text-xl text-foreground">NUTTERX</span>
        </div>
        <p>© 2024 NutterX Social. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          <Link href="/?admin=true" className="hover:text-primary transition-colors">Admin Portal</Link>
        </div>
      </footer>
    </div>
  );
}
