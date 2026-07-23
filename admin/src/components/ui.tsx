import { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "shine-hover press-btn bg-gradient-to-b from-brand-400 via-brand-600 to-brand-800 text-white border border-sky-300/20 shadow-[0_0_24px_-14px_rgba(59,130,246,0.9)] disabled:opacity-50",
    secondary:
      "bg-slate-800/80 text-slate-100 border border-slate-600/60 hover:bg-slate-700/80 disabled:opacity-50",
    ghost: "bg-transparent text-slate-200 hover:bg-white/5 disabled:opacity-50",
    danger: "bg-gradient-to-b from-red-500 to-red-700 text-white disabled:opacity-50",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium text-[var(--premium-label)]">{label}</span>
      ) : null}
      <input
        className={`w-full rounded-xl border border-[var(--premium-border)] bg-[var(--premium-field-bg)] px-3.5 py-2.5 text-sm text-[var(--premium-field-text)] placeholder:text-[var(--premium-field-placeholder)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium text-[var(--premium-label)]">{label}</span>
      ) : null}
      <select
        className={`w-full rounded-xl border border-[var(--premium-border)] bg-[var(--premium-field-bg)] px-3.5 py-2.5 text-sm text-[var(--premium-field-text)] outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`premium-card premium-card-glow rounded-3xl ${className}`}>{children}</div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    neutral: "bg-slate-700/80 text-slate-200",
    success: "bg-emerald-500/20 text-emerald-300 border border-emerald-400/20",
    warning: "bg-amber-500/20 text-amber-200 border border-amber-400/20",
    danger: "bg-red-500/20 text-red-300 border border-red-400/20",
    info: "bg-sky-500/20 text-sky-200 border border-sky-400/20",
  }[tone];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-700/50 ${className}`} />;
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-600/70 bg-slate-900/40 px-6 py-12 text-center">
      <p className="font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="premium-card premium-card-glow relative z-10 w-full max-w-lg animate-fade-in-up rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-50">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-slate-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
