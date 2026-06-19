"use client";

/**
 * (dashboard) group layout — client-side guard (defence-in-depth behind middleware)
 * + global navigation sidebar.
 *
 * CRITICAL invariants:
 *  1. Zustand hydration guard: waits for hasHydrated() before redirecting.
 *     Without it, authenticated users are bounced to /login on every hard reload.
 *  2. ReactQueryProvider wraps children — all server-data hooks depend on it.
 *  3. Sidebar is NOT rendered until hydration completes (avoids flash).
 *  4. /presentacion uses fixed inset-0 z-50 — it covers the sidebar chrome;
 *     no special case needed here.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { ReactQueryProvider } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token } = useAuthStore();

  // Zustand-persist rehydrates from localStorage on the client. On a hard page
  // load the first render has token=null until rehydration finishes, so we MUST
  // wait for hydration before deciding to redirect — otherwise an authenticated
  // user gets bounced to /login on every full reload.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Client-side guard (defence-in-depth behind the middleware), post-hydration.
  useEffect(() => {
    if (hydrated && !token) {
      router.push("/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-on-surface text-sm">Cargando…</p>
      </div>
    );
  }

  if (!token) {
    return null; // Render nothing while redirect fires.
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Fixed 260px sidebar — occupies left column */}
      <Sidebar />

      {/* Main area — offset by sidebar width */}
      <div className="pl-sidebar min-h-screen flex flex-col">
        <main className="flex-1 p-6 max-w-screen-2xl">
          {/* ReactQueryProvider (client subtree safe) */}
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </main>
      </div>
    </div>
  );
}
