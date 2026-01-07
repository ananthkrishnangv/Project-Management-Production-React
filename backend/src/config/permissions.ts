import { UserRole } from '@prisma/client';

export interface Permission {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    approve: boolean;
}

export interface RolePermissions {
    users: Permission;
    projects: Permission;
    finance: Permission;
    rcMeetings: Permission;
    documents: Permission;
    reports: Permission;
    settings: Permission;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
    ADMIN: {
        users: { create: true, read: true, update: true, delete: true, approve: true },
        projects: { create: true, read: true, update: true, delete: true, approve: true },
        finance: { create: true, read: true, update: true, delete: true, approve: true },
        rcMeetings: { create: true, read: true, update: true, delete: true, approve: true },
        documents: { create: true, read: true, update: true, delete: true, approve: true },
        reports: { create: true, read: true, update: true, delete: true, approve: true },
        settings: { create: true, read: true, update: true, delete: true, approve: true },
    },
    DIRECTOR: {
        users: { create: false, read: true, update: false, delete: false, approve: true },
        projects: { create: true, read: true, update: true, delete: false, approve: true },
        finance: { create: true, read: true, update: true, delete: false, approve: true },
        rcMeetings: { create: true, read: true, update: true, delete: false, approve: true },
        documents: { create: true, read: true, update: true, delete: false, approve: true },
        reports: { create: true, read: true, update: true, delete: false, approve: true },
        settings: { create: false, read: true, update: false, delete: false, approve: false },
    },
    SUPERVISOR: {
        users: { create: false, read: true, update: false, delete: false, approve: false },
        projects: { create: true, read: true, update: true, delete: false, approve: true },
        finance: { create: true, read: true, update: true, delete: false, approve: true },
        rcMeetings: { create: true, read: true, update: true, delete: false, approve: false },
        documents: { create: true, read: true, update: true, delete: false, approve: false },
        reports: { create: true, read: true, update: false, delete: false, approve: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false },
    },
    PROJECT_HEAD: {
        users: { create: false, read: true, update: false, delete: false, approve: false },
        projects: { create: false, read: true, update: true, delete: false, approve: false },
        finance: { create: true, read: true, update: true, delete: false, approve: false },
        rcMeetings: { create: false, read: true, update: false, delete: false, approve: false },
        documents: { create: true, read: true, update: true, delete: false, approve: false },
        reports: { create: true, read: true, update: false, delete: false, approve: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false },
    },
    EMPLOYEE: {
        users: { create: false, read: false, update: false, delete: false, approve: false },
        projects: { create: false, read: true, update: false, delete: false, approve: false },
        finance: { create: false, read: false, update: false, delete: false, approve: false },
        rcMeetings: { create: false, read: false, update: false, delete: false, approve: false },
        documents: { create: true, read: true, update: false, delete: false, approve: false },
        reports: { create: false, read: true, update: false, delete: false, approve: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false },
    },
    EXTERNAL_OWNER: {
        users: { create: false, read: false, update: false, delete: false, approve: false },
        projects: { create: false, read: true, update: false, delete: false, approve: false },
        finance: { create: false, read: false, update: false, delete: false, approve: false },
        rcMeetings: { create: false, read: false, update: false, delete: false, approve: false },
        documents: { create: true, read: true, update: false, delete: false, approve: false },
        reports: { create: false, read: false, update: false, delete: false, approve: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false },
    },
    DIRECTOR_GENERAL: {
        // DG has read-only access for analytics and oversight
        users: { create: false, read: true, update: false, delete: false, approve: false },
        projects: { create: false, read: true, update: false, delete: false, approve: false },
        finance: { create: false, read: true, update: false, delete: false, approve: false },
        rcMeetings: { create: false, read: true, update: false, delete: false, approve: false },
        documents: { create: false, read: true, update: false, delete: false, approve: false },
        reports: { create: false, read: true, update: false, delete: false, approve: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false },
    },
    RC_MEMBER: {
        // RC Members can read projects and participate in meetings
        users: { create: false, read: true, update: false, delete: false, approve: false },
        projects: { create: false, read: true, update: false, delete: false, approve: true },
        finance: { create: false, read: true, update: false, delete: false, approve: false },
        rcMeetings: { create: false, read: true, update: true, delete: false, approve: false },
        documents: { create: false, read: true, update: false, delete: false, approve: false },
        reports: { create: false, read: true, update: false, delete: false, approve: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false },
    },
};

export const hasPermission = (
    role: UserRole,
    resource: keyof RolePermissions,
    action: keyof Permission
): boolean => {
    return rolePermissions[role]?.[resource]?.[action] || false;
};
