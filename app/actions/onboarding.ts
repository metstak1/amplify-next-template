// app/actions/onboarding.ts
"use server";

import { revalidatePath } from "next/cache";
import { AuthGetCurrentUserServer, cookiesClient } from "@/utils/amplify-utils";

export interface OnboardingData {
  organizationName: string;
  firstName?: string;
  lastName?: string;
}

export async function createUserOrganizationAction(onboardingData: OnboardingData) {
  try {
    console.log("Creating organization server-side for data:", onboardingData);

    // Get authenticated user
    const currentUser = await AuthGetCurrentUserServer();
    if (!currentUser?.userId || !currentUser.signInDetails?.loginId) {
      console.error("User authentication failed:", currentUser);
      throw new Error("User not authenticated");
    }

    const userId = currentUser.userId;
    const email = currentUser.signInDetails.loginId;
    console.log("Authenticated user:", { userId, email });

    // 1. Create the organization
    console.log("Step 1: Creating organization...");
    const { data: organization, errors: orgErrors } = await cookiesClient.models.Organization.create({
      name: onboardingData.organizationName,
      description: `Organization for ${onboardingData.organizationName}`,
      isActive: true,
    });

    if (orgErrors) {
      console.error("Organization creation errors:", orgErrors);
      throw new Error(`Failed to create organization: ${JSON.stringify(orgErrors)}`);
    }

    if (!organization) {
      console.error("Organization creation returned null");
      throw new Error("Failed to create organization: No data returned");
    }

    console.log("Organization created successfully:", organization.id);

    // 2. Create the user record (systemRole will be null - can be set by system admins later)
    console.log("Step 2: Creating user record...");
    const { data: user, errors: userErrors } = await cookiesClient.models.User.create({
      cognitoUserId: userId, // Store the Cognito user ID for mapping
      email: email,
      firstName: onboardingData.firstName || "",
      lastName: onboardingData.lastName || "",
      isActive: true,
      // systemRole is not set - defaults to null, can be assigned by system admins later
    });

    if (userErrors) {
      console.error("User creation errors:", userErrors);
      throw new Error(`Failed to create user record: ${JSON.stringify(userErrors)}`);
    }

    if (!user) {
      console.error("User creation returned null");
      throw new Error("Failed to create user record: No data returned");
    }

    console.log("User record created successfully:", user.id);

    // 3. Create organization membership - since this user is creating the org, they become the owner
    console.log("Step 3: Creating organization membership...");
    const { data: membership, errors: membershipErrors } = await cookiesClient.models.OrganizationMembership.create({
      userId: userId,
      organizationId: organization.id,
      organizationRole: 'org_owner', // Creator of organization becomes owner
      isActive: true,
    });

    if (membershipErrors) {
      console.error("Membership creation errors:", membershipErrors);
      throw new Error(`Failed to create organization membership: ${JSON.stringify(membershipErrors)}`);
    }

    if (!membership) {
      console.error("Membership creation returned null");
      throw new Error("Failed to create organization membership: No data returned");
    }

    console.log("Organization membership created successfully:", membership.id);

    // 4. Create user profile
    console.log("Step 4: Creating user profile...");
    const { data: profile, errors: profileErrors } = await cookiesClient.models.UserProfile.create({
      userId: userId,
      timezone: 'UTC',
      language: 'en',
    });

    if (profileErrors) {
      console.warn("User profile creation errors:", profileErrors);
      // Don't throw error for profile creation failure
    } else {
      console.log("User profile created successfully:", profile?.id);
    }

    // Revalidate the page to refresh data
    revalidatePath("/");

    console.log("Onboarding completed successfully");
    return {
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          isActive: organization.isActive,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
        },
        user: {
          id: user.id,
          cognitoUserId: user.cognitoUserId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          systemRole: user.systemRole, // Will be null for frontend-created users
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        membership: {
          id: membership.id,
          userId: membership.userId,
          organizationId: membership.organizationId,
          organizationRole: membership.organizationRole,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
        },
        profile: profile ? {
          id: profile.id,
          userId: profile.userId,
          timezone: profile.timezone,
          language: profile.language,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        } : null
      }
    };

  } catch (error) {
    console.error("Error in user onboarding:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete onboarding"
    };
  }
}

export async function checkUserOnboardingStatusAction() {
  try {
    // Get authenticated user
    const currentUser = await AuthGetCurrentUserServer();
    if (!currentUser?.userId) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }

    const userId = currentUser.userId;
    console.log("Checking onboarding status for userId:", userId);

    // Check if user has any organization memberships
    const { data: memberships, errors: membershipErrors } = await cookiesClient.models.OrganizationMembership.list({
      filter: { userId: { eq: userId } }
    });

    console.log("Memberships query result:", { memberships, membershipErrors });

    // Check if user record exists
    const { data: users, errors: userErrors } = await cookiesClient.models.User.list({
      filter: { cognitoUserId: { eq: userId } }
    });

    console.log("Users query result:", { users, userErrors });

    // Clean the data to avoid serialization issues
    const cleanMemberships = memberships?.map(membership => ({
      id: membership.id,
      userId: membership.userId,
      organizationId: membership.organizationId,
      organizationRole: membership.organizationRole,
      isActive: membership.isActive,
      joinedAt: membership.joinedAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    })) || [];

    const cleanUserRecord = users?.[0] ? {
      id: users[0].id,
      cognitoUserId: users[0].cognitoUserId,
      email: users[0].email,
      firstName: users[0].firstName,
      lastName: users[0].lastName,
      systemRole: users[0].systemRole, // Will be null for frontend-created users
      isActive: users[0].isActive,
      createdAt: users[0].createdAt,
      updatedAt: users[0].updatedAt,
    } : null;

    return {
      success: true,
      data: {
        hasOrganization: memberships && memberships.length > 0,
        hasUserRecord: users && users.length > 0,
        memberships: cleanMemberships,
        userRecord: cleanUserRecord
      }
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check onboarding status"
    };
  }
}
