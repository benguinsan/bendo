import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";

export const requireUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) {redirect("/sign-in");}
  const user = await currentUser();
  if (!user) {redirect("/sign-in");}
  return user;
});
