import { useLocation } from "wouter";
import { useEffect, memo } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingScreen } from "@/components/ui/loading";
import { useAuth } from "./hooks/use-auth";
import { Layout } from "./components/layout";

import HomeFeed from "./pages/home";
import FriendsPage from "./pages/friends";
import ChatsPage from "./pages/chats";
import NotificationsPage from "./pages/notifications";
import ProfilePage from "./pages/profile";

import { lazy, Suspense } from "react";
const LandingPage = lazy(() => import("./pages/landing"));
const AuthPage = lazy(() => import("./pages/auth"));
const UserProfilePage = lazy(() => import("./pages/user-profile"));
const PostPage = lazy(() => import("./pages/post"));
const AdminDashboard = lazy(() => import("./pages/admin"));

const Spinner = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const MemoHome = memo(HomeFeed);
const MemoFriends = memo(FriendsPage);
const MemoChats = memo(ChatsPage);
const MemoNotifications = memo(NotificationsPage);
const MemoProfile = memo(ProfilePage);

const TAB_PATHS = ["/home", "/friends", "/chats", "/notifications", "/profile"];

function KeepAlivePages({ location }: { location: string }) {
  const on = (p: string) =>
    location === p || location.startsWith(p + "/") || location.startsWith(p + "?");
  return (
    <>
      <div className={on("/home") ? "" : "hidden"}>
        <MemoHome />
      </div>
      <div className={on("/friends") ? "flex-1 flex flex-col" : "hidden"}>
        <MemoFriends />
      </div>
      <div className={on("/chats") ? "flex-1 flex flex-col overflow-hidden" : "hidden"}>
        <MemoChats />
      </div>
      <div className={on("/notifications") ? "" : "hidden"}>
        <MemoNotifications />
      </div>
      <div className={location === "/profile" ? "" : "hidden"}>
        <MemoProfile />
      </div>
    </>
  );
}

function Router() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const isAdmin = window.location.search.includes("admin=true") || location === "/admin";

  useEffect(() => {
    if (!isLoading && user && (location === "/" || location === "/auth")) {
      setLocation("/home");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) return <LoadingScreen />;

  if (isAdmin) {
    return <Suspense fallback={<Spinner />}><AdminDashboard /></Suspense>;
  }

  if (!user) {
    if (location === "/auth") {
      return <Suspense fallback={<Spinner />}><AuthPage /></Suspense>;
    }
    return <Suspense fallback={<Spinner />}><LandingPage /></Suspense>;
  }

  if (location === "/" || location === "/auth") return null;

  if (/^\/profile\/.+/.test(location)) {
    return <Suspense fallback={<Spinner />}><UserProfilePage /></Suspense>;
  }
  if (/^\/post\/.+/.test(location)) {
    return <Suspense fallback={<Spinner />}><PostPage /></Suspense>;
  }

  const isTab = TAB_PATHS.some(
    (p) => location === p || location.startsWith(p + "/") || location.startsWith(p + "?")
  );
  if (!isTab) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">This page doesn't exist.</p>
        <a href="/home" className="text-white bg-primary px-6 py-3 rounded-xl font-bold">
          Go Home
        </a>
      </div>
    );
  }

  return <KeepAlivePages location={location} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
