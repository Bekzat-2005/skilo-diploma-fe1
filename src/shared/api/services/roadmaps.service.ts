// roadmaps.service.ts
import { AxiosInstance } from "axios";
import type { RoadmapProgressItem, UserActivityDay } from "../types";

// Енді функция axiosInstance (http) қабылдайды
export const createRoadmapsService = (http: AxiosInstance) => {
  return {
    async getRoadmapProgress(): Promise<RoadmapProgressItem[]> {
      const { data } = await http.get<RoadmapProgressItem[]>("/roadmaps/progress");
      return data;
    },

    async getUserRoadmapCollection(): Promise<string[]> {
      const { data } = await http.get<string[]>("/roadmaps/collection");
      return data;
    },

    async updateUserRoadmapCollection(roadmapIds: string[]): Promise<string[]> {
      const { data } = await http.post<string[]>("/roadmaps/collection", { roadmapIds });
      return data;
    },

    async removeUserRoadmapFromCollection(roadmapId: string): Promise<string[]> {
      const { data } = await http.delete<string[]>(`/roadmaps/collection/${roadmapId}`);
      return data;
    },

    async getUserYearActivity(): Promise<UserActivityDay[]> {
      const { data } = await http.get<UserActivityDay[]>("/roadmaps/activity");
      return data;
    },
    async getAssessmentQuestions(roadmapId: string): Promise<any> {
      const { data } = await http.get(`/roadmaps/${roadmapId}/assessment`);
      return data;
    },

    async submitAssessmentAnswers(
      roadmapId: string, 
      payload: { theoryScore: number; writtenAnswers: any[]; answers?: any }
    ): Promise<any> {
      // payload ішінде жаңа формат та (theory + written), 
      // ескі формат та (answers) жүре беретіндей етіп жасадық (backend-тегі гибридті код үшін)
      const { data } = await http.post(`/roadmaps/${roadmapId}/assessment/submit`, payload);
      return data;
    },
    async getUserSkillLevels(): Promise<any[]> {
      const { data } = await http.get<any[]>("/roadmaps/skill-levels");
      return data;
    },
  };
};