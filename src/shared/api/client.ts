export * from "./types"
import axios from "axios";
import { createAuthService } from "./services/auth.service"
import { createCompanyService } from "./services/company.service"
import { createInterviewService } from "./services/interview.service"
import { createLeaderboardService } from "./services/leaderboard.service"
import { createRoadmapsService } from "./services/roadmaps.service"
import { createSocialService } from "./services/social.service"
import { createVacanciesService } from "./services/vacancies.service"


export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5002/api",
});

// Токенді автоматты түрде әр запросқа қосу
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const api = {
  ...createAuthService(axiosInstance),
  ...createRoadmapsService(axiosInstance),
  // ...createRoadmapsService(),
  ...createSocialService(axiosInstance),
  ...createLeaderboardService(axiosInstance),
  ...createVacanciesService(axiosInstance),
  // ...createInterviewService(),
  // ...createCompanyService()
};

export type ApiClient = typeof api
