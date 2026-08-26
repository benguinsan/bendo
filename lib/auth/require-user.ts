import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireUser() {
  await auth.protect();
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
