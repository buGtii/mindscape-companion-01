import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function usePremium() {
  const { user, roles } = useAuth();
  const elevated = roles.includes("admin") || roles.includes("psychologist") || roles.includes("researcher");
  const { data } = useQuery({
    queryKey: ["sub", user?.id],
    enabled: !!user && !elevated,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });
  const active = elevated || (data?.tier === "premium" && data?.status === "active" &&
    (!data?.current_period_end || new Date(data.current_period_end) > new Date()));
  return { isPremium: !!active, subscription: data, elevated };
}
