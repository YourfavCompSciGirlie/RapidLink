import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/app-shell';
import { EmergencyProvider } from '@/features/emergency/emergency-context';
import AttendancePage from '@/pages/attendance';
import ClientPage from '@/pages/client';
import LauncherPage from '@/pages/launcher';
import MessagesPage from '@/pages/messages';
import OfflinePage from '@/pages/offline';
import ResponderPage from '@/pages/responder';
import ResponderOfferPage from '@/pages/responder-offer';
import SupervisorPage from '@/pages/supervisor';

export function App() {
  return (
    <EmergencyProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<LauncherPage />} />
          <Route path="/client" element={<ClientPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/responder" element={<ResponderPage />} />
          <Route path="/responder/offers/:offerId" element={<ResponderOfferPage />} />
          <Route path="/supervisor" element={<SupervisorPage />} />
          <Route path="/supervisor/attendance" element={<AttendancePage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </EmergencyProvider>
  );
}
