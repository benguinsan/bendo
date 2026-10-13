import type { Metadata } from "next";

import { DesktopAwareSignUp } from "@/components/auth/desktop-aware-clerk";
import { PostSignInBridge } from "@/components/auth/post-sign-in-bridge";

export const metadata: Metadata = {
  title: "Sign up · bendo",
};

export default function SignUpPage() {
  return (
    <PostSignInBridge>
      <DesktopAwareSignUp />
    </PostSignInBridge>
  );
}
