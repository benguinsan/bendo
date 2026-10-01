import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

import { PostSignInBridge } from "@/components/auth/post-sign-in-bridge";

export const metadata: Metadata = {
  title: "Sign in · bendo",
};

export default function SignInPage() {
  return (
    <PostSignInBridge>
      <SignIn />
    </PostSignInBridge>
  );
}
