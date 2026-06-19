import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Root route — no standalone landing. Bounce to the app when authenticated,
 * to the login otherwise. Auth presence is checked via the `auth_token` cookie
 * (same signal the middleware uses).
 */
export default function HomePage() {
  const token = cookies().get("auth_token");
  redirect(token ? "/dashboard" : "/login");
}
