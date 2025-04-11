export interface IAuth {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface IAuthPayload extends IAuth {
  sub: string;
}

export interface ISignIn {
  accessToken: string;
  refreshToken?: string;
  user: IAuth;
}

export interface AuthRequest extends Request {
  user: IAuth;
}
