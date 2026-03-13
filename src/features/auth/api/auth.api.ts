import { api, type AuthResponse, type LoginPayload, type RegisterPayload } from "@/shared/api/client"

export const authApi = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return api.login(payload)
  },
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return api.register(payload)
  },
  getMe(): Promise<any> {
    return api.getMe() 
  }
}
