import { mockLoginResponse } from "@/shared/mocks/mockData"

// export const USE_MOCK = true

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const resolveMockUserId = (userId: number | null) => userId ?? mockLoginResponse.user.id

export const generateToken = () =>
  "mock-jwt-" + Math.random().toString(36).substring(2)
