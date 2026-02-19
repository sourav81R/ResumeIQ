"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageClientProps = {
  redirectPath: string;
};

function normalizeAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Login failed.";

  if (message.includes("auth/configuration-not-found")) {
    return "Google sign-in is not enabled in Firebase Authentication for this project.";
  }

  if (message.includes("auth/unauthorized-domain")) {
    return "Current domain is not authorized in Firebase Authentication. Add it in Firebase Console > Authentication > Settings > Authorized domains.";
  }

  if (message.includes("auth/popup-blocked")) {
    return "Popup was blocked by the browser. Allow popups and try again.";
  }

  if (message.includes("auth/popup-closed-by-user")) {
    return "Sign-in popup was closed before completing login.";
  }

  if (message.includes("auth/invalid-credential") || message.includes("auth/invalid-login-credentials")) {
    return "Invalid email or password.";
  }

  if (message.includes("auth/user-not-found")) {
    return "User not found. Click Register to create your account.";
  }

  if (message.includes("auth/wrong-password")) {
    return "Incorrect password.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "This email is already registered. Please login.";
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "Enable Email/Password provider in Firebase Authentication settings.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Too many attempts. Please wait a minute and try again.";
  }

  if (message.includes("auth/network-request-failed")) {
    return "Network error while contacting Firebase. Check internet and try again.";
  }

  if (message.includes("Missing Firebase admin credentials")) {
    return "Server session config is missing. Add Firebase Admin credentials for /api/auth/session.";
  }

  return message;
}

export default function LoginPageClient({ redirectPath }: LoginPageClientProps) {
  const router = useRouter();
  const { user, loading, sessionReady, signInWithGoogle, signInWithEmailPassword, registerWithEmailPassword } =
    useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const validateCredentials = () => {
    if (!email.trim()) {
      return "Please enter your email.";
    }
    if (!password.trim()) {
      return "Please enter your password.";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    return "";
  };

  useEffect(() => {
    if (!loading && sessionReady && user) {
      router.replace(redirectPath);
      router.refresh();
    }
  }, [loading, redirectPath, router, sessionReady, user]);

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-6">
      <Card className="w-full max-w-lg rounded-2xl border-slate-200 bg-white/95 shadow-xl">
        <CardHeader className="space-y-1 pb-1 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Welcome Back</p>
          <CardTitle className="text-4xl font-extrabold tracking-tight text-slate-900">Login</CardTitle>
          <CardDescription className="sr-only">Login to access your ResumeIQ dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6 sm:px-8">
          {loading ? <LoadingSpinner label="Checking authentication..." /> : null}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-lg font-medium text-slate-700 sm:text-xl">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl border-slate-300 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-lg font-medium text-slate-700 sm:text-xl">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-xl border-slate-300 pr-12 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((state) => !state)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-teal-600 text-lg font-semibold hover:bg-teal-700"
            disabled={busy || loading}
            onClick={async () => {
              const validationError = validateCredentials();
              if (validationError) {
                setError(validationError);
                return;
              }

              setBusy(true);
              setError("");

              try {
                await signInWithEmailPassword(email.trim(), password);
                router.replace(redirectPath);
                router.refresh();
              } catch (err) {
                setError(normalizeAuthError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Please wait..." : "Login"}
          </Button>

          <div className="flex items-center gap-4 py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            disabled={busy || loading}
            variant="outline"
            type="button"
            className="h-12 w-full rounded-xl border-slate-300 text-lg font-semibold text-slate-700 hover:bg-slate-50"
            onClick={async () => {
              setBusy(true);
              setError("");

              try {
                await signInWithGoogle();
                router.replace(redirectPath);
                router.refresh();
              } catch (err) {
                setError(normalizeAuthError(err));
                setBusy(false);
              } finally {
                // Redirect flow navigates away. Keep busy state on success.
              }
            }}
          >
            <svg viewBox="0 0 24 24" className="mr-3 h-5 w-5" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.8-1.6 2.8-4 2.8-6.9 0-.7-.1-1.5-.2-2.2H12z"
              />
              <path
                fill="#34A853"
                d="M12 21c2.5 0 4.7-.8 6.2-2.1l-3-2.3c-.8.6-1.9 1-3.2 1-2.5 0-4.7-1.7-5.4-4.1l-3.1 2.4C5 18.9 8.2 21 12 21z"
              />
              <path
                fill="#FBBC05"
                d="M6.6 13.5c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7L3.5 7.7C2.9 8.9 2.5 10.2 2.5 11.8s.4 2.9 1.1 4.1l3-2.4z"
              />
              <path
                fill="#4285F4"
                d="M12 6.2c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.7 3.2 14.5 2.3 12 2.3 8.2 2.3 5 4.4 3.5 7.7l3.1 2.4c.7-2.4 2.9-3.9 5.4-3.9z"
              />
            </svg>
            {busy ? "Signing in..." : "Continue with Google"}
          </Button>

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              disabled={busy || loading}
              className="font-semibold text-teal-700 hover:text-teal-800"
              onClick={async () => {
                const validationError = validateCredentials();
                if (validationError) {
                  setError(validationError);
                  return;
                }

                setBusy(true);
                setError("");

                try {
                  await registerWithEmailPassword(email.trim(), password);
                  router.replace(redirectPath);
                  router.refresh();
                } catch (err) {
                  setError(normalizeAuthError(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Register
            </button>
          </p>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
