import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Smartphone, Shield, Users, Download, Star, MapPin, Phone, Mail, Instagram, MessageCircle, CheckCircle, Zap, Camera, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/shared";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); setDeferredPrompt(null); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } else if (!installed) {
      setShowInstallModal(true);
    }
  };

  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      <nav className="fixed top-0 left-0 right-0 glass-panel z-50 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-sans font-black text-lg shadow-lg shadow-primary/30">
              NX
            </div>
            <span className="font-sans font-bold text-xl tracking-tight hidden sm:block">NX-Connect</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://www.instagram.com/nutterx_?igsh=MTkwcWNya2Y0bTgzcw==" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary/50">
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </a>
            <Link href="/auth">
              <Button variant="ghost" className="text-sm">Sign In</Button>
            </Link>
            <Link href="/auth?tab=signup">
              <Button className="text-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-24 px-5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/15 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto text-center mt-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-8 animate-in slide-in-from-top-4">
            <Zap className="w-3.5 h-3.5" />
            Now available — Join free today
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-sans font-black mb-6 leading-[1.05] tracking-tight animate-in slide-in-from-bottom-4">
            Connect Without <br />
            <span className="text-gradient">Compromise.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom-4" style={{ animationDelay: "100ms" }}>
            A social platform built for real connections. Share moments, message friends, and stay in the loop — without the noise.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in slide-in-from-bottom-4" style={{ animationDelay: "200ms" }}>
            <Link href="/auth?tab=signup" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto text-base px-8 py-5 rounded-2xl shadow-xl shadow-primary/30" data-testid="button-get-started-hero">
                Join NX-Connect Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto text-base px-8 py-5 rounded-2xl bg-background/60 hover:bg-secondary/50"
              onClick={handleInstall}
              data-testid="button-download-app"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xs mr-2">NX</div>
              {installed ? "App Installed ✓" : "Download App"}
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground animate-in slide-in-from-bottom-4" style={{ animationDelay: "300ms" }}>
            {["Free forever", "No ads", "Private & secure"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-border/50 bg-secondary/20">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Active Users", value: "2M+" },
            { label: "Daily Posts", value: "15M+" },
            { label: "Countries", value: "120" },
            { label: "Uptime", value: "99.9%" },
          ].map((s, i) => (
            <FadeIn key={s.label} delay={i * 80}>
              <div className="text-4xl font-sans font-black text-foreground mb-1">{s.value}</div>
              <div className="text-muted-foreground text-sm uppercase tracking-widest font-medium">{s.label}</div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <h2 className="text-4xl font-sans font-black mb-4">Why Choose NX-Connect?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">We've stripped away the noise to give you a platform focused on what actually matters.</p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Smartphone, color: "text-primary", bg: "bg-primary/10", title: "Mobile First", desc: "Designed from the ground up for your phone. Fast, fluid, feels like a native app on any device." },
              { icon: Shield, color: "text-accent", bg: "bg-accent/10", title: "Privacy Focused", desc: "Your phone number and email stay private. You control who sees your content and who can message you." },
              { icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", title: "True Connections", desc: "No algorithm-driven feeds. Just posts and messages from people you actually care about." },
              { icon: Camera, color: "text-pink-500", bg: "bg-pink-500/10", title: "Daily Stories", desc: "Share one photo post per day. Moments that live for 24 hours, keeping your feed fresh and real." },
              { icon: MessageCircle, color: "text-green-500", bg: "bg-green-500/10", title: "Direct Messaging", desc: "Real-time private chats with your friends. Clean, fast, and beautifully simple." },
              { icon: Heart, color: "text-red-500", bg: "bg-red-500/10", title: "Engaging Feed", desc: "Like, comment, and interact with your circle. See who liked your posts and who's talking." },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div className="bg-card border border-border/50 p-7 rounded-3xl shadow-lg hover:-translate-y-1.5 transition-transform duration-300">
                  <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center ${f.color} mb-5`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-5 bg-secondary/15">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-14">
            <h2 className="text-4xl font-sans font-black mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Up and running in under a minute.</p>
          </FadeIn>
          <div className="space-y-10">
            {[
              { step: 1, title: "Create Your Identity", desc: "Sign up free. Choose a unique username and upload a profile picture. Only your name, username, and photo are ever public." },
              { step: 2, title: "Discover & Connect", desc: "Head to the Friends tab to find people you know. Send a request — once accepted, you're connected." },
              { step: 3, title: "Share Moments", desc: "Post updates, photos, and thoughts to your Home feed. React and comment on what your friends share." },
              { step: 4, title: "Chat Privately", desc: "Slide into Chats to send secure, direct messages to your friends in real-time, no friction." },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={i * 100}>
                <div className="flex gap-5 items-start">
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-black text-lg shadow-lg shadow-primary/25">
                    {item.step}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold mb-1.5">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-5">
        <FadeIn>
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-primary/30 mx-auto mb-6">NX</div>
            <h2 className="text-4xl font-sans font-black mb-4">Ready to Connect?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">Join thousands of people already using NX-Connect. It's free, private, and takes 30 seconds to start.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth?tab=signup">
                <Button className="text-base px-10 py-5 rounded-2xl shadow-xl shadow-primary/30" data-testid="button-get-started-cta">
                  Get Started — It's Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" className="text-base px-10 py-5 rounded-2xl" onClick={handleInstall} data-testid="button-download-cta">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-[10px] mr-2">NX</div>
                Download App
              </Button>
            </div>
          </div>
        </FadeIn>
      </section>

      <section className="py-16 px-5 border-t border-border/50 bg-secondary/10">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-sans font-black mb-2">Contact & Support</h2>
            <p className="text-muted-foreground">We're here to help. Reach out through any channel below.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            <FadeIn delay={0}>
              <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-2 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-1">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm">Location</div>
                <div className="text-muted-foreground text-sm leading-snug">Nairobi, Kenya</div>
              </div>
            </FadeIn>
            <FadeIn delay={80}>
              <a href="tel:+254758891491" className="block">
                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-2 hover:border-primary/40 transition-colors h-full">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 mb-1">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-sm">Call Us</div>
                  <div className="text-muted-foreground text-sm leading-snug">0758 891 491<br />0713 881 613</div>
                </div>
              </a>
            </FadeIn>
            <FadeIn delay={160}>
              <a href="mailto:nutterxapp@gmail.com" className="block">
                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-2 hover:border-primary/40 transition-colors h-full">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-1">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-sm">Email</div>
                  <div className="text-muted-foreground text-sm leading-snug break-all">nutterxapp@gmail.com</div>
                </div>
              </a>
            </FadeIn>
            <FadeIn delay={240}>
              <a href="https://www.instagram.com/nutterx_?igsh=MTkwcWNya2Y0bTgzcw==" target="_blank" rel="noopener noreferrer" className="block">
                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-2 hover:border-primary/40 transition-colors h-full">
                  <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500 mb-1">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-sm">Instagram</div>
                  <div className="text-muted-foreground text-sm leading-snug">@nutterx_</div>
                </div>
              </a>
            </FadeIn>
          </div>
        </div>
      </section>

      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" onClick={() => setShowInstallModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-install-modal">
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30 mb-4 mx-auto">NX</div>
            <h3 className="text-xl font-black text-center mb-1">Install NX-Connect</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">Add NX-Connect to your home screen for the best experience — it works just like a native app.</p>
            <div className="space-y-3">
              {(isAndroid || (!isIOS && !isSafari)) && (
                <div className="bg-secondary/50 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center text-green-500 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5">Android Chrome</div>
                    <div className="text-xs text-muted-foreground">Tap the <strong>⋮ menu</strong> in Chrome → <strong>"Add to Home screen"</strong> or look for the install icon <strong>(⊕)</strong> in the address bar</div>
                  </div>
                </div>
              )}
              {(isIOS || isSafari) && (
                <div className="bg-secondary/50 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5">iPhone / iPad</div>
                    <div className="text-xs text-muted-foreground">In Safari, tap the <strong>Share button (□↑)</strong> at the bottom → <strong>"Add to Home Screen"</strong></div>
                  </div>
                </div>
              )}
              {!isAndroid && !isIOS && (
                <div className="bg-secondary/50 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-500 shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5">Desktop Chrome / Edge</div>
                    <div className="text-xs text-muted-foreground">Click the <strong>install icon (⊕)</strong> in your browser's address bar, or go to <strong>Menu → "Install NX-Connect"</strong></div>
                  </div>
                </div>
              )}
            </div>
            <Button className="w-full mt-5 rounded-2xl" onClick={() => setShowInstallModal(false)} data-testid="button-install-got-it">Got it</Button>
          </div>
        </div>
      )}

      <footer className="py-10 border-t border-border/50 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-sans font-black text-base">NX</div>
              <div>
                <div className="font-sans font-bold text-base leading-none">NX-Connect</div>
                <div className="text-xs text-muted-foreground mt-0.5">Nairobi, Kenya</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap justify-center">
              <a href="tel:+254758891491" className="hover:text-foreground transition-colors flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> 0758 891 491</a>
              <a href="mailto:nutterxapp@gmail.com" className="hover:text-foreground transition-colors flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</a>
              <a href="https://www.instagram.com/nutterx_?igsh=MTkwcWNya2Y0bTgzcw==" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> Instagram</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-6 pt-6 border-t border-border/30">
            © {new Date().getFullYear()} NX-Connect. All rights reserved. Built with ♥ in Nairobi, Kenya.
          </div>
        </div>
      </footer>
    </div>
  );
}
