import { AxiosInstance } from "axios"
import type {
  CompanyCandidate,
  CompanyVacancyPayload,
  CompanyVacancyTaskPayload,
  InterviewInvitePayload,
  InterviewInviteResult,
  Vacancy,
  VacancyTask
} from "../types"

export const createCompanyService = (axiosInstance: AxiosInstance) => ({
  async getCompanyVacancies(): Promise<Vacancy[]> {
    const { data } = await axiosInstance.get("/company/vacancies");
    return data;
  },

  async createCompanyVacancy(payload: CompanyVacancyPayload): Promise<Vacancy> {
    const { data } = await axiosInstance.post("/company/vacancies", payload);
    return data;
  },

  async updateCompanyVacancy(vacancyId: string, payload: CompanyVacancyPayload): Promise<Vacancy | null> {
    const { data } = await axiosInstance.put(`/company/vacancies/${vacancyId}`, payload);
    return data;
  },

  async deleteCompanyVacancy(vacancyId: string): Promise<boolean> {
    await axiosInstance.delete(`/company/vacancies/${vacancyId}`);
    return true;
  },

  async createCompanyVacancyTask(vacancyId: string, payload: CompanyVacancyTaskPayload): Promise<VacancyTask | null> {
    const { data } = await axiosInstance.post(`/company/vacancies/${vacancyId}/tasks`, payload);
    return data;
  },

  async updateCompanyVacancyTask(
    vacancyId: string,
    taskId: string,
    payload: CompanyVacancyTaskPayload
  ): Promise<VacancyTask | null> {
    const { data } = await axiosInstance.put(`/company/vacancies/${vacancyId}/tasks/${taskId}`, payload);
    return data;
  },

  async deleteCompanyVacancyTask(vacancyId: string, taskId: string): Promise<boolean> {
    await axiosInstance.delete(`/company/vacancies/${vacancyId}/tasks/${taskId}`);
    return true;
  },

  async getCompanyCandidates(): Promise<CompanyCandidate[]> {
    const { data } = await axiosInstance.get("/company/candidates");
    return data;
  },

  async sendInterviewInvite(
    candidateId: string,
    payload: InterviewInvitePayload
  ): Promise<InterviewInviteResult | null> {
    const { data } = await axiosInstance.post(`/company/candidates/${candidateId}/invite`, payload);
    return data;
  }
});