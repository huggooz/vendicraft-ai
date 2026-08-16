import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];
export type TableName = "products" | "leads" | "follow_ups" | "saved_messages" | "offers" | "conversations";
export type Row<T extends TableName> = PublicTables[T]["Row"];

export function useRows<T extends TableName>(table: T, orderBy = "created_at") {
  return useQuery({
    queryKey: [table],
    queryFn: async (): Promise<Row<T>[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", auth.user.id)
        .order(orderBy, { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row<T>[];
    },
  });
}

export function useCreateRow<T extends TableName>(table: T) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const { data, error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...values, user_id: auth.user.id } as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as Row<T>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useUpdateRow<T extends TableName>(table: T) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from(table).update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDeleteRow<T extends TableName>(table: T) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}
