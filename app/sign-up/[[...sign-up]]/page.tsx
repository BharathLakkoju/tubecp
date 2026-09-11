import { redirect } from "next/navigation";

/** OAuth sign-up uses the same flow as sign-in — first provider login creates the account. */
export default function SignUpPage() {
  redirect("/sign-in");
}
