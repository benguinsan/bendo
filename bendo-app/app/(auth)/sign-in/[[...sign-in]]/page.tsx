import type { Metadata } from "next";

import { DesktopAwareSignIn } from "@/components/auth/desktop-aware-clerk";
import { PostSignInBridge } from "@/components/auth/post-sign-in-bridge";

export const metadata: Metadata = {
  title: "Sign in · bendo",
};

export default function SignInPage() {
  return (
    <PostSignInBridge>
      <DesktopAwareSignIn />
    </PostSignInBridge>
  );
}
