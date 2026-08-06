"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, Mail, Instagram } from "lucide-react";

const WHITE = "#ffffff";
const BLACK = "#121212";
const CREAM = "#f3f1ec";
const MUTED = "#555555";
const BORDER = "rgba(18,18,18,0.15)";
const ACCENT = "#af9164";

export default function WaitlistPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: CREAM, color: BLACK }}>
      {/* Header */}
      <header
        className="border-b"
        style={{ backgroundColor: WHITE, borderColor: BORDER }}
      >
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center">
            <Image
              src="/icarus-logo.gif"
              alt="ICARUS"
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              unoptimized
            />
          </Link>
          <Link
            href="/"
            className="font-sans text-[12px] uppercase tracking-[0.1em] transition-colors hover:text-[#af9164]"
            style={{ color: MUTED }}
          >
            Back to home
          </Link>
        </div>
      </header>

      {/* Main confirmation */}
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto w-full max-w-[540px] text-center">
          <div
            className="border p-10 md:p-14"
            style={{ backgroundColor: WHITE, borderColor: BORDER }}
          >
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center border"
              style={{ borderColor: ACCENT }}
            >
              <CheckCircle2 className="h-10 w-10" style={{ color: ACCENT }} />
            </div>

            <p
              className="mb-3 mt-8 font-sans text-[11px] uppercase tracking-[0.2em]"
              style={{ color: MUTED }}
            >
              Application Received
            </p>
            <h1 className="text-3xl font-medium uppercase tracking-[0.04em] md:text-4xl">
              You&apos;re On The List
            </h1>
            <p
              className="mx-auto mt-5 max-w-md font-sans text-sm leading-relaxed"
              style={{ color: MUTED }}
            >
              Thank you for applying to the ICARUS creator program. Our team is
              reviewing your application and will reach out via Instagram direct
              message once a spot opens up.
            </p>

            <div
              className="mx-auto mt-8 grid max-w-sm gap-4 border-t pt-8 text-left"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-start gap-4">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: ACCENT }} />
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.04em]">
                    Review Time
                  </p>
                  <p className="mt-1 font-sans text-sm" style={{ color: MUTED }}>
                    Most applications are reviewed within 24–48 hours.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: ACCENT }} />
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.04em]">
                    Next Steps
                  </p>
                  <p className="mt-1 font-sans text-sm" style={{ color: MUTED }}>
                    Keep an eye on your Instagram DMs for your approval notice.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Instagram className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: ACCENT }} />
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.04em]">
                    In The Meantime
                  </p>
                  <p className="mt-1 font-sans text-sm" style={{ color: MUTED }}>
                    Follow @icaruswickk for new drops and creator content.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="https://www.instagram.com/icaruswickk/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex h-12 items-center gap-2 border-2 px-8 font-sans text-[12px] uppercase tracking-[0.12em] text-white transition-all hover:bg-white hover:text-[#121212]"
              style={{ backgroundColor: BLACK, borderColor: BLACK }}
            >
              <Instagram className="h-4 w-4" />
              Follow ICARUS
            </Link>
          </div>

          <p
            className="mt-8 font-sans text-[11px] uppercase tracking-[0.15em]"
            style={{ color: MUTED }}
          >
            © {new Date().getFullYear()} ICARUS. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
