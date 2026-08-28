import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./landing.css";

export function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`landing-root ${GeistSans.variable} ${GeistMono.variable}`}
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
