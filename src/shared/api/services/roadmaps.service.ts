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
    }
  };
};