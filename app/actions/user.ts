// app/actions/user.ts
"use server";

import { AuthGetCurrentUserServer, cookiesClient } from "@/utils/amplify-utils";

export async function getUserOrganizationInfo() {
  try {
    // Get authenticated user
    const currentUser = await AuthGetCurrentUserServer();
    if (!currentUser?.userId || !currentUser.signInDetails?.loginId) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }

    const userId = currentUser.userId;
    const email = currentUser.signInDetails.loginId;

    // Get user record
    const { data: users, errors: userErrors } = await cookiesClient.models.User.list({
      filter: { cognitoUserId: { eq: userId } }
    });

    const userRecord = users?.[0] || null;

    // Get user profile if user record exists
    let userProfile = null;
    if (userRecord) {
      const { data: profiles } = await cookiesClient.models.UserProfile.list({
        filter: { userId: { eq: userId } }
      });
      userProfile = profiles?.[0] || null;
    }

    // Get user's organization memberships with organization details
    const { data: memberships, errors: membershipErrors } = await cookiesClient.models.OrganizationMembership.list({
      filter: { 
        userId: { eq: userId },
        isActive: { eq: true }
      }
    });

    // Get organizations for the memberships
    const organizationPromises = memberships?.map(async (membership) => {
      const { data: organizations } = await cookiesClient.models.Organization.list({
        filter: { 
          id: { eq: membership.organizationId },
          isActive: { eq: true }
        }
      });
      return {
        membership,
        organization: organizations?.[0] || null
      };
    }) || [];

    const organizationsData = await Promise.all(organizationPromises);

    return {
      success: true,
      data: {
        user: userRecord ? {
          id: userRecord.id,
          cognitoUserId: userRecord.cognitoUserId,
          email: userRecord.email,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          systemRole: userRecord.systemRole,
          isActive: userRecord.isActive,
        } : null,
        cognitoUser: {
          userId,
          email
        },
        profile: userProfile ? {
          id: userProfile.id,
          userId: userProfile.userId,
          avatar: userProfile.avatar,
          bio: userProfile.bio,
          phoneNumber: userProfile.phoneNumber,
          timezone: userProfile.timezone,
          language: userProfile.language,
        } : null,
        organizations: organizationsData.map(({ membership, organization }) => ({
          membership: {
            id: membership.id,
            organizationRole: membership.organizationRole,
            isActive: membership.isActive,
            joinedAt: membership.joinedAt,
          },
          organization: organization ? {
            id: organization.id,
            name: organization.name,
            description: organization.description,
            domain: organization.domain,
            isActive: organization.isActive,
          } : null
        })).filter(item => item.organization !== null)
      }
    };

  } catch (error) {
    console.error("Error fetching user organization info:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user information"
    };
  }
}
