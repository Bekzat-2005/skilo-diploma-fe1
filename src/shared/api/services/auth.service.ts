import { AxiosInstance } from "axios";
import type { AuthResponse, LoginPayload, RegisterPayload } from "../types";

// Енді біз Axios инстансын сырттан (client.ts) қабылдаймыз
export const createAuthService = (http: AxiosInstance) => ({
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>("auth/register", payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>("auth/login", payload);
    return data;
  },
});