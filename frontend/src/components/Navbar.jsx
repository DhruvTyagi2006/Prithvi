import { NavLink, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/map', label: 'Risk Map' },
  { to: '/sensors', label: 'Sensors' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/simulation', label: 'Simulation' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const onLanding = pathname === '/';

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md ${
        onLanding
          ? 'border-electric/10 bg-abyss/60'
          : 'border-fern/10 bg-mist/85'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <svg width="26" height="26" viewBox="0 0 64 64" className="shrink-0">
            <circle cx="32" cy="32" r="30" fill={onLanding ? '#4F8FE3' : '#0F2027'} opacity="0.12" />
            <path
              d="M6 34c9-6 15-2 21-6s11-11 20-9 15 11 19 9"
              stroke={onLanding ? '#4F8FE3' : '#7FA37A'}
              strokeWidth="2.4"
              fill="none"
            />
            <circle cx="32" cy="32" r="4" fill="#B94A43" />
          </svg>
          <span
            className={`font-display text-lg tracking-tight ${
              onLanding ? 'text-mist' : 'text-fern'
            }`}
          >
            Prithvi
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? onLanding
                      ? 'bg-electric/20 text-electric'
                      : 'bg-moss/15 text-fern'
                    : onLanding
                      ? 'text-mist/70 hover:bg-white/5 hover:text-mist'
                      : 'text-ink/60 hover:bg-fern/5 hover:text-fern'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/dashboard"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors md:hidden ${
            onLanding ? 'bg-electric text-void' : 'bg-fern text-mist'
          }`}
        >
          Open App
        </NavLink>
      </div>
    </header>
  );
}
