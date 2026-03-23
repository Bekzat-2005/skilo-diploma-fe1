import { computed, ref } from "vue"
import { defineStore } from "pinia"
import { roadmapsApi, type RoadmapProgressItem } from "@/features/roadmaps/api/roadmaps.api"

// Типтер
export type RoadmapLevel = "Beginner" | "Intermediate" | "Advanced"
export interface Roadmap {
  id: string;
  title: string;
  description: string;
  level: string;
}

const ROADMAP_IDS_STORAGE_KEY = "user_roadmap_ids"
const ROADMAP_LEVELS_STORAGE_KEY = "user_roadmap_levels"

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

export const useRoadmapsStore = defineStore("roadmaps", () => {
  const allRoadmaps = ref<Roadmap[]>([])
  const allRoadmapsLoaded = ref(false)

  const userRoadmapIds = ref<string[]>([])
  const userRoadmapLevels = ref<Record<string, RoadmapLevel>>(
    parseJson<Record<string, RoadmapLevel>>(localStorage.getItem(ROADMAP_LEVELS_STORAGE_KEY), {})
  )

  const roadmapProgress = ref<Record<string, RoadmapProgressItem>>({})
  const progressLoaded = ref(false)
  const collectionLoaded = ref(false)

  const persist = () => {
    localStorage.setItem(ROADMAP_IDS_STORAGE_KEY, JSON.stringify(userRoadmapIds.value))
    localStorage.setItem(ROADMAP_LEVELS_STORAGE_KEY, JSON.stringify(userRoadmapLevels.value))
  }

  const loadAllRoadmaps = async () => {
    if (allRoadmapsLoaded.value) return;
    try {
      allRoadmaps.value = await roadmapsApi.getRoadmaps();
      allRoadmapsLoaded.value = true;
    } catch (e) {
      console.error("Roadmaps load error:", e);
    }
  }

  const loadUserProgress = async () => {
    try {
      const progressData = await roadmapsApi.getRoadmapProgress();
      console.log("Бэкендтен келген шикі прогресс деректері:", progressData); // ОСЫНЫ ҚОСЫҢЫЗ
      
      // Егер progressData массив болса, оны объектке айналдыру керек болуы мүмкін
      if (Array.isArray(progressData)) {
        const progressMap: Record<string, RoadmapProgressItem> = {};
        progressData.forEach(item => {
          progressMap[item.roadmapId] = item;
        });
        roadmapProgress.value = progressMap;
      } else {
        roadmapProgress.value = progressData;
      }
      
      console.log("Сторға сақталған прогресс (roadmapProgress):", roadmapProgress.value);
    } catch (e) {
      console.error("Progress load error:", e);
    }
  }

  const loadUserRoadmapCollection = async (userId: number | null) => {
    const roadmapIds = await roadmapsApi.getUserRoadmapCollection(userId)
    userRoadmapIds.value = [...new Set(roadmapIds)]
    collectionLoaded.value = true
    persist()
  }

  const addRoadmapWithLevel = async (roadmapId: string, level: RoadmapLevel, userId: number | null) => {
    const nextCollection = userRoadmapIds.value.includes(roadmapId)
      ? userRoadmapIds.value
      : [...userRoadmapIds.value, roadmapId]

    const savedCollection = await roadmapsApi.updateUserRoadmapCollection(userId, nextCollection)
    userRoadmapIds.value = savedCollection;
    userRoadmapLevels.value[roadmapId] = level
    persist()
  }

  const removeRoadmapFromCollection = async (roadmapId: string, userId: number | null) => {
    try {
      await roadmapsApi.removeUserRoadmap(roadmapId);

      userRoadmapIds.value = userRoadmapIds.value.filter((id) => id !== roadmapId);
      
      if (userRoadmapLevels.value[roadmapId]) {
        delete userRoadmapLevels.value[roadmapId];
      }

      persist();
      await loadUserProgress();

    } catch (error) {
      alert("Өшіру мүмкін болмады, сервермен байланысты тексеріңіз");
    }
  };

  const getRoadmapLevel = (roadmapId: string): RoadmapLevel | null => {
    return userRoadmapLevels.value[roadmapId] ?? null
  }

  const getRoadmapProgress = (roadmapId: string): RoadmapProgressItem | null => {
    return roadmapProgress.value[roadmapId] ?? null
  }

  const myRoadmaps = computed(() =>
    allRoadmaps.value.filter((roadmap) => userRoadmapIds.value.includes(roadmap.id))
  )

  const availableRoadmaps = computed(() =>
    allRoadmaps.value.filter((roadmap) => !userRoadmapIds.value.includes(roadmap.id))
  )
  

  return {
    allRoadmaps,
    userRoadmapIds,
    userRoadmapLevels,
    roadmapProgress,
    myRoadmaps,
    availableRoadmaps,
    loadUserProgress,
    loadAllRoadmaps,
    loadUserRoadmapCollection,
    addRoadmapWithLevel,
    removeRoadmapFromCollection,
    getRoadmapLevel,
    getRoadmapProgress
  }
})