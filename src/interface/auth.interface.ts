import { Role } from "@/enums/enums";
import { IUserPublic } from "./user.interface";

export interface IRegister {
  email: string;
  name: string;
  phone: string;
  password: string;
  role: Role;
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

// Reset password payload
export interface ResetPasswordPayload {
  oldPassword: string;
  newPassword: string;
}
