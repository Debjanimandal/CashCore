import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <Sidebar />
      {/* Page content — offset by sidebar on desktop via .page-container in globals.css */}
      {children}
      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <BottomNav />
    </>
  );
}
