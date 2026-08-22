import { Navigate, Link } from "react-router-dom";
import { getStoredUser } from "../api/auth";

const roleLabel = {
  parent: "a parent",
  instructor: "an instructor",
  admin: "an admin",
};

/**
 * role prop optional hai:
 * - agar diya to sirf wahi role access kar sakega
 * - agar nahi diya to sirf "logged in hona chahiye" check hoga
 */
function ProtectedRoute({ children, role }) {
  // NOTE: yeh sirf UI-level check hai — page dikhana hai ya login par bhejna.
  // Asal security backend par hai: har protected API call cookie ka token
  // verify karti hai, is liye localStorage chhed kar koi data nahi nikaal sakta.
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Pehle chup chaap "/" bhej deta tha — ab bata dete hain kyun
    // access nahi mila, taake user confuse na ho.
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F5F2] px-4 text-brand-brown">
        <div className="max-w-sm text-center">
          <h2 className="mb-2 text-lg font-bold">
            This page isn't for your account
          </h2>
          <p className="mb-5 text-sm opacity-70">
            You're logged in as {roleLabel[user.role] || user.role}. This page
            is only for {roleLabel[role] || role} accounts.
          </p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-bold text-white no-underline"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
