// utils/user-onboarding.ts
import { type Schema } from "@/amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

export interface OnboardingData {
  organizationName: string;
  firstName?: string;
  lastName?: string;
  systemRole?: 'system_owner' | 'system_admin' | 'system_user';
}

export async function createUserOrganization(
  userId: string,
  email: string,
  onboardingData: OnboardingData
) {
  try {
    console.log("Creating organization for user:", userId);

    // 1. Create the organization
    const { data: organization, errors: orgErrors } = await client.models.Organization.create({
      name: onboardingData.organizationName,
      description: `Organization for ${onboardingData.organizationName}`,
      isActive: true,
    });

    if (orgErrors || !organization) {
      console.error("Failed to create organization:", orgErrors);
      throw new Error("Failed to create organization");
    }

    console.log("Organization created:", organization.id);

    // 2. Create the user record
    const { data: user, errors: userErrors } = await client.models.User.create({
      cognitoUserId: userId,
      email: email,
      firstName: onboardingData.firstName || "",
      lastName: onboardingData.lastName || "",
      systemRole: onboardingData.systemRole || 'system_user',
      isActive: true,
    });

    if (userErrors || !user) {
      console.error("Failed to create user:", userErrors);
      throw new Error("Failed to create user record");
    }

    console.log("User record created:", user.id);

    // 3. Create organization membership
    const { data: membership, errors: membershipErrors } = await client.models.OrganizationMembership.create({
      userId: userId,
      organizationId: organization.id,
      organizationRole: 'org_owner', // New users become owners of their org
      isActive: true,
    });

    if (membershipErrors || !membership) {
      console.error("Failed to create membership:", membershipErrors);
      throw new Error("Failed to create organization membership");
    }

    console.log("Organization membership created:", membership.id);

    // 4. Create user profile
    const { data: profile, errors: profileErrors } = await client.models.UserProfile.create({
      userId: userId,
      timezone: 'UTC',
      language: 'en',
    });

    if (profileErrors) {
      console.warn("Failed to create user profile:", profileErrors);
      // Don't throw error for profile creation failure
    } else {
      console.log("User profile created:", profile?.id);
    }

    return {
      organization,
      user,
      membership,
      profile
    };

  } catch (error) {
    console.error("Error in user onboarding:", error);
    throw error;
  }
}

export async function checkUserOnboardingStatus(userId: string) {
  try {
    // Check if user has any organization memberships
    const { data: memberships } = await client.models.OrganizationMembership.list({
      filter: { userId: { eq: userId } }
    });

    // Check if user record exists
    const { data: users } = await client.models.User.list({
      filter: { cognitoUserId: { eq: userId } }
    });

    return {
      hasOrganization: memberships && memberships.length > 0,
      hasUserRecord: users && users.length > 0,
      memberships,
      userRecord: users?.[0]
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return {
      hasOrganization: false,
      hasUserRecord: false,
      memberships: [],
      userRecord: null
    };
  }
}
