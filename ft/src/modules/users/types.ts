export type Role = { id: number; name: string };

export type Permission = { id: number; key: string };

export type UserListItem = {
  id: number;
  name: string;
  username: string;
  ci: string;
  is_active: boolean;
  roles: Role[];
  createdAt?: string;
};

export type CreateUserDto = {
  name: string;
  username: string;
  ci: string;
  password: string;
  roleIds?: number[];
};

export type UpdateUserDto = {
  name?: string;
  username?: string;
  ci?: string;
  is_active?: boolean;
  roleIds?: number[];
  password?: string;
};

export type RoleWithPerms = {
  id: number;
  name: string;
  permissions: Permission[];
};
