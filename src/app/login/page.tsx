"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import Nav, { Logo } from "@/components/nav";
import Footer from "@/components/footer";

type AuthMode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupAge, setSignupAge] = useState("");
  const [signupGender, setSignupGender] = useState("Male");
  const [signupPassword, setSignupPassword] = useState("");

  // Forgot password form state
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fillDemoAccount = () => {
    setMode("login");
    setLoginIdentifier("ramesh@aarogyacare.ai");
    setLoginPassword("password123");
    setError(null);
    setSuccess("Filled demo patient credentials. Click 'Log In' to continue.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!loginIdentifier.trim()) {
      setError("Please enter your email address or phone number.");
      return;
    }
    if (!loginPassword.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      setSuccess("Login successful! Redirecting to your patient dashboard...");
      if (typeof window !== "undefined") {
        localStorage.setItem("aarogya_user", JSON.stringify(data.user));
      }
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: any) {
      setError(err.message || "An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!signupName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          phone: signupPhone.trim(),
          age: signupAge ? parseInt(signupAge, 10) : null,
          gender: signupGender,
          password: signupPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccess("Account created successfully! Redirecting to your dashboard...");
      if (typeof window !== "undefined") {
        localStorage.setItem("aarogya_user", JSON.stringify(data.user));
      }
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!forgotIdentifier.trim()) {
      setError("Please enter your registered email or phone number.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          newPassword: forgotNewPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed.");
      }

      setSuccess("Password updated! Please log in with your new password.");
      setTimeout(() => {
        setMode("login");
        setLoginIdentifier(forgotIdentifier);
        setLoginPassword("");
        setSuccess("Password reset successful. Please log in.");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-24 pt-[104px] md:pt-[124px]">
        <div className="grid-bg absolute inset-x-0 top-0 h-[520px]" />
        <div className="glow-orb absolute -left-40 top-20 h-[420px] w-[420px] bg-[#2ee6c012]" />
        <div className="glow-orb absolute -right-40 top-60 h-[420px] w-[420px] bg-[#58b7f80f]" />

        <div className="relative mx-auto max-w-lg px-5">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <Logo size={48} />
            </div>
            <h1 className="h-display text-[clamp(1.8rem,4vw,2.5rem)] text-fg font-bold tracking-tight">
              Aarogya <span className="text-mint">Care AI</span>
            </h1>
            <p className="mt-2 text-[14px] text-dim max-w-sm mx-auto">
              Your patient health portal. Access prescriptions, daily pill routines, and multi-agent AI guidance.
            </p>
          </div>

          {/* Card Container */}
          <div className="glass relative overflow-hidden rounded-[24px] p-6 sm:p-8 border border-mint/20 shadow-2xl">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl border border-line bg-panel2/60 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
                  mode === "login"
                    ? "bg-mint text-ink shadow-sm"
                    : "text-dim hover:text-fg"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
                  mode === "signup"
                    ? "bg-mint text-ink shadow-sm"
                    : "text-dim hover:text-fg"
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
                  mode === "forgot"
                    ? "bg-mint text-ink shadow-sm"
                    : "text-dim hover:text-fg"
                }`}
              >
                Forgot?
              </button>
            </div>

            {/* Status alerts */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose/30 bg-rose/10 p-3.5 text-[13px] text-rose"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-mint/30 bg-mint/10 p-3.5 text-[13px] text-mintsoft"
              >
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-mint" />
                <span>{success}</span>
              </motion.div>
            )}

            {/* TAB 1: LOG IN */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[12.5px] font-medium text-dim mb-1.5">
                    Email Address or Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <Mail size={16} />
                    </span>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. ramesh@aarogyacare.ai or 9876543210"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2.5 text-[14px] text-fg placeholder:text-faint focus:border-mint focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12.5px] font-medium text-dim">Password</label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[11.5px] text-mint hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2.5 text-[14px] text-fg placeholder:text-faint focus:border-mint focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles size={16} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Sign In to Dashboard <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Quick Demo Fill button */}
                <div className="pt-2 border-t border-line/60">
                  <button
                    type="button"
                    onClick={fillDemoAccount}
                    className="w-full rounded-xl border border-mint/30 bg-mint/5 py-2 text-[12px] font-mono2 uppercase tracking-wider text-mintsoft hover:bg-mint/15 transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles size={13} className="text-mint" /> 1-Click Demo Patient Login
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SIGN UP */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-dim mb-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2 text-[13.5px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-dim mb-1">Age</label>
                    <input
                      type="number"
                      value={signupAge}
                      onChange={(e) => setSignupAge(e.target.value)}
                      placeholder="e.g. 54"
                      min="1"
                      max="120"
                      className="w-full rounded-xl border border-line bg-panel2/80 px-3.5 py-2 text-[13.5px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-dim mb-1">Gender</label>
                    <select
                      value={signupGender}
                      onChange={(e) => setSignupGender(e.target.value)}
                      className="w-full rounded-xl border border-line bg-panel2/80 px-3 py-2 text-[13.5px] text-fg focus:border-mint focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-dim mb-1">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2 text-[13.5px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-dim mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <Phone size={15} />
                    </span>
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2 text-[13.5px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-dim mb-1">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <Lock size={15} />
                    </span>
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2 text-[13.5px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles size={16} className="animate-spin" /> Creating Patient Profile...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} /> Register as Patient
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 3: FORGOT PASSWORD */}
            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="m-0 text-[13px] text-dim leading-relaxed">
                  Enter your registered email or phone number to set a new password.
                </p>

                <div>
                  <label className="block text-[12.5px] font-medium text-dim mb-1.5">
                    Registered Email or Phone
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <Mail size={16} />
                    </span>
                    <input
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. ramesh@aarogyacare.ai"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2.5 text-[14px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-medium text-dim mb-1.5">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <KeyRound size={16} />
                    </span>
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2.5 text-[14px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-medium text-dim mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-faint">
                      <KeyRound size={16} />
                    </span>
                    <input
                      type="password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-xl border border-line bg-panel2/80 pl-10 pr-4 py-2.5 text-[14px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles size={16} className="animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      Reset Password <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-[12.5px] text-dim hover:text-mint"
                  >
                    Back to Log In
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Privacy footnote */}
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-faint text-[12px]">
            <ShieldCheck size={14} className="text-mint" />
            <span>Encrypted Health Portal · HIPAA &amp; Privacy Aligned</span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
