import { axiosInstance } from "@/shared/api/client"

export const roadmapsApi = {

  async getAssessment(roadmapId: string) {
    const { data } = await axiosInstance.get(`/roadmaps/${roadmapId}/assessment`)
    return data
  },

  async submitAssessment(roadmapId: string, answers: any) {
    const { data } = await axiosInstance.post(`/roadmaps/${roadmapId}/assessment/submit`, {
      answers
    })
    return data
  },

 async getUserRoadmapCollection() {
  const { data } = await axiosInstance.get("/roadmaps/collection")
  return data
},
async updateUserRoadmapCollection(userId: number | null, roadmapIds: string[]) {
  const { data } = await axiosInstance.post(`/roadmaps/collection`, {
    roadmapIds
  })
  return data
},

  async getRoadmapProgress(userId: number | null) {
    const { data } = await axiosInstance.get(`/roadmaps/progress`)
    return data
  },

async completeOnboarding() {
  const { data } = await axiosInstance.post("/roadmaps/onboarding/complete")
  return data
},
async getRoadmapTree() {
  const { data } = await axiosInstance.get("/roadmaps/tree")
  return data
}
}