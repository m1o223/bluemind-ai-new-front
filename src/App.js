import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import BlueMindInteractionProvider from "@/components/BlueMindInteractionProvider";
import BrandLogo from "@/components/BrandLogo";
import LandingPage from "@/pages/LandingPage";
import AuthSelectionPage from "@/pages/AuthSelectionPage";
import RegisterPage from "@/pages/RegisterPage";
import LoginPage from "@/pages/LoginPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import VerifyResetCodePage from "@/pages/VerifyResetCodePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ChatPage from "@/pages/ChatPage";
import DashboardPage from "@/pages/DashboardPage";
import RemindersPage from "@/pages/RemindersPage";
import FeedbackPage from "@/pages/FeedbackPage";
import SettingsPage from "@/pages/SettingsPage";
import LearningPage from "@/pages/LearningPage";
import AIPlansPage from "@/pages/AIPlansPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import SchemanPage, { ScheduleCustomPage, ScheduleHomePage } from "@/pages/SchemanPage";
import MobileLayout from "@/mobile/layouts/MobileLayout";
import MobileChat from "@/mobile/pages/MobileChat";
import MobileSearch from "@/mobile/pages/MobileSearch";
import MobileCreateImage from "@/mobile/pages/MobileCreateImage";
import MobileWriteEdit from "@/mobile/pages/MobileWriteEdit";
import MobileReminders from "@/mobile/pages/MobileReminders";
import MobileLearning from "@/mobile/pages/MobileLearning";
import MobileScheduleDashboard from "@/mobile/pages/MobileScheduleDashboard";
import MobileSettings from "@/mobile/pages/MobileSettings";
import MobileSmartHub from "@/mobile/pages/MobileSmartHub";
import MobileWelcome from "@/mobile/pages/MobileWelcome";
import MobileEmail from "@/mobile/pages/MobileEmail";
import MobileRegister from "@/mobile/pages/MobileRegister";
import MobileForgotPassword from "@/mobile/pages/MobileForgotPassword";
import MobileVerifyResetCode from "@/mobile/pages/MobileVerifyResetCode";
import MobileResetPassword from "@/mobile/pages/MobileResetPassword";
import { getAndroidMobilePath, isNativeAndroidApp } from "@/capacitorRuntime";
import { restoreExistingSession } from "@/services/authService";
import { getPreferredAppRoute } from "@/services/navigationPreferences";
import "@/App.css";

