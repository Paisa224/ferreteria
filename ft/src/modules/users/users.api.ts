import type {
  CreateUserDto,
  Permission,
  Role,
  RoleWithPerms,
  UpdateUserDto,
  UserListItem,
} from "./types";
import { http } from "../../api/http";

export async function listUsers(): Promise<UserListItem[]> {
  const { data } = await http.get("/users");
  return data;
}

export async function createUser(dto: CreateUserDto): Promise<UserListItem> {
  const { data } = await http.post("/users", {
    ...dto,
    roleIds: dto.roleIds ?? [],
  });
  return data;
}

export async function updateUser(
  id: number,
  dto: UpdateUserDto,
): Promise<UserListItem> {
  const { data } = await http.patch(`/users/${id}`, dto);
  return data;
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await http.get("/roles");
  return data;
}

export async function createRole(name: string): Promise<Role> {
  const { data } = await http.post("/roles", { name });
  return data;
}

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await http.get("/permissions");
  return data;
}

export async function getRole(id: number): Promise<RoleWithPerms> {
  const { data } = await http.get(`/roles/${id}`);
  return data;
}

export async function setRolePermissions(
  roleId: number,
  permissionKeys: string[],
): Promise<RoleWithPerms> {
  const { data } = await http.put(`/roles/${roleId}/permissions`, {
    permissionKeys,
  });
  return data;
}
