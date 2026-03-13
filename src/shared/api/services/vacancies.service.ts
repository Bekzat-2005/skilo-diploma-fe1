import type { AxiosInstance } from "axios";
import type { Vacancy, VacancyTaskLeaderboardResponse, VacancyTaskSubmission, VacancyTaskSubmissionPayload } from "../types";

export const createVacanciesService = (axios: AxiosInstance) => ({
  async getVacancies(): Promise<Vacancy[]> {
    const res = await axios.get("/vacancies");
    return res.data;
  },

  async getVacancyById(vacancyId: string): Promise<Vacancy> {
    const res = await axios.get(`/vacancies/${vacancyId}`);
    return res.data;
  },

  async getVacancyRealTasks(vacancyId: string, userId: number | null): Promise<any> {
    const res = await axios.get(`/vacancies/${vacancyId}/tasks`);
    return res.data;
  },

  async getVacancyTaskLeaderboard(vacancyId: string, userId: number | null): Promise<VacancyTaskLeaderboardResponse> {
    const res = await axios.get(`/vacancies/${vacancyId}/leaderboard`);
    return res.data;
  },

  async submitVacancyTask(
    vacancyId: string,
    taskId: string,
    payload: VacancyTaskSubmissionPayload,
    userId: number | null
  ): Promise<VacancyTaskSubmission> {
    const res = await axios.post(`/vacancies/${vacancyId}/tasks/${taskId}/submission`, {
        githubUrl: payload.solutionUrl,
        notes: payload.comment
    });
    return res.data;
  }
});