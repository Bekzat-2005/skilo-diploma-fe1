import { ref } from "vue"
import { defineStore } from "pinia"

export interface TopicResult {
  score: number
  passed: boolean
  updatedAt: string
}

const TOPIC_RESULTS_KEY = "topic_test_results"

const parseResults = (): Record<string, TopicResult> => {
  const raw = localStorage.getItem(TOPIC_RESULTS_KEY)
  if (!raw) return {}

  try {
    return JSON.parse(raw) as Record<string, TopicResult>
  } catch {
    return {}
  }
}

export const useTopicProgressStore = defineStore("topic-progress", () => {
  const results = ref<Record<string, TopicResult>>(parseResults())

  const persist = () => {
    localStorage.setItem(TOPIC_RESULTS_KEY, JSON.stringify(results.value))
  }

  const setResult = (topicId: string, score: number, passed: boolean) => {
    results.value[topicId] = {
      score,
      passed,
      updatedAt: new Date().toISOString()
    }

    persist()
  }

  const getResult = (topicId: string): TopicResult | null => {
    return results.value[topicId] ?? null
  }

  return {
    results,
    setResult,
    getResult,
  
  }
})
