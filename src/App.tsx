/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import AuthPages from "./components/AuthPages";
import ClientDashboard from "./components/ClientDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>("home");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Initialize and validate cached JWT
  useEffect(() => {
    const cachedToken = localStorage.getItem("vgocraft_token");
    if (!cachedToken) {
      setCheckingAuth(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${cachedToken}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setToken(cachedToken);
          setUser(userData);
          // Route immediately to appropriate dashboard
          if (userData.role === "admin") {
            setCurrentRoute("admin-dashboard");
          } else {
            setCurrentRoute("client-dashboard");
          }
        } else {
          // Token expired or invalid
          localStorage.removeItem("vgocraft_token");
        }
      } catch (err) {
        console.error("Token verification failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyToken();
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    localStorage.setItem("vgocraft_token", newToken);
    setToken(newToken);
    setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("vgocraft_token");
    setToken(null);
    setUser(null);
    setCurrentRoute("home");
  };

  // Helper route triggers (e.g. from verification and resets in url query parameters)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasToken = params.get("token");
    const hasEmail = params.get("email");
    const isVerify = window.location.pathname.includes("verify-email");
    const isReset = window.location.pathname.includes("reset-password");

    if (hasToken && hasEmail) {
      if (isReset) {
        setCurrentRoute("reset");
      } else if (isVerify) {
        // Trigger automated verification
        const triggerVerify = async () => {
          try {
            const res = await fetch("/api/auth/verify-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: hasToken, email: hasEmail }),
            });
            if (res.ok) {
              alert("Your VgoCraft account has been verified successfully! You can now log in.");
              setCurrentRoute("login");
              // Clear URL search params
              window.history.replaceState({}, document.title, "/");
            } else {
              const err = await res.json();
              alert(err.message || "Email verification failed.");
            }
          } catch (e) {
            console.error("Verification callback failed:", e);
          }
        };
        triggerVerify();
      }
    }
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <GraduationCap className="h-12 w-12 text-blue-500 animate-bounce" />
          <span className="font-display font-bold text-2xl tracking-tight text-white">VgoCraft Workspace</span>
          <p className="text-slate-500 text-xs font-mono">Synchronizing secure sessions & database clusters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative">
      <AnimatePresence mode="wait">
        {currentRoute === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <LandingPage onNavigate={setCurrentRoute} />
          </motion.div>
        )}

        {(currentRoute === "login" || currentRoute === "register" || currentRoute === "forgot" || currentRoute === "reset") && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <AuthPages
              initialView={currentRoute as any}
              onNavigate={setCurrentRoute}
              onLoginSuccess={handleLoginSuccess}
            />
          </motion.div>
        )}

        {currentRoute === "client-dashboard" && token && user && (
          <motion.div
            key="client-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ClientDashboard token={token} user={user} onLogout={handleLogout} />
          </motion.div>
        )}

        {currentRoute === "admin-dashboard" && token && user && (
          <motion.div
            key="admin-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AdminDashboard token={token} user={user} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
