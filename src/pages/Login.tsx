import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate, useSearchParams } from "react-router";

export default function Login() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", flow);
      await signIn("password", formData);
      navigate(returnTo);
    } catch (err: any) {
      setError(
        flow === "signUp"
          ? "Could not create account. Email may already be in use."
          : "Invalid email or password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signIn("google", { redirectTo: returnTo });
    } catch {
      setError("Google sign-in failed.");
    }
  }

  return (
    <div className="login">
      <h1 className="login__title">
        {flow === "signIn" ? "Sign In" : "Create Account"}
      </h1>

      <form className="login__form" onSubmit={handlePasswordAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <p className="login__error">{error}</p>}

        <button type="submit" className="login__btn" disabled={submitting}>
          {submitting
            ? "Loading..."
            : flow === "signIn"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <div className="login__divider">
        <span>or</span>
      </div>

      <button className="login__btn login__btn--google" onClick={handleGoogle}>
        Continue with Google
      </button>

      <button
        className="login__toggle"
        onClick={() => {
          setFlow(flow === "signIn" ? "signUp" : "signIn");
          setError("");
        }}
      >
        {flow === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
