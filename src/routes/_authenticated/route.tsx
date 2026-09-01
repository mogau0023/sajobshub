import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser, isUserAdmin } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    const isAdmin = await isUserAdmin(user.uid);
    if (!isAdmin) throw redirect({ to: "/auth" });
    return { user, isAdmin };
  },
  component: () => <Outlet />,
});
