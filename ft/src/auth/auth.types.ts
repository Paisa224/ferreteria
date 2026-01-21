export type MeResponse = {
  userId: number;
  username: string;
  name?: string;
  roles?: string[];
  permissions: string[];
};

export type LoginResponse = {
  access_token: string;
  refresh_token?: string;
};
