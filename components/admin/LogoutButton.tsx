"use client";

import { useFormStatus } from "react-dom";
import { logout } from "@/app/(admin)/login/actions";

function ButtonInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={logout}>
      <ButtonInner />
    </form>
  );
}
