// import { mockLoginResponse } from "@/shared/mocks/mockData"

// import type { LeaderboardEntry, LeaderboardResponse } from "../types"
// import { createMockLeaders, getCurrentUserPointsSnapshot } from "../shared/leaderboard.helpers"
// import { delay, resolveMockUserId, USE_MOCK } from "../shared/runtime"

// export const createLeaderboardService = () => ({
//   async getLeaderboard(userId: number | null): Promise<LeaderboardResponse> {
//     const resolvedUserId = resolveMockUserId(userId)

//     if (USE_MOCK) {
//       return await delay(320).then(() => {
//         const snapshot = getCurrentUserPointsSnapshot()
//         const currentUser: LeaderboardEntry = {
//           userId: resolvedUserId,
//           fullName: "Вы",
//           avatar: "Y",
//           country: mockLoginResponse.user.country,
//           city: mockLoginResponse.user.city,
//           university: mockLoginResponse.user.university,
//           points: snapshot.points,
//           completedTests: snapshot.completedTests,
//           passedTests: snapshot.passedTests,
//           failedTests: snapshot.failedTests,
//           roadmapProgressPercent: snapshot.progressPercent,
//           badges: snapshot.points >= 1800 ? ["Fast Learner"] : ["Starter"],
//           rank: 0
//         }

//         const all = [...createMockLeaders(), currentUser]
//           .sort((a, b) => b.points - a.points)
//           .map((item, index) => ({
//             ...item,
//             rank: index + 1
//           }))

//         const normalizedCurrent = all.find((item) => item.userId === resolvedUserId) ?? currentUser

//         return {
//           leaders: all,
//           currentUser: normalizedCurrent
//         }
//       })
//     }

//     await delay(700)
//     return {
//       leaders: [],
//       currentUser: {
//         userId: resolvedUserId,
//         fullName: "Вы",
//         avatar: "Y",
//         country: "",
//         city: "",
//         university: "",
//         points: 0,
//         completedTests: 0,
//         passedTests: 0,
//         failedTests: 0,
//         roadmapProgressPercent: 0,
//         badges: [],
//         rank: 0
//       }
//     }
//   }
// })
import { AxiosInstance } from "axios";

export const createLeaderboardService = (http: AxiosInstance) => {
  return {
    async getLeaderboard() {
      const { data } = await http.get("/leaderboard");
      return data;
    }
  };
};