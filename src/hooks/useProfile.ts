import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];

// Billing fields are controlled exclusively server-side (service_role) --
// see the RLS/column-grant migration. The DB is the real enforcement
// boundary; this type just stops the client from ever attempting it.
type EditableProfileFields = Omit<
  Profile,
  | "id"
  | "email"
  | "plan"
  | "subscription_status"
  | "subscription_id"
  | "subscription_expires_at"
  | "created_at"
  | "updated_at"
>;

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: async (): Promise<Business | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<EditableProfileFields>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("profiles").update(values).eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUpsertBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Business>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("businesses").update(values).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("businesses")
          .insert({ ...values, user_id: auth.user.id, name: values.name ?? "" });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business"] }),
  });
}
