// app/actions/invitation.ts
"use server";

import { revalidatePath } from "next/cache";
import { AuthGetCurrentUserServer, cookiesClient } from "@/utils/amplify-utils";

export interface InviteUserData {
  email: string;
  organizationId: string;
  role: 'org_admin' | 'org_member';
}

export async function inviteUserToOrganizationAction(inviteData: InviteUserData) {
  try {
    console.log("Inviting user to organization:", inviteData);

    // Get authenticated user
    const currentUser = await AuthGetCurrentUserServer();
    if (!currentUser?.userId) {
      throw new Error("User not authenticated");
    }

    const inviterId = currentUser.userId;

    // Check if the inviter has permission to invite users to this organization
    const { data: membership } = await cookiesClient.models.OrganizationMembership.list({
      filter: { 
        userId: { eq: inviterId },
        organizationId: { eq: inviteData.organizationId }
      }
    });

    if (!membership || membership.length === 0) {
      throw new Error("You are not a member of this organization");
    }

    const inviterMembership = membership[0];
    
    // Only owners and admins can invite users
    if (inviterMembership.organizationRole !== 'org_owner' && inviterMembership.organizationRole !== 'org_admin') {
      throw new Error("You don't have permission to invite users to this organization");
    }

    // Only owners can invite admins
    if (inviteData.role === 'org_admin' && inviterMembership.organizationRole !== 'org_owner') {
      throw new Error("Only organization owners can invite admins");
    }

    // Generate invitation token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, errors: invitationErrors } = await cookiesClient.models.Invitation.create({
      email: inviteData.email,
      organizationId: inviteData.organizationId,
      invitedRole: inviteData.role,
      invitedBy: inviterId,
      token: token,
      expiresAt: expiresAt.toISOString(),
      isAccepted: false,
    });

    if (invitationErrors) {
      console.error("Invitation creation errors:", invitationErrors);
      throw new Error(`Failed to create invitation: ${JSON.stringify(invitationErrors)}`);
    }

    if (!invitation) {
      throw new Error("Failed to create invitation: No data returned");
    }

    // TODO: Send email invitation here
    console.log("Invitation created successfully:", invitation.id);
    console.log("Invitation token:", token);

    revalidatePath("/");

    return {
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          organizationId: invitation.organizationId,
          invitedRole: invitation.invitedRole,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        }
      }
    };

  } catch (error) {
    console.error("Error inviting user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite user"
    };
  }
}

export async function acceptInvitationAction(token: string) {
  try {
    console.log("Accepting invitation with token:", token);

    // Get authenticated user
    const currentUser = await AuthGetCurrentUserServer();
    if (!currentUser?.userId || !currentUser.signInDetails?.loginId) {
      throw new Error("User not authenticated");
    }

    const userId = currentUser.userId;
    const email = currentUser.signInDetails.loginId;

    // Find the invitation
    const { data: invitations } = await cookiesClient.models.Invitation.list({
      filter: { 
        token: { eq: token },
        email: { eq: email },
        isAccepted: { eq: false }
      }
    });

    if (!invitations || invitations.length === 0) {
      throw new Error("Invalid or expired invitation");
    }

    const invitation = invitations[0];

    // Check if invitation is expired
    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error("Invitation has expired");
    }

    // Create or get user record
    let user;
    const { data: existingUsers } = await cookiesClient.models.User.list({
      filter: { cognitoUserId: { eq: userId } }
    });

    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      // Create user record
      const { data: newUser, errors: userErrors } = await cookiesClient.models.User.create({
        cognitoUserId: userId,
        email: email,
        isActive: true,
      });

      if (userErrors || !newUser) {
        throw new Error("Failed to create user record");
      }
      user = newUser;
    }

    // Create organization membership
    const { data: membership, errors: membershipErrors } = await cookiesClient.models.OrganizationMembership.create({
      userId: userId,
      organizationId: invitation.organizationId,
      organizationRole: invitation.invitedRole,
      isActive: true,
      invitedBy: invitation.invitedBy,
    });

    if (membershipErrors || !membership) {
      throw new Error("Failed to create organization membership");
    }

    // Mark invitation as accepted
    const { errors: updateErrors } = await cookiesClient.models.Invitation.update({
      id: invitation.id,
      isAccepted: true,
      acceptedAt: new Date().toISOString(),
    });

    if (updateErrors) {
      console.warn("Failed to update invitation status:", updateErrors);
      // Don't fail the entire operation for this
    }

    revalidatePath("/");

    return {
      success: true,
      data: {
        membership: {
          id: membership.id,
          userId: membership.userId,
          organizationId: membership.organizationId,
          organizationRole: membership.organizationRole,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
        }
      }
    };

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invitation"
    };
  }
}
