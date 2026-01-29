export class UtilServices {
  async getTokenFromLocalStorage(): Promise<string | null> {
    try {
      const token = localStorage.getItem("accessToken");
      return token;
    } catch (error) {
      console.error("Error retrieving token from localStorage:", error);
      throw error;
    }
  }

  async saveTokenToLocalStorage(token: string): Promise<void> {
    try {
      localStorage.setItem("accessToken", token);
    } catch (error) {
      console.error("Error saving token to localStorage:", error);
      throw error;
    }
  }
}
