"use client"

import { Authenticator } from "@aws-amplify/ui-react";
import OnboardingWrapper from "@/components/OnboardingWrapper";

export default function AuthenticatorWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator>
      <OnboardingWrapper>
        {children}
      </OnboardingWrapper>
    </Authenticator>
  );
}