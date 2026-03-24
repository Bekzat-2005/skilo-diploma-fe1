// features/daily-tasks/store/dailyTasks.ts
import { computed, ref } from "vue"
import { defineStore } from "pinia"
import { axiosInstance } from "@/shared/api/client"

export const useDailyTasksStore = defineStore("daily-tasks", () => {
  const todayTasks = ref<any[]>([])
  const isLoading = ref(false)
  const completedTodayCount = computed(() => todayTasks.value.filter(t => t.completed).length)

  const todayTotalPoints = computed(() => 
    todayTasks.value.reduce((sum, t) => sum + t.points, 0)
  )

  const fetchTodayTasks = async () => {
    isLoading.value = true
    try {
      const response = await axiosInstance.get("/daily-tasks")
      todayTasks.value = response.data
    } catch (error) {
      console.error("Fetch error:", error)
      todayTasks.value = []
    } finally {
      isLoading.value = false
    }
  }

  const getTaskForNode = (nodeId: string) => {
    return todayTasks.value.find(t => t.nodeId === nodeId) || null
  }

  const ensureTodayTasks = fetchTodayTasks

  const globalTodayTask = computed(() => {
    return todayTasks.value.find((task) => task.roadmapId === "global") ?? null
  })

  const roadmapTodayTasks = computed(() => {
    return todayTasks.value.filter((task) => task.roadmapId !== "global")
  })

  const groupedTodayTasks = computed(() => {
    if (!roadmapTodayTasks.value.length) return {} // Егер дерек келмесе, бос объект қайтару маңызды
    
    return roadmapTodayTasks.value.reduce<Record<string, any[]>>((acc, task) => {
      if (!acc[task.roadmapId]) {
        acc[task.roadmapId] = []
      }
      acc[task.roadmapId].push(task)
      return acc
    }, {})
  })

  const pendingTodayCount = computed(() => todayTasks.value.filter(t => !t.completed).length)
  const earnedTodayPoints = computed(() => 
    todayTasks.value.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0)
  )

  const submitTaskAnswer = async (taskId: string, optionId: string) => {
    try {
      // Бэкендке жауапты жіберу
      await axiosInstance.post(`/daily-tasks/${taskId}/submit`, { optionId })
      
      // Егер запрос сәтті өтсе (200 OK), стордағы күйді жаңарту
      const task = todayTasks.value.find(t => t.id === taskId)
      if (task) {
        task.completed = true
        task.completedAt = new Date().toISOString()
      }
      return true // Дұрыс жауап
    } catch (error: any) {
      // Егер бэкенд 400 қайтарса (қате жауап), осы жерге түседі
      console.error("Submit error:", error.response?.data?.message || error.message)
      return false // Қате жауап немесе серверлік қате
    }
  }

  const getQuizForTask = (taskId: string) => {
    const task = todayTasks.value.find(t => t.id === taskId);
    const data = task?.quizData;
    
    if (!data) return null;

    // Егер бэкенд { questions: [...] } форматында массив жіберсе, 
    // сол массивтегі ең бірінші сұрақты аламыз
    if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
      return data.questions[0];
    }
    
    // Егер тікелей { question: "...", options: [...] } болса (fallback)
    return data.question ? data : null;
  }

  return {
    todayTasks,
    isLoading,
    globalTodayTask,
    roadmapTodayTasks,
    groupedTodayTasks,
    pendingTodayCount,
    earnedTodayPoints,
    completedTodayCount,
    todayTotalPoints,
    ensureTodayTasks,
    fetchTodayTasks,
    submitTaskAnswer,
    getQuizForTask,
    getTaskForNode
  }
})