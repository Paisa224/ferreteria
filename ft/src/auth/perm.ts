export type Me = {
  userId: number;
  username: string;
  permissions: string[];
  roles?: string[];
};

export function hasPerm(me: Me | null | undefined, perm: string) {
  if (!me) return false;
  return (me.permissions ?? []).includes(perm);
}

export function hasAnyPerm(me: Me | null | undefined, perms: string[]) {
  if (!me) return false;
  const set = new Set(me.permissions ?? []);
  return perms.some((p) => set.has(p));
}
