import styles from './admin.module.css';

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Overview', href: '/admin/dashboard', icon: '⊞' },
  { id: 'users', label: 'Users', href: '/admin/users', icon: '👥' },
  { id: 'transactions', label: 'Transactions', href: '/admin/transactions', icon: '↔' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.adminBadge}>ADMIN</div>
          <span className={styles.brandName}>CashCore</span>
        </div>
        <nav className={styles.sidebarNav}>
          {ADMIN_NAV.map((item) => (
            <a key={item.id} href={item.href} className={styles.navItem} id={`admin-nav-${item.id}`}>
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <a href="/login" className={styles.logoutLink} id="admin-logout">Sign out</a>
        </div>
      </aside>
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}
