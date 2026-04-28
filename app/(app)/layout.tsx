import AppShell from '@/components/AppShell';
import { ScopeProvider } from '@/lib/viewScope';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScopeProvider>
      <AppShell>{children}</AppShell>
    </ScopeProvider>
  );
}