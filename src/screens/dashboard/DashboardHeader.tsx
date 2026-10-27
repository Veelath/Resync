import { Logo, LOGO_HEADER_CLASS } from '../../components/AppPrimitives';
import { B, BH } from '../../lib/brand';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { timeAgo, type AppNotification } from '../../components/ScanNotifications';

type ActiveNav = "Dashboard" | "Academic Profile" | "Settings" | "Usage / Credits";

export function DashboardHeader({ activeNav, setActiveNav, creditsLoading, creditBalance, profile, profileMenuOpen, setProfileMenuOpen, profileMenuRef, onLogout, notifications, onMarkNotificationsRead, onOpenReport, notifOpen, setNotifOpen, notifRef, unreadCount }: {
  activeNav: ActiveNav;
  setActiveNav: Dispatch<SetStateAction<ActiveNav>>;
  creditsLoading: boolean;
  creditBalance: number | null;
  profile: { fullName: string };
  profileMenuOpen: boolean;
  setProfileMenuOpen: Dispatch<SetStateAction<boolean>>;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  onLogout?: () => void;
  notifications: AppNotification[];
  onMarkNotificationsRead?: () => void;
  onOpenReport?: () => void;
  notifOpen: boolean;
  setNotifOpen: Dispatch<SetStateAction<boolean>>;
  notifRef: RefObject<HTMLDivElement | null>;
  unreadCount: number;
}) {
  return (
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80" style={{ boxShadow: "0 1px 0 rgba(26,31,204,.06)" }}>
        <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 h-15 flex items-center gap-2 md:gap-4" style={{ height: 64 }}>
          <div className="flex items-center shrink-0">
            <Logo header className={LOGO_HEADER_CLASS} />
          </div>
          <nav className="flex items-center gap-0.5 flex-1">
            {(["Dashboard"] as const).map(label => (
              <button key={label} onClick={() => setActiveNav(label as typeof activeNav)}
                aria-label={label}
                className="flex items-center gap-1.5 px-2 sm:px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                style={{ background: activeNav === label ? B : "transparent", color: activeNav === label ? "white" : "#6b7280", boxShadow: activeNav === label ? `0 2px 10px ${B}30` : "none" }}>
                {label === "Dashboard" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>}
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div aria-label={`Credits: ${creditsLoading ? "loading" : creditBalance ?? "unavailable"}`} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors hover:bg-gray-50 cursor-default"
              style={{ borderColor: `${B}20`, background: `${B}06`, color: B }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              <span className="hidden sm:inline">Credits:</span> {creditsLoading ? "…" : creditBalance !== null ? creditBalance : "—"}
            </div>
            <div className="h-5 w-px bg-gray-100 hidden sm:block" />
            <div ref={notifRef} className="relative">
              <button
                aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
                aria-haspopup="true"
                aria-expanded={notifOpen}
                onClick={() => { setNotifOpen(open => !open); if (!notifOpen) onMarkNotificationsRead?.(); }}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white" />}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 bg-white p-2 shadow-xl z-50 animate-slide-in">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">Notifications</p>
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-gray-400">No notifications yet.</p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto">
                      {notifications.map(n => (
                        <li key={n.id}>
                          <button type="button" onClick={() => { setNotifOpen(false); if (n.kind === "success") onOpenReport?.(); }}
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors">
                            <span className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{ background: n.kind === "success" ? "#22c55e" : "#ef4444" }} />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-800">{n.title}</span>
                              <span className="block text-xs text-gray-500 leading-relaxed">{n.message}</span>
                              <span className="block text-[10px] text-gray-400 mt-0.5">{timeAgo(n.at)}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="h-5 w-px bg-gray-100 hidden sm:block" />
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(open => !open)}
                aria-label={`${profile.fullName} user account menu`}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                </div>
                <p className="hidden md:block text-xs font-bold text-gray-800">{profile.fullName}</p>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 text-gray-400 hidden md:block transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>

              {profileMenuOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl z-50 animate-slide-in">
                  {[
                    {
                      label: "Dashboard",
                      action: () => setActiveNav("Dashboard"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
                    },
                    {
                      label: "Academic Profile",
                      action: () => setActiveNav("Academic Profile"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>,
                    },
                    {
                      label: "Settings",
                      action: () => setActiveNav("Settings"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21h-4v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3v-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3h4v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0019.4 9c.12.6.65 1.03 1.26 1.03H21v4h-.09A1.65 1.65 0 0019.4 15z" /></svg>,
                    },
                    {
                      label: "Usage / Credits",
                      action: () => setActiveNav("Usage / Credits"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
                    },
                  ].map(item => (
                    <button key={item.label} role="menuitem" onClick={() => { item.action(); setProfileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                      <span className="text-gray-400">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-gray-100 my-1" />
                  <button role="menuitem" onClick={() => { setProfileMenuOpen(false); onLogout?.(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
  );
}
