"use client";

import React, { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { ChevronDown, LogOut, Settings, User, Building2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserOrganizationInfo } from "@/app/actions/user";
import { cn } from "@/lib/utils";

interface UserInfo {
  user: {
    id: string;
    cognitoUserId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    systemRole?: string | null;
    isActive: boolean | null;
  } | null;
  cognitoUser: {
    userId: string;
    email: string;
  };
  profile: {
    id: string;
    userId: string;
    avatar?: string | null;
    bio?: string | null;
    phoneNumber?: string | null;
    timezone?: string | null;
    language?: string | null;
  } | null;
  organizations: Array<{
    membership: {
      id: string;
      organizationRole: string | null;
      isActive: boolean | null;
      joinedAt?: string | null;
    };
    organization: {
      id: string;
      name: string;
      description?: string | null;
      domain?: string | null;
      isActive: boolean | null;
    } | null;
  }>;
}

export default function Header() {
  const { user, signOut } = useAuthenticator();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<UserInfo['organizations'][0] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserInfo() {
      if (!user?.userId) return;
      
      try {
        setLoading(true);
        const result = await getUserOrganizationInfo();
        
        if (result.success && result.data) {
          setUserInfo(result.data);
          // Set the first organization as selected by default, or prioritize owner role
          const primaryOrg = result.data.organizations.find(
            org => org.organization && org.membership.organizationRole === 'org_owner'
          ) || result.data.organizations.find(org => org.organization) || null;
          setSelectedOrganization(primaryOrg);
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserInfo();
  }, [user?.userId]);

  const getUserDisplayName = () => {
    if (userInfo?.user?.firstName && userInfo?.user?.lastName) {
      return `${userInfo.user.firstName} ${userInfo.user.lastName}`;
    }
    if (userInfo?.user?.firstName) {
      return userInfo.user.firstName;
    }
    return userInfo?.cognitoUser?.email || user?.signInDetails?.loginId || "User";
  };

  const getUserInitials = () => {
    if (userInfo?.user?.firstName && userInfo?.user?.lastName) {
      return `${userInfo.user.firstName[0]}${userInfo.user.lastName[0]}`.toUpperCase();
    }
    if (userInfo?.user?.firstName) {
      return userInfo.user.firstName[0].toUpperCase();
    }
    const email = userInfo?.cognitoUser?.email || user?.signInDetails?.loginId;
    return email ? email[0].toUpperCase() : "U";
  };

  const getRoleDisplayName = (role: string | null) => {
    if (!role) return 'Member';
    switch (role) {
      case 'org_owner':
        return 'Owner';
      case 'org_admin':
        return 'Admin';
      case 'org_member':
        return 'Member';
      case 'system_owner':
        return 'System Owner';
      case 'system_admin':
        return 'System Admin';
      case 'system_user':
        return 'System User';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
            <div className="h-4 w-32 animate-pulse rounded bg-muted"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Organization Selection */}
          {selectedOrganization?.organization && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {selectedOrganization.organization.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getRoleDisplayName(selectedOrganization.membership.organizationRole)}
                </span>
              </div>
              {userInfo && userInfo.organizations.filter(org => org.organization).length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {userInfo.organizations.filter(org => org.organization).map((org) => (
                      <DropdownMenuItem
                        key={org.organization!.id}
                        onClick={() => setSelectedOrganization(org)}
                        className={cn(
                          "flex flex-col items-start",
                          selectedOrganization?.organization?.id === org.organization!.id && "bg-accent"
                        )}
                      >
                        <span className="font-medium">{org.organization!.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getRoleDisplayName(org.membership.organizationRole)}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={userInfo?.profile?.avatar || undefined} 
                    alt={getUserDisplayName()} 
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userInfo?.cognitoUser?.email}
                  </p>
                  {userInfo?.user?.systemRole && (
                    <p className="text-xs leading-none text-muted-foreground">
                      System: {getRoleDisplayName(userInfo.user.systemRole)}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              {userInfo && userInfo.organizations.length > 0 && (
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Team</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
