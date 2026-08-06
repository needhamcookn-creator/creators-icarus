"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Instagram,
  BarChart3,
  Grid3X3,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { InstagramLoginModal } from "./components/InstagramLoginModal";
import { track } from "./lib/tracking";

const WHITE = "#ffffff";
const BLACK = "#121212";
const CREAM = "#f3f1ec";
const MUTED = "#555555";
const BORDER = "rgba(18,18,18,0.15)";
const ACCENT = "#af9164";

const features = [
  {
    icon: Instagram,
    title: "Instagram Login",
    description: "Connect your creator account in one tap. No passwords. No friction.",
  },
  {
    icon: BarChart3,
    title: "Track Performance",
    description: "Monitor clicks, conversions, and commission in real time.",
  },
  {
    icon: Grid3X3,
    title: "Post Analytics",
    description: "See which content drives sales. Tag campaigns and measure impact.",
  },
  {
    icon: MessageCircle,
    title: "Auto DMs",
    description: "Automate welcome flows, discount codes, and replies.",
  },
];

const perks = [
  "15% commission on every sale",
  "30-day attribution window",
  "Free products for top performers",
  "Early access to new drops",
];

const products = [
  { src: "/products/product-1.jpg", name: "Ascent Hoodie", href: "https://icaruswick.com/collections/all-products" },
  { src: "/products/product-2.jpg", name: "Rhinestone Pant", href: "https://icaruswick.com/collections/all-products" },
  { src: "/products/product-3.jpg", name: "Red Sweatshirt", href: "https://icaruswick.com/collections/all-products" },
  { src: "/products/product-4.png", name: "Statement Set", href: "https://icaruswick.com/collections/all-products" },
];

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    track("page_view");
  }, []);

  const openLogin = () => {
    track("connect_instagram_click", { location: "header_login" });
    setLoginOpen(true);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: WHITE, color: BLACK }}>
      <InstagramLoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      {/* Announcement bar */}
      <div
        className="border-b py-2.5 text-center"
        style={{ backgroundColor: BLACK, borderColor: BORDER }}
      >
        <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-white">
          Now onboarding creators — apply with Instagram
        </p>
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.95)", borderColor: BORDER }}
      >
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 lg:px-10">
          <a href="/" className="flex items-center">
            <Image
              src="/icarus-logo.gif"
              alt="ICARUS"
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              unoptimized
            />
          </a>

          <nav className="hidden items-center gap-8 font-sans text-[13px] uppercase tracking-[0.1em] md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-[#af9164]"
              onClick={() => track("nav_click", { label: "Features", href: "#features" })}
            >
              Features
            </a>
            <a
              href="#dashboard"
              className="transition-colors hover:text-[#af9164]"
              onClick={() => track("nav_click", { label: "Dashboard", href: "#dashboard" })}
            >
              Dashboard
            </a>
            <a
              href="#apply"
              className="transition-colors hover:text-[#af9164]"
              onClick={() => track("nav_click", { label: "Apply", href: "#apply" })}
            >
              Apply
            </a>
          </nav>

          <button
            onClick={openLogin}
            className="inline-flex h-11 items-center gap-2 border-2 px-6 font-sans text-[12px] uppercase tracking-[0.1em] text-white transition-all hover:bg-white hover:text-[#121212]"
            style={{ backgroundColor: BLACK, borderColor: BLACK }}
          >
            <Instagram className="h-4 w-4" />
            Login
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="relative aspect-[16/9] w-full overflow-hidden md:aspect-[21/9]">
            <Image
              src="/homepage.webp"
              alt="ICARUS creator campaign"
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mx-auto max-w-3xl px-6 text-center">
              <p className="mb-4 font-sans text-[11px] uppercase tracking-[0.25em] text-white/80">
                ICARUS Creator Program
              </p>
              <h1 className="text-4xl font-medium uppercase tracking-[0.04em] text-white md:text-6xl lg:text-7xl">
                Turn Content Into Currency
              </h1>
              <p className="mx-auto mt-5 max-w-lg font-sans text-sm leading-relaxed text-white/90 md:text-base">
                Join the ICARUS creator program. Log in with Instagram, track your analytics,
                manage posts, and automate DMs — all from one dashboard.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => {
                    track("connect_instagram_click", { location: "hero_apply" });
                    setLoginOpen(true);
                  }}
                  className="inline-flex h-12 items-center gap-2 border-2 border-white bg-white px-8 font-sans text-[12px] uppercase tracking-[0.12em] text-[#121212] transition-all hover:bg-transparent hover:text-white"
                >
                  <Instagram className="h-4 w-4" />
                  Apply with Instagram
                </button>
                <a
                  href="#dashboard"
                  className="inline-flex h-12 items-center gap-2 border-2 border-white bg-transparent px-8 font-sans text-[12px] uppercase tracking-[0.12em] text-white transition-all hover:bg-white hover:text-[#121212]"
                >
                  View Dashboard
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-b" style={{ backgroundColor: WHITE, borderColor: BORDER }}>
          <div
            className="mx-auto grid max-w-[1600px] grid-cols-2 divide-x md:grid-cols-4"
            style={{ borderColor: BORDER }}
          >
            {[
              { value: "1,240+", label: "Creators" },
              { value: "15%", label: "Commission" },
              { value: "$1,870", label: "Avg Monthly Payout" },
              { value: "30 Days", label: "Cookie Window" },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-8 text-center md:py-10">
                <p className="text-2xl font-medium tracking-[0.02em] md:text-3xl">{stat.value}</p>
                <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-16 lg:py-20" style={{ backgroundColor: CREAM }}>
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-10 text-center">
              <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                Built For Creators
              </p>
              <h2 className="text-3xl font-medium uppercase tracking-[0.04em] md:text-4xl">
                Everything You Need
              </h2>
            </div>

            <div
              className="grid gap-px border md:grid-cols-2 lg:grid-cols-4"
              style={{ backgroundColor: BORDER, borderColor: BORDER }}
            >
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group p-8 transition-colors hover:bg-[#f3f1ec]"
                  style={{ backgroundColor: WHITE }}
                >
                  <feature.icon className="mb-5 h-6 w-6" strokeWidth={1.5} />
                  <h3 className="mb-2 text-lg font-medium uppercase tracking-[0.04em]">
                    {feature.title}
                  </h3>
                  <p className="font-sans text-sm leading-relaxed" style={{ color: MUTED }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard preview */}
        <section id="dashboard" className="px-6 py-16 lg:py-20" style={{ backgroundColor: WHITE }}>
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                  Your Dashboard
                </p>
                <h2 className="text-3xl font-medium uppercase tracking-[0.04em] md:text-4xl">
                  Data That Drives Income
                </h2>
              </div>
              <p className="max-w-md font-sans text-sm leading-relaxed" style={{ color: MUTED }}>
                A focused view of clicks, conversions, content performance, and payouts.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="border p-6 lg:col-span-2" style={{ backgroundColor: CREAM, borderColor: BORDER }}>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <p className="font-sans text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
                      Total Earnings
                    </p>
                    <p className="mt-1 text-4xl font-medium tracking-[0.02em]">$4,287.50</p>
                  </div>
                  <span
                    className="border px-3 py-1 font-sans text-[10px] uppercase tracking-wider text-emerald-800"
                    style={{ backgroundColor: "rgba(4,120,87,0.05)", borderColor: "rgba(4,120,87,0.2)" }}
                  >
                    +24% This Month
                  </span>
                </div>
                <div className="flex h-44 items-end justify-between gap-1">
                  {[35, 48, 42, 60, 55, 72, 68, 84, 78, 92, 88, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 transition-all hover:bg-[#af9164]"
                      style={{ backgroundColor: BLACK, height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex justify-between font-sans text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                  <span>Jan</span>
                  <span>Dec</span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {[
                  { label: "Clicks This Week", value: "12,403", width: "75%" },
                  { label: "Conversion Rate", value: "3.8%", width: "38%" },
                  { label: "Active Campaigns", value: "4", width: null },
                ].map((card) => (
                  <div key={card.label} className="border p-6" style={{ backgroundColor: CREAM, borderColor: BORDER }}>
                    <p className="font-sans text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
                      {card.label}
                    </p>
                    <p className="mt-1 text-3xl font-medium tracking-[0.02em]">{card.value}</p>
                    {card.width && (
                      <div className="mt-4 h-1 w-full" style={{ backgroundColor: BORDER }}>
                        <div className="h-full" style={{ backgroundColor: card.label.includes("Conversion") ? ACCENT : BLACK, width: card.width }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Product showcase */}
        <section
          className="border-y px-6 py-16 lg:py-20"
          style={{ backgroundColor: WHITE, borderColor: BORDER }}
        >
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-10 text-center">
              <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                Featured Drops
              </p>
              <h2 className="text-3xl font-medium uppercase tracking-[0.04em] md:text-4xl">
                Create. Post. Earn.
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {products.map((product) => (
                <a
                  key={product.name}
                  href={product.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <div
                    className="relative aspect-[3/4] overflow-hidden border"
                    style={{ backgroundColor: CREAM, borderColor: BORDER }}
                  >
                    <Image
                      src={product.src}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 text-center text-sm font-medium uppercase tracking-[0.04em] underline-offset-4 group-hover:underline">
                    {product.name}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className="px-6 py-16 text-white lg:py-20" style={{ backgroundColor: BLACK }}>
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.2em] text-white/60">
                Join The Program
              </p>
              <h2 className="text-3xl font-medium uppercase tracking-[0.04em] md:text-5xl">
                Ready To Fly?
              </h2>
              <p className="mt-5 font-sans text-sm leading-relaxed text-white/70">
                Apply with your Instagram account. Once approved, get instant access to your
                creator dashboard, unique affiliate link, and campaign tools.
              </p>
              <ul className="mt-8 space-y-3">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-3 font-sans text-sm text-white/90">
                    <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border p-8 lg:p-10" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.2)" }}>
              <button
                onClick={() => {
                  track("connect_instagram_click", { location: "cta_continue" });
                  setLoginOpen(true);
                }}
                className="inline-flex h-14 w-full items-center justify-center gap-3 bg-[#E1306C] px-8 font-sans text-[12px] uppercase tracking-[0.12em] text-white transition-all hover:bg-[#c91c5a]"
              >
                <Instagram className="h-5 w-5" />
                Continue with Instagram
              </button>
              <p className="mt-5 text-center font-sans text-[10px] uppercase tracking-wider text-white/50">
                By applying, you agree to the ICARUS Creator Terms and Privacy Policy.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-12" style={{ backgroundColor: WHITE, borderColor: BORDER }}>
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-6 md:flex-row">
          <Image
            src="/icarus-logo.gif"
            alt="ICARUS"
            width={100}
            height={40}
            className="h-7 w-auto object-contain"
            unoptimized
          />
          <p className="font-sans text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            © {new Date().getFullYear()} ICARUS. All rights reserved.
          </p>
          <div className="flex gap-8 font-sans text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            <a href="#" className="transition-colors hover:text-[#121212]">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-[#121212]">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-[#121212]">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
