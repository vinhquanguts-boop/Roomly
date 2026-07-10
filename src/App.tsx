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
const QuizPage = lazy(() =>
  import('@/pages/QuizPage').then((module) => ({ default: module.QuizPage }))
);
const GeneratingPage = lazy(() =>
  import('@/pages/GeneratingPage').then((module) => ({ default: module.GeneratingPage }))
);
const ResultPage = lazy(() =>
  import('@/pages/ResultPage').then((module) => ({ default: module.ResultPage }))
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
            <Route path="/design/quiz" element={<QuizPage />} />
            <Route path="/design/generating/:id" element={<GeneratingPage />} />
            <Route path="/design/result/:id" element={<ResultPage />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
