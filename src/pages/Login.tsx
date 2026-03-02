import { useEffect } from "react";
import { useAuth } from "@workos-inc/authkit-react";
import { useConvexAuth } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";

export default function Login() {
  const { signIn } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnTo, { replace: true });
      return;
    }
    if (!isLoading && !isAuthenticated) {
      signIn({ state: { returnTo } });
    }
  }, [isAuthenticated, isLoading, signIn, navigate, returnTo]);

  return (
    <div className="login">
      <p className="loading">Redirecting to sign in...</p>
    </div>
  );
}
