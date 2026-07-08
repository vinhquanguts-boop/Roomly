import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from '@/pages/LandingPage';

const LandingPlaceholder = lazy(() =>
  import('@/pages/LandingPlaceholder').then((module) => ({ default: module.LandingPlaceholder }))
);
const UploadPage = lazy(() =>
  import('@/pages/UploadPage').then((module) => ({ default: module.UploadPage }))
);
const SetupPage = lazy(() =>
  import('@/pages/SetupPage').then((module) => ({ default: module.SetupPage }))
);
const QuizPlaceholder = lazy(() =>
  import('@/pages/QuizPlaceholder').then((module) => ({ default: module.QuizPlaceholder }))
);

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="flex min-h-dvh items-center justify-center bg-bg-base text-sm font-semibold text-text-secondary">
              Loading Roomly...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/design" element={<LandingPlaceholder />} />
            <Route path="/design/upload" element={<UploadPage />} />
            <Route path="/design/setup" element={<SetupPage />} />
            <Route path="/design/quiz" element={<QuizPlaceholder />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
