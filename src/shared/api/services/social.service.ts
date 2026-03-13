// src/shared/api/services/social.service.ts
import type { AxiosInstance } from "axios";
import type {
  CreateFriendChallengePayload,
  FriendChallenge,
  FriendChallengeNotification,
  FriendProfile,
  GlobalItMapResponse
} from "../types";

export const createSocialService = (axios: AxiosInstance) => ({
  async getFriends(userId: number | null): Promise<FriendProfile[]> {
    const res = await axios.get("/friends");
    return res.data;
  },

  async getFriendSuggestions(userId: number | null): Promise<FriendProfile[]> {
    const res = await axios.get("/friends/suggestions");
    return res.data;
  },

  async addFriendByEmail(userId: number | null, email: string): Promise<FriendProfile[]> {
    const res = await axios.post("/friends/add", { email });
    return res.data;
  },

  async removeFriend(userId: number | null, friendUserId: number): Promise<FriendProfile[]> {
    const res = await axios.delete(`/friends/${friendUserId}`);
    return res.data;
  },

  async getGlobalItMap(userId: number | null): Promise<GlobalItMapResponse> {
    const res = await axios.get("/friends/map");
    return res.data;
  },

  async getFriendChallenges(userId: number | null): Promise<FriendChallenge[]> {
    const res = await axios.get("/friends/challenges");
    return res.data;
  },

  async createFriendChallenge(userId: number | null, payload: CreateFriendChallengePayload): Promise<FriendChallenge> {
    const res = await axios.post("/friends/challenges", payload);
    return res.data;
  },

  async getFriendChallengeNotifications(userId: number | null): Promise<FriendChallengeNotification[]> {
    const res = await axios.get("/friends/challenges/notifications");
    return res.data;
  },

  async markFriendChallengeNotificationRead(userId: number | null, challengeId: string): Promise<void> {
    await axios.patch(`/friends/challenges/${challengeId}/read`);
  },

  async completeFriendChallenge(userId: number | null, challengeId: string, payload: any): Promise<void> {
    await axios.post(`/friends/challenges/complete`, payload);
  }
});