import { logout } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-muted hover:text-ink"
      >
        Sair
      </button>
    </form>
  );
}
