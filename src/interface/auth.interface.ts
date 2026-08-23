import { Role } from "@/enums/enums";
import { IUserPublic } from "./user.interface";

export interface IRegister {
  email: string;
  name: string;
  phone: string;
  password: string;
  role: Role;
  studentId?: string;
  level?: number;
}

export interface RegisterResponse {
  message: string;
  user: Partial<IUserPublic>;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  user: IUserPublic;
}

export interface VerifyEmailResponse {
  message: string;
  user?: Partial<IUserPublic>;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface RequestResetCodeResponse {
  message: string;
}

// Login payload
export interface LoginPayload {
  email: string;
  password: string;
}

// Reset password payload (old endpoint)
export interface ResetPasswordPayload {
  oldPassword: string;
  newPassword: string;
}

// Forgot password (public, no auth required)
export interface ForgotPasswordResponse {
  message: string;
}

// Reset password with token (public, no auth required)
export interface ResetPasswordWithTokenPayload {
  email: string;
  token: string;
  newPassword: string;
}

export interface ResetPasswordWithTokenResponse {
  message: string;
}

// Change password (logged-in, auth required)
export interface ChangePasswordPayload {
  oldPassword?: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}
