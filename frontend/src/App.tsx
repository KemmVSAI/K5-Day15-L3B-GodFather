import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { TechnicalModeProvider } from '@/contexts/TechnicalModeContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { EvaluationPage } from '@/pages/EvaluationPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { MedicationCheckerPage } from '@/pages/MedicationCheckerPage';
import { MedicationResultsPage } from '@/pages/MedicationResultsPage';
import { SchedulePage } from '@/pages/SchedulePage';

export function App() {
  return (
    <BrowserRouter>
      <TechnicalModeProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/checker" element={<MedicationCheckerPage />} />
            <Route path="/results/:sessionId" element={<MedicationResultsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/evaluation" element={<EvaluationPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        <Toaster position="bottom-right" richColors closeButton />
      </TechnicalModeProvider>
    </BrowserRouter>
  );
}

export default App;
