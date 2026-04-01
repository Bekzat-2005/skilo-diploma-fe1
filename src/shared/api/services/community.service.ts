import type { AxiosInstance } from "axios";

export const createCommunityService = (axios: AxiosInstance) => ({
  community: {
    getPosts: () => axios.get("/community").then((res) => res.data),
    createPost: (data: any) => axios.post("/community", data).then((res) => res.data),
    toggleLike: (postId: string) => axios.post(`/community/${postId}/like`).then((res) => res.data),
    addComment: (postId: string, data: any) => axios.post(`/community/${postId}/comments`, data).then((res) => res.data),
  },
});