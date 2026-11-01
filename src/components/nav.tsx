"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, FlaskConical, LayoutDashboard, LogIn, LogOut, User } from "lucide-react";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <rect x="1" y="1" width="34" height="34" rx="10" fill="url(#aarogyaGrad)" fillOpacity="0.18" />
        <rect x="1" y="1" width="34" height="34" rx="10" stroke="url(#aarogyaGrad)" strokeOpacity="0.7" strokeWidth="1.5" />
        {/* Healthcare Cross */}
        <path d="M18 8v20M8 18h20" stroke="url(#aarogyaGrad)" strokeWidth="3.2" strokeLinecap="round" />
        {/* Vital Heartbeat line */}
        <path d="M11 18h4l2-4 2 8 2-4h4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="aarogyaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#2ee6c0" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <span className="pulse-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-mint" />
    </span>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ name: string; patientId: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    // Check if user is logged in
    async function checkUser() {
      try {
        const local = localStorage.getItem("aarogya_user");
        if (local) {
          setUser(JSON.parse(local));
        }
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          localStorage.setItem("aarogya_user", JSON.stringify(data.user));
        } else if (!local) {
          setUser(null);
        }
      } catch {
        // use local
      }
    }
    checkUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("aarogya_user");
    setUser(null);
    router.push("/login");
  };

  const linkCls = (href: string) =>
    `font-mono2 text-[11px] uppercase tracking-[0.22em] transition-colors ${
      pathname === href ? "text-mintsoft" : "text-dim hover:text-fg"
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-line bg-ink/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <Logo />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[17px] font-bold tracking-tight text-fg">
              Aarogya <span className="text-mint">Care AI</span>
            </span>
            <span className="font-mono2 text-[9px] uppercase tracking-[0.24em] text-faint group-hover:text-mint transition-colors">
              multi-agent prescription care
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {user ? (
            <Link href="/dashboard" className={linkCls("/dashboard")}>
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className={linkCls("/login")}>
              Sign In
            </Link>
          )}
          <Link href="/analyze" className={linkCls("/analyze")}>
            Analyzer
          </Link>
          <Link href="/history" className={linkCls("/history")}>
            History Vault
          </Link>
          <span className="chip gap-2 normal-case tracking-normal">
            <Activity size={12} className="text-mint" />
            <span className="font-mono2 text-[10px] tracking-[0.14em] text-dim">5 AGENTS · NIH RXNAV + FDA + AUDIO</span>
          </span>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-mint/30 bg-mint/10 px-3 py-1.5 text-[12.5px] font-medium text-mint hover:bg-mint/20 transition-colors"
              >
                <User size={14} />
                <span>{user.name.split(" ")[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-ghost h-9 px-3 text-[12px] text-faint hover:text-rose hover:bg-rose/10"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-ghost h-9 px-3.5 text-[12.5px] border border-line">
              <LogIn size={14} /> Sign In
            </Link>
          )}

          <Link href="/analyze" className="btn btn-primary h-10 px-4 text-[13px] hidden sm:inline-flex">
            <FlaskConical size={14} />
            Run Agents
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  );
}