function AppLoadingScreen() {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen bg-[var(--bm-bg-app)] flex items-center justify-center">
      <BrandLogo
        logoClassName="w-12 h-12"
        textClassName={isDark ? "text-lg text-white" : "text-lg text-[var(--bm-text-primary)]"}
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
  const androidMobilePath = isNativeAndroidApp()
    ? getAndroidMobilePath(location.pathname, location.search, location.hash)
    : "";
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  if (androidMobilePath && androidMobilePath !== currentPath) {
    return <Navigate to={androidMobilePath} replace />;
  }

  return (
    <div
      className={isDark ? "min-h-screen bg-[var(--bm-bg-app)] text-white" : "min-h-screen bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]"}
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
          <Route path="/auth/verify-reset-code" element={<VerifyResetCodePage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
          <Route path="/reminders/:reminderId" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Navigate to="/settings/profile" replace /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/:sectionId" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/:sectionId/:detailId" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/learning" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
          <Route path="/ai-plans" element={<ProtectedRoute><AIPlansPage /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
          <Route path="/subscription/payment-method" element={<ProtectedRoute><SubscriptionPage step="payment-method" /></ProtectedRoute>} />
          <Route path="/subscription/payment-method/:methodId" element={<ProtectedRoute><SubscriptionPage step="payment-details" /></ProtectedRoute>} />
          <Route path="/subscription/add-card" element={<ProtectedRoute><SubscriptionPage step="add-card" /></ProtectedRoute>} />
          <Route path="/subscription/processing" element={<ProtectedRoute><SubscriptionPage step="processing" /></ProtectedRoute>} />
          <Route path="/subscription/success" element={<ProtectedRoute><SubscriptionPage step="success" /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><ScheduleHomePage /></ProtectedRoute>} />
          <Route path="/schedule/custom" element={<ProtectedRoute><ScheduleCustomPage /></ProtectedRoute>} />
          <Route path="/schedule/workspace" element={<ProtectedRoute><SchemanPage /></ProtectedRoute>} />
          <Route path="/scheman" element={<ProtectedRoute><Navigate to="/schedule" replace /></ProtectedRoute>} />
          <Route path="/scheman/custom" element={<ProtectedRoute><Navigate to="/schedule/custom" replace /></ProtectedRoute>} />
          <Route path="/scheman/workspace" element={<ProtectedRoute><Navigate to="/schedule/workspace" replace /></ProtectedRoute>} />
          <Route path="/mobile" element={<MobileLayout />}>
            <Route index element={<MobileWelcome />} />
            <Route path="email" element={<MobileEmail />} />
            <Route path="register" element={<MobileRegister />} />
            <Route path="forgot-password" element={<MobileForgotPassword />} />
            <Route path="verify-reset-code" element={<MobileVerifyResetCode />} />
            <Route path="reset-password" element={<MobileResetPassword />} />
            <Route path="chat" element={<MobileAccessRoute><MobileChat /></MobileAccessRoute>} />
            <Route path="search" element={<MobileAccessRoute><MobileSearch /></MobileAccessRoute>} />
            <Route path="create-image" element={<MobileAccessRoute><MobileCreateImage /></MobileAccessRoute>} />
            <Route path="write-edit" element={<MobileAccessRoute><MobileWriteEdit /></MobileAccessRoute>} />
            <Route path="reminders" element={<MobileAccessRoute><MobileReminders /></MobileAccessRoute>} />
            <Route path="reminders/:reminderId" element={<MobileAccessRoute><MobileReminders /></MobileAccessRoute>} />
            <Route path="learning" element={<MobileAccessRoute><MobileLearning /></MobileAccessRoute>} />
            <Route path="profile" element={<MobileAccessRoute><Navigate to="/mobile/settings/profile" replace /></MobileAccessRoute>} />
            <Route path="settings" element={<MobileAccessRoute><MobileSettings /></MobileAccessRoute>} />
            <Route path="settings/:sectionId" element={<MobileAccessRoute><MobileSettings /></MobileAccessRoute>} />
            <Route path="settings/:sectionId/:detailId" element={<MobileAccessRoute><MobileSettings /></MobileAccessRoute>} />
            <Route path="smart-hub" element={<MobileAccessRoute><MobileSmartHub /></MobileAccessRoute>} />
            <Route path="ai-plans" element={<MobileAccessRoute><AIPlansPage /></MobileAccessRoute>} />
            <Route path="subscription" element={<MobileAccessRoute><SubscriptionPage /></MobileAccessRoute>} />
            <Route path="subscription/payment-method" element={<MobileAccessRoute><SubscriptionPage step="payment-method" /></MobileAccessRoute>} />
            <Route path="subscription/payment-method/:methodId" element={<MobileAccessRoute><SubscriptionPage step="payment-details" /></MobileAccessRoute>} />
            <Route path="subscription/add-card" element={<MobileAccessRoute><SubscriptionPage step="add-card" /></MobileAccessRoute>} />
            <Route path="subscription/processing" element={<MobileAccessRoute><SubscriptionPage step="processing" /></MobileAccessRoute>} />
            <Route path="subscription/success" element={<MobileAccessRoute><SubscriptionPage step="success" /></MobileAccessRoute>} />
            <Route path="schedule" element={<MobileAccessRoute><MobileScheduleDashboard /></MobileAccessRoute>} />
            <Route path="schedule/custom" element={<MobileAccessRoute><ScheduleCustomPage /></MobileAccessRoute>} />
            <Route path="schedule/workspace" element={<MobileAccessRoute><SchemanPage /></MobileAccessRoute>} />
            <Route path="scheman" element={<MobileAccessRoute><Navigate to="/mobile/schedule" replace /></MobileAccessRoute>} />
            <Route path="scheman/custom" element={<MobileAccessRoute><Navigate to="/mobile/schedule/custom" replace /></MobileAccessRoute>} />
            <Route path="scheman/workspace" element={<MobileAccessRoute><Navigate to="/mobile/schedule/workspace" replace /></MobileAccessRoute>} />
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
          <BlueMindInteractionProvider />
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  );
}

export default App;
