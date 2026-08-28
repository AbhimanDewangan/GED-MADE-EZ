"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandName } from "@/components/landing/brand-name";

const navLinks = [
  { href: "#why", label: "Product" },
  { href: "#subjects", label: "Curriculum" },
  { href: "#compare", label: "Compare" },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled || mobileOpen ? "lp-nav-scrolled" : ""}`}>
      <div className="lp-container flex w-full items-center justify-between">
        <Link href="/" className="lp-brand">
          <BrandName />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="lp-nav-link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            href={user ? "/dashboard" : "/auth/signin"}
            className="lp-btn lp-btn-primary lp-btn-sm"
          >
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>

        <button
          className="p-2 text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute inset-x-0 top-16 border-b border-white/10 bg-black/95 md:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2.5 text-sm text-white/70"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href={user ? "/dashboard" : "/auth/signin"}
                onClick={() => setMobileOpen(false)}
                className="lp-btn lp-btn-primary mt-3 w-full"
              >
                {user ? "Dashboard" : "Sign in"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="lp-shot lp-hero" aria-labelledby="hero-brand">
      <div className="lp-shot-media">
        <Image
          src="/images/oman/landscape-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={90}
          className="object-cover object-[center_40%]"
        />
      </div>
      <div className="lp-shot-veil lp-shot-veil-hero" aria-hidden />

      <div className="lp-container w-full">
        <p className="lp-hero-eyebrow lp-fade">
          Oman Ministry of Education · Grades 9–12
        </p>

        <h1 id="hero-brand" className="lp-hero-brand lp-fade-d1">
          <BrandName />
        </h1>

        <p className="lp-hero-sub lp-fade-d2">
          Pass exams with your books.
        </p>

        <p className="lp-hero-lede lp-fade-d2">
          Textbook-grounded tutoring, exam readiness, and bilingual lessons —
          built for Basic Education through the General Education Diploma.
        </p>

        <div className="lp-hero-actions lp-fade-d3">
          <Link
            href={user ? "/dashboard" : "/auth/signin"}
            className="lp-btn lp-btn-primary"
          >
            {user ? "Continue learning" : "Start free"}
          </Link>
          <a href="#why" className="lp-btn lp-btn-secondary">
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
