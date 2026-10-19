'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, LogIn, MessageSquareText, Phone, ShieldCheck, Sparkles, Truck, UserPlus, Receipt } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { api, type PortalCustomer } from "./types";

type Mode = "login" | "register" | "activate";

const MODES: { id: Mode; label: string; icon: typeof LogIn }[] = [
  { id: "login", label: "Sign in", icon: LogIn },
  { id: "register", label: "Create account", icon: UserPlus },
  { id: "activate", label: "Activate", icon: KeyRound },
];

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

type Area = { name: string; pincode: string };

export default function AuthPanel({ areas, otpEnabled, onSignedIn }: { areas: Area[]; otpEnabled: boolean; onSignedIn: (c: PortalCustomer) => void }) {
  const [method, setMethod] = useState<"otp" | "pin">(otpEnabled ? "otp" : "pin");

  return (
    <AuthLayout>
      {method === "otp" ? (
        <OtpForm areas={areas} onSignedIn={onSignedIn} onUsePin={() => setMethod("pin")} />
      ) : (
        <PinForm areas={areas} onSignedIn={onSignedIn} onUseOtp={otpEnabled ? () => setMethod("otp") : undefined} />
      )}
    </AuthLayout>
  );
}

function PinForm({ areas, onSignedIn, onUseOtp }: { areas: Area[]; onSignedIn: (c: PortalCustomer) => void; onUseOtp?: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", area: "", pin: "", orderNumber: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { customer } = await api<{ customer: PortalCustomer }>("/api/portal/auth", {
        method: "POST",
        body: JSON.stringify({ action: mode, ...form }),
      });
      onSignedIn(customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="font-display text-3xl tracking-tight">
        {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Activate portal access"}
      </h1>
      <p className="text-sm text-muted-foreground mt-1.5">
        {mode === "login" && "Sign in with your phone number and PIN."}
        {mode === "register" && "New to AquaClean? It takes less than a minute."}
        {mode === "activate" && "Already a store customer? Verify with any of your order numbers and choose a PIN."}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setMode(id); setError(""); }}
            className={`h-9 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <Field label="Full name">
            <input required value={form.name} onChange={set("name")} className={inputClass} placeholder="Your name" autoComplete="name" />
          </Field>
        )}
        <Field label="Phone number">
          <div className="relative">
            <Phone className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input required value={form.phone} onChange={set("phone")} className={`${inputClass} pl-10`} placeholder="10-digit mobile number" autoComplete="tel" inputMode="tel" />
          </div>
        </Field>
        {mode === "activate" && (
          <Field label="Order number" hint="Printed on your receipt, e.g. LND-1001">
            <input required value={form.orderNumber} onChange={set("orderNumber")} className={`${inputClass} uppercase`} placeholder="LND-0000" />
          </Field>
        )}
        {mode === "register" && (
          <>
            <Field label="Email" optional>
              <input type="email" value={form.email} onChange={set("email")} className={inputClass} placeholder="you@example.com" autoComplete="email" />
            </Field>
            <Field label="Locality" optional>
              <select value={form.area} onChange={set("area")} className={inputClass}>
                <option value="">Select your area in Hyderabad</option>
                {areas.map((a) => <option key={a.name} value={a.name}>{a.name} ({a.pincode})</option>)}
              </select>
            </Field>
            <Field label="Pickup address" optional>
              <textarea rows={2} value={form.address} onChange={set("address")} className={`${inputClass} h-auto py-2.5`} placeholder="House, street, area" autoComplete="street-address" />
            </Field>
          </>
        )}
        <Field label={mode === "login" ? "PIN" : "Choose a PIN"} hint={mode === "login" ? undefined : "4 to 6 digits"}>
          <input
            required
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            value={form.pin}
            onChange={set("pin")}
            className={`${inputClass} tracking-[0.4em]`}
            placeholder="••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </Field>

        {error && (
          <div role="alert" className="text-sm text-rose-600 dark:text-rose-400 bg-rose-500/5 border border-rose-500/15 rounded-xl px-3.5 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Activate and sign in"}
        </button>
      </form>
      {onUseOtp && (
        <button type="button" onClick={onUseOtp} className="mt-4 w-full text-sm text-blue-600 dark:text-blue-400 font-medium inline-flex items-center justify-center gap-2 cursor-pointer">
          <MessageSquareText className="h-4 w-4" /> Sign in with an SMS code instead
        </button>
      )}
    </>
  );
}

type OtpStep = "phone" | "code" | "profile";

function OtpForm({ areas, onSignedIn, onUsePin }: { areas: Area[]; onSignedIn: (c: PortalCustomer) => void; onUsePin: () => void }) {
  const [step, setStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState({ name: "", email: "", address: "", area: "" });
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resendAt <= now) return;
    const t = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(t);
  }, [resendAt, now]);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const setField = (key: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setProfile({ ...profile, [key]: e.target.value });

  const run = async (fn: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const res = await api<{ resendIn: number; devCode?: string }>("/api/portal/otp", {
        method: "POST",
        body: JSON.stringify({ action: "send", phone }),
      });
      setDevCode(res.devCode ?? null);
      setResendAt(Date.now() + res.resendIn * 1000);
      setNow(Date.now());
      setCode("");
      setStep("code");
    });

  const verify = (withProfile: boolean) =>
    run(async () => {
      const res = await api<{ customer?: PortalCustomer; needsProfile?: boolean }>("/api/portal/otp", {
        method: "POST",
        body: JSON.stringify({ action: "verify", phone, code, ...(withProfile ? profile : {}) }),
      });
      if (res.customer) onSignedIn(res.customer);
      else if (res.needsProfile) setStep("profile");
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "phone") sendCode();
    else verify(step === "profile");
  };

  return (
    <>
      <h1 className="font-display text-3xl tracking-tight">{step === "profile" ? "Create your account" : "Sign in or sign up"}</h1>
      <p className="text-sm text-muted-foreground mt-1.5">
        {step === "phone" && "We will text a 6-digit code to your mobile number. New here? The same code creates your account."}
        {step === "code" && <>Enter the code sent to <span className="font-semibold text-foreground">+91 {phone.replace(/\D/g, "").slice(-10)}</span>.</>}
        {step === "profile" && "Your number is verified. Tell us where to pick up from."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {step === "phone" && (
          <Field label="Mobile number">
            <div className="relative">
              <Phone className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input required autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} pl-10`} placeholder="10-digit mobile number" autoComplete="tel" inputMode="tel" />
            </div>
          </Field>
        )}

        {step === "code" && (
          <div className="space-y-3">
            <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus inputMode="numeric" pattern="^\d*$" autoComplete="one-time-code" containerClassName="justify-center" aria-label="6-digit code">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />)}
              </InputOTPGroup>
            </InputOTP>
            {devCode && (
              <p className="text-xs text-center text-amber-700 dark:text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                Development mode: no SMS is sent. Your code is <span className="font-mono font-semibold">{devCode}</span>
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="text-muted-foreground hover:text-foreground cursor-pointer">
                Change number
              </button>
              <button type="button" disabled={resendIn > 0 || busy} onClick={sendCode} className="font-medium text-blue-600 dark:text-blue-400 disabled:text-muted-foreground disabled:cursor-not-allowed cursor-pointer">
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <>
            <Field label="Full name">
              <input required autoFocus value={profile.name} onChange={setField("name")} className={inputClass} placeholder="Your name" autoComplete="name" />
            </Field>
            <Field label="Email" optional>
              <input type="email" value={profile.email} onChange={setField("email")} className={inputClass} placeholder="you@example.com" autoComplete="email" />
            </Field>
            <Field label="Locality" optional>
              <select value={profile.area} onChange={setField("area")} className={inputClass}>
                <option value="">Select your area in Hyderabad</option>
                {areas.map((a) => <option key={a.name} value={a.name}>{a.name} ({a.pincode})</option>)}
              </select>
            </Field>
            <Field label="Pickup address" optional>
              <textarea rows={2} value={profile.address} onChange={setField("address")} className={`${inputClass} h-auto py-2.5`} placeholder="House, street, area" autoComplete="street-address" />
            </Field>
          </>
        )}

        {error && (
          <div role="alert" className="text-sm text-rose-600 dark:text-rose-400 bg-rose-500/5 border border-rose-500/15 rounded-xl px-3.5 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || (step === "code" && code.length < 6)}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {step === "phone" ? "Send code" : step === "code" ? "Verify and continue" : "Create account"}
        </button>
      </form>

      <button type="button" onClick={onUsePin} className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-2 cursor-pointer">
        <KeyRound className="h-4 w-4" /> Use PIN instead
      </button>
    </>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 p-12 text-white">
        <div className="absolute inset-0 bg-grain opacity-80" />
              <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-brass-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">AquaClean</span>
        </div>
        <div className="relative space-y-8 max-w-md">
          <h2 className="font-display text-5xl leading-[1.05] tracking-tight">Fresh laundry, without leaving home.</h2>
          <ul className="space-y-4 text-blue-50">
            {[
              { icon: Truck, text: "Schedule doorstep pickup in under a minute" },
              { icon: Receipt, text: "Transparent pricing with a flat platform fee" },
              { icon: ShieldCheck, text: "Track every step from washing to delivery" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-blue-100">Trusted by families and professionals across the city.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <BrandLogo subtitle="Customer Portal" />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">
        {label} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
