import { lazy, Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { CookieBanner } from '@/components/CookieBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PageSuspenseFallback } from '@/components/PageSuspenseFallback';
import { PageTransition } from '@/components/PageTransition';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';
import { LandingPage } from '@/pages/LandingPage';
import { trackEvent } from '@/lib/analytics';

const LandingPlaceholder = lazy(() =>
  import('@/pages/LandingPlaceholder').then((module) => ({ default: module.LandingPlaceholder }))
);
const UploadPage = lazy(() =>
  import('@/pages/UploadPage').then((module) => ({ default: module.UploadPage }))
);
const SetupPage = lazy(() =>
  import('@/pages/SetupPage').then((module) => ({ default: module.SetupPage }))
);
const QuizPage = lazy(() =>
  import('@/pages/QuizPage').then((module) => ({ default: module.QuizPage }))
);
const GeneratingPage = lazy(() =>
  import('@/pages/GeneratingPage').then((module) => ({ default: module.GeneratingPage }))
);
const ResultPage = lazy(() =>
  import('@/pages/ResultPage').then((module) => ({ default: module.ResultPage }))
);
const SignInPage = lazy(() =>
  import('@/pages/SignInPage').then((module) => ({ default: module.SignInPage }))
);
const SignUpPage = lazy(() =>
  import('@/pages/SignUpPage').then((module) => ({ default: module.SignUpPage }))
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const ExplorePage = lazy(() =>
  import('@/pages/ExplorePage').then((module) => ({ default: module.ExplorePage }))
);
const PublicDesignPage = lazy(() =>
  import('@/pages/PublicDesignPage').then((module) => ({ default: module.PublicDesignPage }))
);
const PricingPage = lazy(() =>
  import('@/pages/PricingPage').then((module) => ({ default: module.PricingPage }))
);
const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((module) => ({ default: module.AccountPage }))
);
const PrivacyPage = lazy(() =>
  import('@/pages/LegalPages').then((module) => ({ default: module.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('@/pages/LegalPages').then((module) => ({ default: module.TermsPage }))
);
const PreDesignChatPage = lazy(() =>
  import('@/pages/PreDesignChatPage').then((module) => ({ default: module.PreDesignChatPage }))
);

const queryClient = new QueryClient();

function RouteAnalytics() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/') trackEvent('landing_view');
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RouteAnalytics />
          <AppErrorBoundary>
          <Suspense fallback={<PageSuspenseFallback />}>
            <PageTransition>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/design" element={<LandingPlaceholder />} />
                <Route path="/design/upload" element={<UploadPage />} />
                <Route path="/design/setup" element={<SetupPage />} />
                <Route path="/design/quiz" element={<QuizPage />} />
                <Route path="/design/generating/:id" element={<GeneratingPage />} />
                <Route path="/design/result/:id" element={<ResultPage />} />
                <Route path="/auth/sign-in" element={<SignInPage />} />
                <Route path="/auth/sign-up" element={<SignUpPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/explore/:slug" element={<PublicDesignPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/chat" element={<PreDesignChatPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
              </Routes>
            </PageTransition>
          </Suspense>
          </AppErrorBoundary>
        </AuthProvider>
        <Toaster position="top-center" richColors closeButton />
        <CookieBanner />
        <OfflineBanner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
