import { ref, computed } from "vue"
import { defineStore } from "pinia"
import { api } from "@/shared/api/client";

export const useCommunityStore = defineStore("community", () => {
  const posts = ref<CommunityPost[]>([])
  const isLoading = ref(false)

  const publishedPosts = computed(() => {
  return posts.value
    .filter(post => post.moderationStatus === "approved")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

  // 1. Базадан барлық посттарды жүктеу
  const fetchPosts = async () => {
    isLoading.value = true
    try {
      posts.value = await api.community.getPosts()
    } catch (error) {
      console.error("Посттарды жүктеу қатесі:", error)
    } finally {
      isLoading.value = false
    }
  }

  // 2. Жаңа пост қосу
  const submitPost = async (payload: SubmitPostPayload) => {
    try {
      const newPost = await api.community.createPost(payload)
      posts.value.unshift(newPost) // Экраның ең басына қосады
      return newPost
    } catch (error) {
      console.error("Пост құру қатесі:", error)
      return null
    }
  }

  // 3. Лайк басу
  const toggleLike = async (postId: string, userId: number) => {
    const post = posts.value.find((item) => item.id === postId)
    if (!post) return

    // UI-да бірден өзгертіп қоямыз (Optimistic UI)
    const hasLiked = post.likedByUserIds.includes(userId)
    if (hasLiked) {
      post.likedByUserIds = post.likedByUserIds.filter((id) => id !== userId)
      post.likes = Math.max(0, post.likes - 1)
    } else {
      post.likedByUserIds.push(userId)
      post.likes += 1
    }

    // Бэкендке запрос жіберу
    try {
      await api.community.toggleLike(postId)
    } catch (error) {
      // Қате кетсе, лайкты кері қайтарамыз (error handling)
      console.error("Лайк басу қатесі:", error)
      await fetchPosts() 
    }
  }

  // 4. Комментарий қосу
  const addComment = async (postId: string, payload: Omit<CommunityComment, "id" | "createdAt">) => {
    try {
      const newComment = await api.community.addComment(postId, payload)
      const post = posts.value.find((item) => item.id === postId)
      if (post) {
        post.comments.push(newComment)
      }
    } catch (error) {
      console.error("Комментарий қосу қатесі:", error)
    }
  }

  return {
    posts,
    publishedPosts,
    isLoading,
    fetchPosts,
    submitPost,
    toggleLike,
    addComment,
  }
})