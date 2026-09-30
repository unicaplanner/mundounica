import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <form
        action={login}
        className="w-full max-w-sm space-y-6 rounded-[14px] bg-card p-8 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
      >
        <div className="space-y-1 text-center">
          <p className="brand-mark text-sm text-accent-ink">Mundo da Unica</p>
          <p className="text-sm text-muted">Unica Planner</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoFocus
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink focus:border-accent-ink focus:outline-none"
          />
          <input
            type="password"
            name="password"
            placeholder="Senha"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink focus:border-accent-ink focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-accent-ink">Email ou senha incorretos.</p>}

        <button
          type="submit"
          className="w-full rounded-full bg-accent-ink px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
