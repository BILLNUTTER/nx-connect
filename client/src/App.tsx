import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useAuth } from "./hooks/use-auth";
import { Layout } from "./components/layout";

import LandingPage from "./pages/landing";
import AuthPage from "./pages/auth";
import HomeFeed from "./pages/home";
import FriendsPage from "./pages/friends";
import ChatsPage from "./pages/chats";
import NotificationsPage from "./pages/notifications";
import ProfilePage from "./pages/profile";
import AdminDashboard from "./pages/admin";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary font-display text-2xl font-bold animate-pulse">Loading NX...</div>;
  if (!user) return null;

  return <Component />;
}

function Router() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const isSearchAdmin = window.location.search.includes("admin=true");

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary font-display text-2xl font-bold animate-pulse">Loading NX...</div>;

  // Intercept Admin Route
  if (isSearchAdmin || location === "/admin") {
    return <AdminDashboard />;
  }

  return (
    <Switch>
      <Route path="/">
        {user ? <HomeFeed /> : <LandingPage />}
      </Route>
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected App Routes wrapped in standard Layout */}
      <Route path="/home">
        <ProtectedRoute component={HomeFeed} />
      </Route>
      <Route path="/friends">
        <ProtectedRoute component={FriendsPage} />
      </Route>
      <Route path="/chats">
        <ProtectedRoute component={ChatsPage} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={NotificationsPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>

      <Route>
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-8">This page doesn't exist.</p>
          <a href="/" className="text-white bg-primary px-6 py-3 rounded-xl font-bold">Go Home</a>
        </div>
      </Route>
    </Switch>
  );
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
