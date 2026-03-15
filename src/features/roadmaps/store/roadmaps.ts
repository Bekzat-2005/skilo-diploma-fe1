import { computed, ref } from "vue"
import { defineStore } from "pinia"
import { mockRoadmaps, mockRoadmapTrees, mockUserCollection, type RoadmapLevel, type RoadmapNode } from "@/shared/mocks/mockRoadmaps"
import { roadmapsApi, type RoadmapProgressItem } from "@/features/roadmaps/api/roadmaps.api"

const ROADMAP_IDS_STORAGE_KEY = "user_roadmap_ids"
const ROADMAP_LEVELS_STORAGE_KEY = "user_roadmap_levels"
const ROADMAP_PROGRESS_STORAGE_KEY = "user_roadmap_progress"

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export const useRoadmapsStore = defineStore("roadmaps", () => {

const userRoadmapIds = ref<string[]>([])
  const userRoadmapLevels = ref<Record<string, RoadmapLevel>>(
    parseJson<Record<string, RoadmapLevel>>(localStorage.getItem(ROADMAP_LEVELS_STORAGE_KEY), {})
  )

  const roadmapProgress = ref<Record<string, RoadmapProgressItem>>(
    parseJson<Record<string, RoadmapProgressItem>>(localStorage.getItem(ROADMAP_PROGRESS_STORAGE_KEY), {})
  )

  const progressLoaded = ref(false)
  const collectionLoaded = ref(false)

  const countLeafTopics = (nodes: RoadmapNode[] | undefined): number => {
    if (!nodes?.length) return 0

    return nodes.reduce((sum, node) => {
      if (node.children?.length) {
        return sum + countLeafTopics(node.children)
      }

      return sum + 1
    }, 0)
  }

  const persist = () => {
    localStorage.setItem(ROADMAP_IDS_STORAGE_KEY, JSON.stringify(userRoadmapIds.value))
    localStorage.setItem(ROADMAP_LEVELS_STORAGE_KEY, JSON.stringify(userRoadmapLevels.value))
    localStorage.setItem(ROADMAP_PROGRESS_STORAGE_KEY, JSON.stringify(roadmapProgress.value))
  }

  const setRoadmapProgress = (items: RoadmapProgressItem[]) => {
    const mapped = items.reduce<Record<string, RoadmapProgressItem>>((acc, item) => {
      acc[item.roadmapId] = item
      return acc
    }, {})

    roadmapProgress.value = {
      ...roadmapProgress.value,
      ...mapped
    }

    progressLoaded.value = true
    persist()
  }

const setUserRoadmapCollection = (roadmapIds: string[]) => {

  userRoadmapIds.value = [...new Set(roadmapIds)]
  collectionLoaded.value = true
  persist()
}

  const loadUserRoadmapCollection = async (userId: number | null) => {
   

    const roadmapIds = await roadmapsApi.getUserRoadmapCollection(userId)
    setUserRoadmapCollection(roadmapIds)
  }

  const loadRoadmapProgress = async (userId: number | null) => {
    if (progressLoaded.value) return

    const items = await roadmapsApi.getRoadmapProgress(userId)
    setRoadmapProgress(items)
  }

  const isInCollection = (roadmapId: string) => userRoadmapIds.value.includes(roadmapId)

  const addRoadmapWithLevel = async (roadmapId: string, level: RoadmapLevel, userId: number | null) => {
    const nextCollection = isInCollection(roadmapId)
      ? userRoadmapIds.value
      : [...userRoadmapIds.value, roadmapId]

    const savedCollection = await roadmapsApi.updateUserRoadmapCollection(userId, nextCollection)
    setUserRoadmapCollection(savedCollection)

    userRoadmapLevels.value[roadmapId] = level

    if (!roadmapProgress.value[roadmapId]) {
      const totalTopics = countLeafTopics(mockRoadmapTrees[roadmapId])
      roadmapProgress.value[roadmapId] = {
        roadmapId,
        completionPercent: 0,
        completedTopics: 0,
        totalTopics
      }
    }

    persist()
  }

  const removeRoadmapFromCollection = async (roadmapId: string, userId: number | null) => {
    const prevCollection = [...userRoadmapIds.value]
    const prevLevels = { ...userRoadmapLevels.value }
    const prevProgress = { ...roadmapProgress.value }

    const nextCollection = prevCollection.filter((id) => id !== roadmapId)
    setUserRoadmapCollection(nextCollection)
    delete userRoadmapLevels.value[roadmapId]
    delete roadmapProgress.value[roadmapId]
    persist()

    try {
      const savedCollection = await roadmapsApi.removeUserRoadmapFromCollection(userId, roadmapId)
      setUserRoadmapCollection(savedCollection)
      persist()
    } catch (error) {
      userRoadmapIds.value = prevCollection
      userRoadmapLevels.value = prevLevels
      roadmapProgress.value = prevProgress
      persist()
      throw error
    }
  }

  const getRoadmapLevel = (roadmapId: string): RoadmapLevel | null => {
    return userRoadmapLevels.value[roadmapId] ?? null
  }

  const getRoadmapProgress = (roadmapId: string): RoadmapProgressItem | null => {
    return roadmapProgress.value[roadmapId] ?? null
  }

  const myRoadmaps = computed(() =>
    mockRoadmaps.filter((roadmap) => userRoadmapIds.value.includes(roadmap.id))
  )

  const availableRoadmaps = computed(() =>
    mockRoadmaps.filter((roadmap) => !userRoadmapIds.value.includes(roadmap.id))
  )

  return {
    userRoadmapIds,
    userRoadmapLevels,
    roadmapProgress,
    progressLoaded,
    collectionLoaded,
    myRoadmaps,
    availableRoadmaps,
    isInCollection,
    setUserRoadmapCollection,
    loadUserRoadmapCollection,
    setRoadmapProgress,
    loadRoadmapProgress,
    addRoadmapWithLevel,
    removeRoadmapFromCollection,
    getRoadmapLevel,
    getRoadmapProgress
  }
})
