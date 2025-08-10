import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // Organization model - represents organizations in the system
  Organization: a
    .model({
      name: a.string().required(),
      description: a.string(),
      domain: a.string(), // Organization domain for email-based auto-assignment
      isActive: a.boolean().default(true),
      settings: a.json(), // Organization-specific settings
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relationships
      organizationMemberships: a.hasMany('OrganizationMembership', 'organizationId'),
      todos: a.hasMany('Todo', 'organizationId'),
      invitations: a.hasMany('Invitation', 'organizationId'),
      auditLogs: a.hasMany('AuditLog', 'organizationId'),
    })
    .authorization((allow) => [
      // System roles can manage all organizations (backend only)
      allow.group('SystemOwner').to(['create', 'read', 'update', 'delete']),
      allow.group('SystemAdmin').to(['read', 'update']),
      allow.group('SystemUser').to(['read']),
      // Allow authenticated users to create organizations (for onboarding)
      allow.authenticated().to(['create', 'read']),
    ]),

  // User model - represents basic user information (linked to Cognito users)
  User: a
    .model({
      cognitoUserId: a.string().required(), // Store the Cognito user ID for mapping
      email: a.string().required(),
      firstName: a.string(),
      lastName: a.string(),
      systemRole: a.enum(['system_owner', 'system_admin', 'system_user']), // System roles managed from backend only
      isActive: a.boolean().default(true),
      lastLoginAt: a.datetime(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relationships
      organizationMemberships: a.hasMany('OrganizationMembership', 'userId'),
      todos: a.hasMany('Todo', 'userId'),
      profile: a.hasOne('UserProfile', 'userId'),
    })
    .authorization((allow) => [
      // System roles can manage all users (backend only)
      allow.group('SystemOwner').to(['create', 'read', 'update', 'delete']),
      allow.group('SystemAdmin').to(['read', 'update']),
      // Allow authenticated users to create and read user records (for onboarding and status checks)
      allow.authenticated().to(['create', 'read']),
      // Users can update their own profile using owner mechanism
      allow.owner().to(['update']),
    ]),

  // Organization Membership model - links users to organizations with organization-specific roles
  OrganizationMembership: a
    .model({
      userId: a.string().required(), // Reference to Cognito user ID
      organizationId: a.id().required(),
      organizationRole: a.enum(['org_owner', 'org_admin', 'org_member']),
      permissions: a.json(), // Additional granular permissions within the organization
      isActive: a.boolean().default(true),
      joinedAt: a.datetime(),
      invitedBy: a.string(), // User ID who invited this user
      // Relationships
      user: a.belongsTo('User', 'userId'),
      organization: a.belongsTo('Organization', 'organizationId'),
    })
    .authorization((allow) => [
      // System roles can manage all memberships (backend only)
      allow.group('SystemOwner').to(['create', 'read', 'update', 'delete']),
      allow.group('SystemAdmin').to(['read', 'update']),
      allow.group('SystemUser').to(['read']),
      // Allow authenticated users to manage memberships (filtering handled at application level)
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),

  // Updated Todo model with organization scoping
  Todo: a
    .model({
      content: a.string().required(),
      done: a.boolean().default(false),
      priority: a.enum(['low', 'medium', 'high']),
      organizationId: a.id().required(), // Every todo must belong to an organization
      userId: a.string().required(), // Reference to the user who created the todo
      assignedTo: a.string(), // Optional: user ID of assigned user
      dueDate: a.datetime(),
      tags: a.string().array(), // Array of tags for categorization
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relationships
      organization: a.belongsTo('Organization', 'organizationId'),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => [
      // System roles can access todos across all organizations (backend only)
      allow.group('SystemOwner').to(['create', 'read', 'update', 'delete']),
      allow.group('SystemAdmin').to(['read', 'update']),
      allow.group('SystemUser').to(['read']),
      // Users can only manage their own todos (owner is automatically set by Amplify)
      allow.owner().to(['create', 'read', 'update', 'delete']),
    ]),

  // User Profile model - extended profile information
  UserProfile: a
    .model({
      userId: a.string().required(), // Reference to Cognito user ID
      avatar: a.string(), // URL to profile picture
      bio: a.string(),
      phoneNumber: a.string(),
      timezone: a.string().default('UTC'),
      language: a.string().default('en'),
      notificationPreferences: a.json(), // Email, SMS, in-app notification settings
      socialLinks: a.json(), // LinkedIn, Twitter, etc.
      // Relationships
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => [
      // System roles can read all profiles (backend only)
      allow.group('SystemOwner').to(['read', 'update']),
      allow.group('SystemAdmin').to(['read']),
      // Allow authenticated users to create and read profiles (for onboarding and status checks)
      allow.authenticated().to(['create', 'read']),
      // Users can update their own profile using owner mechanism
      allow.owner().to(['update']),
    ]),

  // Invitation model - for inviting users to organizations
  Invitation: a
    .model({
      email: a.string().required(),
      organizationId: a.id().required(),
      invitedRole: a.enum(['org_owner', 'org_admin', 'org_member']),
      invitedBy: a.string().required(), // User ID who sent the invitation
      token: a.string().required(), // Unique invitation token
      expiresAt: a.datetime().required(),
      isAccepted: a.boolean().default(false),
      acceptedAt: a.datetime(),
      createdAt: a.datetime(),
      // Relationships
      organization: a.belongsTo('Organization', 'organizationId'),
    })
    .authorization((allow) => [
      // System roles can manage all invitations (backend only)
      allow.group('SystemOwner').to(['create', 'read', 'update', 'delete']),
      allow.group('SystemAdmin').to(['create', 'read', 'update', 'delete']),
      // All authenticated users can read invitations (organization-specific filtering will be handled at application level)
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),

  // Audit Log model - for tracking important actions
  AuditLog: a
    .model({
      userId: a.string().required(), // User who performed the action
      organizationId: a.id(), // Organization context (optional for system-level actions)
      action: a.string().required(), // Action performed (e.g., 'user_invited', 'todo_created')
      entityType: a.string().required(), // Type of entity affected (e.g., 'User', 'Todo')
      entityId: a.string().required(), // ID of the affected entity
      details: a.json(), // Additional details about the action
      ipAddress: a.string(),
      userAgent: a.string(),
      timestamp: a.datetime().required(),
      // Relationships
      organization: a.belongsTo('Organization', 'organizationId'),
    })
    .authorization((allow) => [
      // System roles can read all audit logs (backend only)
      allow.group('SystemOwner').to(['create', 'read']),
      allow.group('SystemAdmin').to(['read']),
      // All authenticated users can create and read audit logs (organization-specific filtering will be handled at application level)
      allow.authenticated().to(['create', 'read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

