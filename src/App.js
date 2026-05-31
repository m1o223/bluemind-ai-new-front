import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";
import LandingPage from "@/pages/LandingPage";
import AuthSelectionPage from "@/pages/AuthSelectionPage";
import RegisterPage from "@/pages/RegisterPage";
import LoginPage from "@/pages/LoginPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ChatPage from "@/pages/ChatPage";
import DashboardPage from "@/pages/DashboardPage";
import RemindersPage from "@/pages/RemindersPage";
import FeedbackPage from "@/pages/FeedbackPage";
import ProfilePage from "@/pages/ProfilePage";
import LearningPage from "@/pages/LearningPage";
import SchemanPage from "@/pages/SchemanPage";
import GoogleCallbackPage from "@/pages/GoogleCallbackPage";
import MobileLayout from "@/mobile/layouts/MobileLayout";
import MobileChat from "@/mobile/pages/MobileChat";
import MobileSearch from "@/mobile/pages/MobileSearch";
import MobileCreateImage from "@/mobile/pages/MobileCreateImage";
import MobileWriteEdit from "@/mobile/pages/MobileWriteEdit";
import MobileReminders from "@/mobile/pages/MobileReminders";
import MobileLearning from "@/mobile/pages/MobileLearning";
import MobileProfile from "@/mobile/pages/MobileProfile";
import MobileSettings from "@/mobile/pages/MobileSettings";
import MobileSmartHub from "@/mobile/pages/MobileSmartHub";
import MobileWelcome from "@/mobile/pages/MobileWelcome";
import MobileEmail from "@/mobile/pages/MobileEmail";
import MobileRegister from "@/mobile/pages/MobileRegister";
import { restoreExistingSession } from "@/services/authService";
import { getPreferredAppRoute } from "@/services/navigationPreferences";
import "@/App.css";

function AppLoadingScreen() {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={isDark ? "min-h-screen bg-[#1a1a1a] flex items-center justify-center" : "min-h-screen bg-white flex items-center justify-center"}>
      <BrandLogo
        logoClassName="w-12 h-12"
        textClassName={isDark ? "text-lg text-white" : "text-lg text-[#111827]"}
      />
    </div>
  );
}

function LandingGate() {
  const [status, setStatus] = useState("checking");
  const [target, setTarget] = useState("");

  useEffect(() => {
    restoreExistingSession()
      .then((result) => {
        setTarget(getPreferredAppRoute(result?.user || result));
        setStatus("authenticated");
      })
      .catch(() => setStatus("guest"));
  }, []);

  if (status === "checking") {
    return <AppLoadingScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to={target || "/dashboard"} replace />;
  }

  return <LandingPage />;
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    restoreExistingSession()
      .then(() => setStatus("ready"))
      .catch(() => setStatus("unauthenticated"));
  }, []);

  if (status === "checking") {
    return <AppLoadingScreen />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
}

function MobileAccessRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    restoreExistingSession()
      .then(() => setStatus("ready"))
      .catch(() => setStatus("unauthenticated"));
  }, []);

  if (status === "checking") {
    return <AppLoadingScreen />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/mobile" replace />;
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const { resolvedTheme, isRTL } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={isDark ? "min-h-screen bg-[#1a1a1a] text-white" : "min-h-screen"}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingGate />} />
          <Route path="/auth" element={<AuthSelectionPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
          <Route path="/reminders/:reminderId" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/learning" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
          <Route path="/scheman" element={<ProtectedRoute><SchemanPage /></ProtectedRoute>} />
          <Route path="/mobile" element={<MobileLayout />}>
            <Route index element={<MobileWelcome />} />
            <Route path="email" element={<MobileEmail />} />
            <Route path="register" element={<MobileRegister />} />
            <Route path="chat" element={<MobileAccessRoute><MobileChat /></MobileAccessRoute>} />
            <Route path="search" element={<MobileAccessRoute><MobileSearch /></MobileAccessRoute>} />
            <Route path="create-image" element={<MobileAccessRoute><MobileCreateImage /></MobileAccessRoute>} />
            <Route path="write-edit" element={<MobileAccessRoute><MobileWriteEdit /></MobileAccessRoute>} />
            <Route path="reminders" element={<MobileAccessRoute><MobileReminders /></MobileAccessRoute>} />
            <Route path="reminders/:reminderId" element={<MobileAccessRoute><MobileReminders /></MobileAccessRoute>} />
            <Route path="learning" element={<MobileAccessRoute><MobileLearning /></MobileAccessRoute>} />
            <Route path="profile" element={<MobileAccessRoute><MobileProfile /></MobileAccessRoute>} />
            <Route path="settings" element={<MobileAccessRoute><MobileSettings /></MobileAccessRoute>} />
            <Route path="smart-hub" element={<MobileAccessRoute><MobileSmartHub /></MobileAccessRoute>} />
          </Route>
        </Routes>
      </AnimatePresence>
      <Toaster position="top-center" />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <TooltipProvider delayDuration={100}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  );
}

export default App;
