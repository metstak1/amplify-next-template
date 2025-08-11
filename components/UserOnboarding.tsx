// components/UserOnboarding.tsx
"use client";

import { useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { createUserOrganizationAction, type OnboardingData } from "@/app/actions/onboarding";

interface UserOnboardingProps {
  onComplete: () => void;
}

export default function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const { user } = useAuthenticator();
  const [formData, setFormData] = useState<OnboardingData>({
    organizationName: "",
    firstName: "",
    lastName: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.userId || !user.signInDetails?.loginId) {
      setError("User information not available");
      return;
    }

    if (!formData.organizationName.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createUserOrganizationAction(formData);
      
      if (result.success) {
        console.log("User onboarding completed successfully", result.data);
        setIsCompleting(true);
        
        // Add a small delay to ensure data is properly persisted
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        setError(result.error || "Failed to complete setup");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Onboarding failed:", error);
      setError(error instanceof Error ? error.message : "Failed to complete setup");
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{ 
      maxWidth: "400px", 
      margin: "2rem auto", 
      padding: "2rem", 
      border: "1px solid #ddd", 
      borderRadius: "8px",
      backgroundColor: "#f9f9f9"
    }}>
      <h2>Welcome! Let's set up your organization</h2>
      <p style={{ marginBottom: "1.5rem", color: "#666" }}>
        Create your organization and become its owner. You can invite other users later.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="organizationName" style={{ display: "block", marginBottom: "0.5rem" }}>
            Organization Name *
          </label>
          <input
            type="text"
            id="organizationName"
            name="organizationName"
            value={formData.organizationName}
            onChange={handleInputChange}
            required
            placeholder="Enter your organization name"
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              border: "1px solid #ccc", 
              borderRadius: "4px" 
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="firstName" style={{ display: "block", marginBottom: "0.5rem" }}>
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="Enter your first name"
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              border: "1px solid #ccc", 
              borderRadius: "4px" 
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="lastName" style={{ display: "block", marginBottom: "0.5rem" }}>
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="Enter your last name"
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              border: "1px solid #ccc", 
              borderRadius: "4px" 
            }}
          />
        </div>

        {isCompleting && (
          <div style={{ 
            marginBottom: "1rem", 
            padding: "0.75rem", 
            backgroundColor: "#d4edda", 
            color: "#155724", 
            borderRadius: "4px",
            fontSize: "0.9rem",
            textAlign: "center"
          }}>
            ✅ Setup completed successfully! Redirecting to your dashboard...
          </div>
        )}

        {error && !isCompleting && (
          <div style={{ 
            marginBottom: "1rem", 
            padding: "0.5rem", 
            backgroundColor: "#fee", 
            color: "#c33", 
            borderRadius: "4px",
            fontSize: "0.9rem"
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isCompleting}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: isCompleting ? "#28a745" : (isLoading ? "#ccc" : "#007bff"),
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            cursor: (isLoading || isCompleting) ? "not-allowed" : "pointer"
          }}
        >
          {isCompleting ? "✅ Setup Complete!" : (isLoading ? "Setting up..." : "Complete Setup")}
        </button>
      </form>
    </div>
  );
}
