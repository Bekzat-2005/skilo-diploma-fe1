import {
  api,
  type CreateFriendChallengePayload,
  type FriendChallenge,
  type FriendChallengeNotification,
  type FriendProfile,
  type GlobalItMapResponse
} from "@/shared/api/client"

export const friendsApi = {
  getFriends(userId: number | null): Promise<FriendProfile[]> {
    return api.getFriends(userId)
  },
  getFriendSuggestions(userId: number | null): Promise<FriendProfile[]> {
    return api.getFriendSuggestions(userId)
  },
  getGlobalItMap(userId: number | null): Promise<GlobalItMapResponse> {
    return api.getGlobalItMap(userId)
  },
  addFriendByEmail(userId: number | null, email: string): Promise<FriendProfile[]> {
    return api.addFriendByEmail(userId, email)
  },
  removeFriend(userId: number | null, friendUserId: number): Promise<FriendProfile[]> {
    return api.removeFriend(userId, friendUserId)
  },
  getFriendChallenges(userId: number | null): Promise<FriendChallenge[]> {
    return api.getFriendChallenges(userId)
  },
  getFriendChallengeNotifications(userId: number | null): Promise<FriendChallengeNotification[]> {
    return api.getFriendChallengeNotifications(userId)
  },
  markFriendChallengeNotificationRead(userId: number | null, challengeId: string): Promise<void> {
    return api.markFriendChallengeNotificationRead(userId, challengeId)
  },
  createFriendChallenge(userId: number | null, payload: CreateFriendChallengePayload): Promise<FriendChallenge> {
    return api.createFriendChallenge(userId, payload)
  },
  // достар тізімінің соңына қосыңыз
  completeFriendChallenge(userId: number | null, challengeId: string, payload: any): Promise<void> {
    return api.completeFriendChallenge(userId, challengeId, payload)
  }
}

export type {
  CreateFriendChallengePayload,
  FriendChallenge,
  FriendChallengeNotification,
  FriendProfile,
  GlobalItMapResponse
}
