import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

import { PostSignInBridge } from "@/components/auth/post-sign-in-bridge";

export const metadata: Metadata = {
  title: "Sign up · bendo",
};

export default function SignUpPage() {
  return (
    <PostSignInBridge>
      <SignUp />
    </PostSignInBridge>
  );
}
