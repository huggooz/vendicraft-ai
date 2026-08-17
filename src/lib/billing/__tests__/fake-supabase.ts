// Minimal in-memory fake of the tiny slice of the supabase-js query builder
// that kirvano-webhook.server.ts actually calls (.from().select().eq()...eq().maybeSingle(),
// .from().insert().select().single(), .from().update().eq()). Not a general
// PostgREST mock -- just enough to exercise the webhook handler's logic and
// its billing_events idempotency_key uniqueness without a real database
// (none was available in this environment -- see the Fase 3.4 report).

type Row = Record<string, unknown>;

export type FakeTable = "profiles" | "subscriptions" | "billing_events";

export function createFakeSupabase(seed: { profiles?: Row[]; subscriptions?: Row[] } = {}) {
  const state: Record<FakeTable, Row[]> = {
    profiles: seed.profiles ? [...seed.profiles] : [],
    subscriptions: seed.subscriptions ? [...seed.subscriptions] : [],
    billing_events: [],
  };
  let idCounter = 1;
  const nextId = () => `fake-id-${idCounter++}`;

  function selectBuilder(table: FakeTable) {
    const filters: Array<[string, unknown]> = [];
    const builder = {
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      async maybeSingle() {
        const row = state[table].find((r) => filters.every(([c, v]) => r[c] === v));
        return { data: row ?? null, error: null };
      },
    };
    return builder;
  }

  function insertBuilder(table: FakeTable, row: Row) {
    return {
      select() {
        return {
          async single() {
            if (table === "billing_events" && row["idempotency_key"]) {
              const duplicate = state.billing_events.some(
                (r) => r["idempotency_key"] === row["idempotency_key"],
              );
              if (duplicate) {
                return {
                  data: null,
                  error: {
                    code: "23505",
                    message: "duplicate key value violates unique constraint",
                  },
                };
              }
            }
            const id = nextId();
            state[table].push({ id, ...row });
            return { data: { id }, error: null };
          },
        };
      },
    };
  }

  function updateBuilder(table: FakeTable, patch: Row) {
    const filters: Array<[string, unknown]> = [];
    return {
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        const idx = state[table].findIndex((r) => filters.every(([c, v]) => r[c] === v));
        if (idx !== -1) state[table][idx] = { ...state[table][idx], ...patch };
        return Promise.resolve({ error: idx === -1 ? { message: "not found" } : null });
      },
    };
  }

  return {
    state,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from(table: FakeTable): any {
      return {
        select: () => selectBuilder(table),
        insert: (row: Row) => insertBuilder(table, row),
        update: (patch: Row) => updateBuilder(table, patch),
      };
    },
  };
}
