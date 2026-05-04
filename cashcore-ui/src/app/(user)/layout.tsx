import BottomNav from '@/components/layout/BottomNav';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
