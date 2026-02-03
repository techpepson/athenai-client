/* eslint-disable @typescript-eslint/no-explicit-any */
// API Configuration
const PROD_URL = "https://api.comas.edu.gh/api"; // Replace with your production URL
const DEV_URL = "http://localhost:4000/api";

const getBaseUrl = (): string => {
  const url =
    import.meta.env.VITE_ENVIRONMENT === "production"
      ? import.meta.env.VITE_API_PROD_URL || PROD_URL
      : import.meta.env.VITE_API_DEV_URL || DEV_URL;
  return url;
};

// API Response interface
export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
  success: boolean;
}

// Request options interface
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

export class API {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl?: string, timeout: number = 30000) {
    this.baseUrl = baseUrl || getBaseUrl();
    this.defaultTimeout = timeout;
  }

  // Build headers with optional auth token
  private buildHeaders(
    token?: string,
    customHeaders?: Record<string, string>,
  ): Headers {
    const headers = new Headers({
      "Content-Type": "application/json",
      ...customHeaders,
    });

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  }

  // Build URL with query parameters
  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    // Remove leading slash from endpoint to properly append to base URL path
    const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;
    // Ensure base URL ends with slash for proper concatenation
    const baseWithSlash = this.baseUrl.endsWith("/")
      ? this.baseUrl
      : `${this.baseUrl}/`;
    const url = new URL(cleanEndpoint, baseWithSlash);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  // Handle API response
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status;

    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error:
            data.message ||
            data.error ||
            `Request failed with status ${status}`,
          status,
          success: false,
        };
      }

      return {
        data,
        error: null,
        status,
        success: true,
      };
    } catch {
      // Handle non-JSON responses
      if (response.ok) {
        return {
          data: null,
          error: null,
          status,
          success: true,
        };
      }

      return {
        data: null,
        error: `Request failed with status ${status}`,
        status,
        success: false,
      };
    }
  }

  // Handle fetch errors
  private handleError(error: unknown): ApiResponse {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          data: null,
          error: "Request timeout",
          status: 408,
          success: false,
        };
      }

      return {
        data: null,
        error: error.message,
        status: 0,
        success: false,
      };
    }

    return {
      data: null,
      error: "An unexpected error occurred",
      status: 0,
      success: false,
    };
  }

  // GET request
  async get<T = any>(
    endpoint: string,
    token?: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || this.defaultTimeout,
    );

    try {
      const response = await fetch(this.buildUrl(endpoint, options?.params), {
        method: "GET",
        headers: this.buildHeaders(token, options?.headers),
        signal: controller.signal,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // POST request
  async post<T = any>(
    endpoint: string,
    body: any,
    token?: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || this.defaultTimeout,
    );

    try {
      const response = await fetch(this.buildUrl(endpoint, options?.params), {
        method: "POST",
        headers: this.buildHeaders(token, options?.headers),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // PUT request
  async put<T = any>(
    endpoint: string,
    body: any,
    token?: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || this.defaultTimeout,
    );

    try {
      const response = await fetch(this.buildUrl(endpoint, options?.params), {
        method: "PUT",
        headers: this.buildHeaders(token, options?.headers),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // PATCH request
  async patch<T = any>(
    endpoint: string,
    body: any,
    token?: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || this.defaultTimeout,
    );

    try {
      const response = await fetch(this.buildUrl(endpoint, options?.params), {
        method: "PATCH",
        headers: this.buildHeaders(token, options?.headers),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // DELETE request
  async delete<T = any>(
    endpoint: string,
    token?: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || this.defaultTimeout,
    );

    try {
      const response = await fetch(this.buildUrl(endpoint, options?.params), {
        method: "DELETE",
        headers: this.buildHeaders(token, options?.headers),
        signal: controller.signal,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Upload file (multipart/form-data)
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    token?: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || this.defaultTimeout,
    );

    try {
      // Don't set Content-Type for FormData - browser will set it with boundary
      const headers = new Headers(options?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(this.buildUrl(endpoint, options?.params), {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Legacy methods for backward compatibility
  async readData<T = any>(
    endpoint: string,
    token?: string,
  ): Promise<ApiResponse<T>> {
    return this.get<T>(endpoint, token);
  }

  async createData<T = any>(
    body: any,
    endpoint: string,
    token?: string,
  ): Promise<ApiResponse<T>> {
    return this.post<T>(endpoint, body, token);
  }

  async updateData<T = any>(
    body: any,
    endpoint: string,
    token?: string,
  ): Promise<ApiResponse<T>> {
    return this.put<T>(endpoint, body, token);
  }

  async deleteData<T = any>(
    endpoint: string,
    token?: string,
  ): Promise<ApiResponse<T>> {
    return this.delete<T>(endpoint, token);
  }
}

// Export a singleton instance for convenience
export const api = new API();

// Export utility to create custom API instances with different base URLs
export const createAPI = (baseUrl?: string, timeout?: number) =>
  new API(baseUrl, timeout);
