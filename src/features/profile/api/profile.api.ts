// profile.api.ts
import { api, type LeaderboardResponse, type UserActivityDay } from "@/shared/api/client"
import { axiosInstance } from "@/shared/api/client" // ҚОСТЫҚ: Серверге сұраныс жасау үшін

export const profileApi = {
  // ӨЗГЕРІС: Бэкендтен профильді жүктейтін функция қосылды
  async getProfile() {
    // "/profile" деп жазамыз, себебі client.ts-те baseURL "/api" деп көрсетілген
    const response = await axiosInstance.get('/profile');
    return response.data;
  },

  getUserYearActivity(userId: number | null): Promise<UserActivityDay[]> {
    return api.getUserYearActivity(userId)
  },
  
  getLeaderboard(userId: number | null): Promise<LeaderboardResponse> {
    return api.getLeaderboard(userId)
  }
}

export type { UserActivityDay }