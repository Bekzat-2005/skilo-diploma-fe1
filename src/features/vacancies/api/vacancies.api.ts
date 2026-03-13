import { api } from "@/shared/api/client"
import type { 
  Vacancy, 
  VacancyTaskLeaderboardResponse, 
  VacancyTaskSubmission, 
  VacancyTaskSubmissionPayload 
} from "@/shared/api/types"

// Компонент күтіп тұрған атаумен экспорттау
export const vacanciesApi = {
  getVacancies: () => api.getVacancies(),
  getVacancyById: (id: string) => api.getVacancyById(id),
  getVacancyRealTasks: (id: string, userId: number | null) => api.getVacancyRealTasks(id, userId),
  getVacancyTaskLeaderboard: (id: string, userId: number | null) => api.getVacancyTaskLeaderboard(id, userId),
  submitVacancyTask: (vacancyId: string, taskId: string, payload: VacancyTaskSubmissionPayload, userId: number | null) => 
    api.submitVacancyTask(vacancyId, taskId, payload, userId)
}

// Типтерді қайта экспорттау (компонент қате бермеуі үшін)
export type {
  Vacancy,
  VacancyTaskLeaderboardResponse,
  VacancyTaskSubmission,
  VacancyTaskSubmissionPayload
}
