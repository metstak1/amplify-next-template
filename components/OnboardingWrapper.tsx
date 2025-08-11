// components/OnboardingWrapper.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { checkUserOnboardingStatusAction } from "@/app/actions/onboarding";
import UserOnboarding from "./UserOnboarding";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export default function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user, authStatus } = useAuthenticator();
  const [onboardingStatus, setOnboardingStatus] = useState<{
    isLoading: boolean;
    needsOnboarding: boolean;
    error: string | null;
  }>({
    isLoading: true,
    needsOnboarding: false,
    error: null
  });
  const [justCompleted, setJustCompleted] = useState(false);
  const [completionAttempts, setCompletionAttempts] = useState(0);

  const checkOnboardingStatus = async (retryCount = 0, maxRetries = 3, isPostCompletion = false) => {
    if (!user?.userId) {
      setOnboardingStatus({
        isLoading: false,
        needsOnboarding: false,
        error: "User not authenticated"
      });
      return;
    }

    try {
      setOnboardingStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log("Checking onboarding status for user:", user.userId, `(attempt ${retryCount + 1})`);
      const result = await checkUserOnboardingStatusAction();
      console.log("Onboarding status result:", result);
      
      if (result.success && result.data) {
        // Only check for organization membership - if user has organization, they're onboarded
        const needsOnboarding = !result.data.hasOrganization;
        console.log("Needs onboarding:", needsOnboarding, {
          hasOrganization: result.data.hasOrganization,
          hasUserRecord: result.data.hasUserRecord,
          membershipsCount: result.data.memberships?.length || 0,
          isPostCompletion,
          justCompleted
        });
        
        // If this is after completion and user still needs onboarding, retry more aggressively
        if (needsOnboarding && (isPostCompletion || justCompleted) && retryCount < maxRetries) {
          console.log(`User still needs onboarding after completion, retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => {
            checkOnboardingStatus(retryCount + 1, maxRetries, isPostCompletion);
          }, (retryCount + 1) * 1000); // Exponential backoff: 1s, 2s, 3s
          return;
        }
        
        // If we've exhausted retries after completion but still need onboarding, force to main app
        if (needsOnboarding && (isPostCompletion || justCompleted) && retryCount >= maxRetries) {
          console.warn("Exhausted retries after completion, forcing to main app to prevent infinite loop");
          setJustCompleted(false);
          setCompletionAttempts(prev => prev + 1);
          setOnboardingStatus({
            isLoading: false,
            needsOnboarding: false, // Force to main app
            error: null
          });
          return;
        }
        
        // If onboarding is complete, clear the justCompleted flag
        if (!needsOnboarding && justCompleted) {
          setJustCompleted(false);
          setCompletionAttempts(0);
        }
        
        setOnboardingStatus({
          isLoading: false,
          needsOnboarding,
          error: null
        });
      } else {
        console.error("Onboarding status check failed:", result.error);
        
        // Retry on failure
        if (retryCount < maxRetries) {
          console.log(`Status check failed, retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => {
            checkOnboardingStatus(retryCount + 1, maxRetries, isPostCompletion);
          }, (retryCount + 1) * 1000);
          return;
        }
        
        setOnboardingStatus({
          isLoading: false,
          needsOnboarding: false,
          error: result.error || "Failed to check onboarding status"
        });
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      
      // Retry on error
      if (retryCount < maxRetries) {
        console.log(`Error occurred, retrying in ${(retryCount + 1) * 1000}ms...`);
        setTimeout(() => {
          checkOnboardingStatus(retryCount + 1, maxRetries, isPostCompletion);
        }, (retryCount + 1) * 1000);
        return;
      }
      
      setOnboardingStatus({
        isLoading: false,
        needsOnboarding: false,
        error: error instanceof Error ? error.message : "Failed to check onboarding status"
      });
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated" && user?.userId) {
      checkOnboardingStatus();
    } else if (authStatus === "unauthenticated") {
      setOnboardingStatus({
        isLoading: false,
        needsOnboarding: false,
        error: null
      });
    }
  }, [authStatus, user?.userId]);

  // Show loading while checking authentication or onboarding status
  if (authStatus === "configuring" || onboardingStatus.isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "200px" 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show error if there's an issue
  if (onboardingStatus.error) {
    return (
      <div style={{ 
        maxWidth: "400px", 
        margin: "2rem auto", 
        padding: "1rem", 
        backgroundColor: "#fee", 
        color: "#c33", 
        borderRadius: "4px" 
      }}>
        <h3>Error</h3>
        <p>{onboardingStatus.error}</p>
        <button 
          onClick={() => checkOnboardingStatus()}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Show onboarding if user needs it and hasn't just completed it (with safeguard against infinite loops)
  if (authStatus === "authenticated" && onboardingStatus.needsOnboarding && !justCompleted && completionAttempts < 2) {
    return (
      <UserOnboarding 
        onComplete={() => {
          // Mark that user just completed onboarding
          setJustCompleted(true);
          // Refresh onboarding status after completion with special handling
          checkOnboardingStatus(0, 5, true); // More retries for post-completion
        }} 
      />
    );
  }

  // Show loading screen if we just completed and are waiting for database consistency
  if (justCompleted && onboardingStatus.isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "400px",
        textAlign: "center" 
      }}>
        <div style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>✅ Setup Complete!</div>
        <div style={{ marginBottom: "1rem" }}>Preparing your workspace...</div>
        <div>Loading...</div>
      </div>
    );
  }

  // Show main app for authenticated users who have completed onboarding
  return <>{children}</>;
}
