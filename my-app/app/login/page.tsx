import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      {/* Left — Brand panel */}
      <div className="login-brand-panel relative md:w-[45%] overflow-hidden flex-shrink-0">
        {/* Deep teal gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.32_0.08_175)] via-[oklch(0.23_0.06_180)] to-[oklch(0.17_0.04_190)]" />

        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px",
          }}
        />

        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,oklch(0.4_0.1_175/0.15),transparent_60%)]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-6 md:p-10 lg:p-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] backdrop-blur-sm flex items-center justify-center border border-white/[0.08]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/90"
              >
                <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
                <path d="M12 22V12" />
                <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
              </svg>
            </div>
            <span className="font-display text-lg font-semibold text-white/90 tracking-tight">
              Shahjalal
            </span>
          </div>

          {/* Tagline — desktop only */}
          <div className="hidden md:block max-w-xs lg:max-w-sm">
            <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] text-white leading-[1.15] tracking-tight mb-4">
              Manage your inventory with clarity
            </h1>
            <p className="text-white/50 text-[0.95rem] leading-relaxed">
              Track stock, manage orders, and keep your wholesale operations
              running smoothly.
            </p>
          </div>

          <div className="hidden md:block" />
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-20 bg-white">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
