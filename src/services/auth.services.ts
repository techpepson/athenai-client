import { api, ApiResponse } from "@/apis/api";
import {
  IRegister,
  LoginPayload,
  LoginResponse,
  RegisterResponse,
  RequestResetCodeResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  VerifyEmailResponse,
} from "@/interface/auth.interface";

class AuthServices {
  private readonly basePath = "/auth";

  /**
   * Register a new user
   * POST /auth/register
   */
  async register(payload: IRegister): Promise<ApiResponse<RegisterResponse>> {
    try {
      const response = await api.post<RegisterResponse>(
        `${this.basePath}/register`,
        payload,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Registration failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await api.post<LoginResponse>(
        `${this.basePath}/login`,
        payload,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Login failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Verify email with code
   * GET /auth/verify-email?code=xxx&email=xxx
   */
  async verifyEmail(
    email: string,
    code: string,
  ): Promise<ApiResponse<VerifyEmailResponse>> {
    try {
      const response = await api.get<VerifyEmailResponse>(
        `${this.basePath}/verify-email`,
        undefined,
        {
          params: { email, code },
        },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Email verification failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Reset password (requires authentication)
   * POST /auth/reset-password?resetCode=xxx
   */
  async resetPassword(
    payload: ResetPasswordPayload,
    token: string,
    resetCode?: string,
  ): Promise<ApiResponse<ResetPasswordResponse>> {
    try {
      const response = await api.post<ResetPasswordResponse>(
        `${this.basePath}/reset-password`,
        payload,
        token,
        {
          params: resetCode ? { resetCode } : undefined,
        },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Password reset failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Request password reset code (requires authentication)
   * GET /auth/request-reset-code
   */
  async requestResetCode(
    token: string,
  ): Promise<ApiResponse<RequestResetCodeResponse>> {
    try {
      const response = await api.get<RequestResetCodeResponse>(
        `${this.basePath}/request-reset-code`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to request reset code",
        status: 0,
        success: false,
      };
    }
  }
}

// Export singleton instance
export const authServices = new AuthServices();

// Export class for custom instantiation
export { AuthServices };
