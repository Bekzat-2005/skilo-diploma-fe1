<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { useRoadmapsStore } from "@/features/roadmaps/store/roadmaps"
import { useAuthStore } from "@/features/auth/store/auth"
import { useDailyTasksStore } from "@/features/daily-tasks/store/dailyTasks"




interface CustomRoadmapDraft {
  id: string
  title: string
  goal: string
  directionIds: string[]
  generationMode: "single" | "multiple"
  milestones: string[]
  createdAt: string
}

const router = useRouter()
const roadmapsStore = useRoadmapsStore()
const authStore = useAuthStore()
const dailyTasksStore = useDailyTasksStore()
const removingRoadmapId = ref<string | null>(null)
const aiLoading = ref(false)
const aiError = ref<string | null>(null)
const generatedTracks = ref<CustomRoadmapDraft[]>([])
const customTracks = ref<CustomRoadmapDraft[]>([])
const CUSTOM_TRACKS_STORAGE_KEY = "custom_ai_tracks"

const aiForm = ref({
  title: "",
  goal: "",
  interests: "",
  selectedDirectionIds: [] as string[],
  generationMode: "single" as "single" | "multiple"
})



const myRoadmaps = computed(() => roadmapsStore.myRoadmaps)
const availableRoadmaps = computed(() => roadmapsStore.availableRoadmaps)
const allRoadmaps = computed(() => [...myRoadmaps.value, ...availableRoadmaps.value])
const completedRoadmaps = computed(() => {
  return myRoadmaps.value.filter((roadmap) => getProgressPercent(roadmap.id) >= 100).length
})

const roadmapTitlesMap = computed(() => {
  return allRoadmaps.value.reduce<Record<string, string>>((acc, roadmap) => {
    acc[roadmap.id] = roadmap.title
    return acc
  }, {})
})

const relatedDirectionsByRoadmap: Record<string, string[]> = {
  ai: ["backend", "devops", "frontend"],
  frontend: ["backend", "mobile", "ai"],
  backend: ["devops", "ai", "frontend"],
  devops: ["backend", "ai", "frontend"],
  mobile: ["frontend", "backend", "ai"]
}

const compatibilityByPair: Record<string, number> = {
  "ai:backend": 88,
  "ai:frontend": 72,
  "ai:devops": 80,
  "ai:mobile": 58,
  "backend:frontend": 92,
  "backend:devops": 94,
  "backend:mobile": 64,
  "frontend:devops": 66,
  "frontend:mobile": 86,
  "devops:mobile": 49
}

const pairKey = (first: string, second: string) => {
  return [first, second].sort().join(":")
}

const selectedDirections = computed(() => {
  return aiForm.value.selectedDirectionIds
    .map((id) => allRoadmaps.value.find((roadmap) => roadmap.id === id))
    .filter((item): item is (typeof allRoadmaps.value)[number] => Boolean(item))
})

const compatibilityPairs = computed(() => {
  const ids = aiForm.value.selectedDirectionIds
  const pairs: Array<{ ids: [string, string]; score: number }> = []

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = pairKey(ids[i], ids[j])
      pairs.push({
        ids: [ids[i], ids[j]],
        score: compatibilityByPair[key] ?? 56
      })
    }
  }

  return pairs
})

const compatibilityPercent = computed(() => {
  if (compatibilityPairs.value.length === 0) return 100
  const total = compatibilityPairs.value.reduce((sum, pair) => sum + pair.score, 0)
  return Math.round(total / compatibilityPairs.value.length)
})

const weakCompatibilityPairs = computed(() => {
  return compatibilityPairs.value
    .filter((pair) => pair.score < 60)
    .map((pair) => {
      const first = roadmapTitlesMap.value[pair.ids[0]] ?? pair.ids[0]
      const second = roadmapTitlesMap.value[pair.ids[1]] ?? pair.ids[1]
      return `${first} + ${second}`
    })
})

const relatedSuggestions = computed(() => {
  const ownDirections = myRoadmaps.value.map((roadmap) => roadmap.id)
  const selected = aiForm.value.selectedDirectionIds
  const fromSelected = selected.flatMap((id) => relatedDirectionsByRoadmap[id] ?? [])
  const fromOwn = ownDirections.flatMap((id) => relatedDirectionsByRoadmap[id] ?? [])
  const merged = [...fromSelected, ...fromOwn]
  const filtered = merged.filter((id, index) => merged.indexOf(id) === index)

  return filtered
    .map((id) => allRoadmaps.value.find((roadmap) => roadmap.id === id))
    .filter((item): item is (typeof allRoadmaps.value)[number] => Boolean(item))
    .filter((item) => !selected.includes(item.id))
    .slice(0, 4)
})

const openRoadmap = (id: string) => {
  router.push(`/roadmaps/${id}`)
}

const startAssessment = (id: string) => {
  router.push(`/roadmaps/${id}/assessment`)
}

const getAssignedLevel = (id: string, fallback: string) => {
  return roadmapsStore.getRoadmapLevel(id) ?? fallback
}

const getLevelClass = (level: string) => {
  const normalized = level.toLowerCase()

  if (normalized === "beginner") return "level-beginner"
  if (normalized === "intermediate") return "level-intermediate"
  if (normalized === "advanced") return "level-advanced"

  return ""
}

const getRoadmapProgress = (roadmapId: string) => {
  return roadmapsStore.getRoadmapProgress(roadmapId)
}

const getProgressPercent = (roadmapId: string) => {
  return getRoadmapProgress(roadmapId)?.completionPercent ?? 0
}

const getProgressMeta = (roadmapId: string) => {
  const progress = getRoadmapProgress(roadmapId)
  if (!progress) return "0/0 тем"

  return `${progress.completedTopics}/${progress.totalTopics} тем`
}

const dailyTasksSummary = computed(() => {
  return {
    pending: dailyTasksStore.pendingTodayCount,
    earned: dailyTasksStore.earnedTodayPoints,
    total: dailyTasksStore.todayTotalPoints
  }
})

onMounted(async () => {
  const userId = authStore.user?.id ?? null
  await roadmapsStore.loadUserRoadmapCollection(userId)
})
const removeRoadmap = async (roadmapId: string) => {
  removingRoadmapId.value = roadmapId
  await roadmapsStore.removeRoadmapFromCollection(roadmapId, authStore.user?.id ?? null)
  removingRoadmapId.value = null
}

const persistCustomTracks = () => {
  localStorage.setItem(CUSTOM_TRACKS_STORAGE_KEY, JSON.stringify(customTracks.value))
}

const isDirectionSelected = (roadmapId: string) => {
  return aiForm.value.selectedDirectionIds.includes(roadmapId)
}

const toggleDirection = (roadmapId: string) => {
  if (isDirectionSelected(roadmapId)) {
    aiForm.value.selectedDirectionIds = aiForm.value.selectedDirectionIds.filter((id) => id !== roadmapId)
    return
  }

  aiForm.value.selectedDirectionIds = [...aiForm.value.selectedDirectionIds, roadmapId]
}

const splitInterests = (value: string) => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

const generateCustomTrack = async () => {
  aiError.value = null
  generatedTracks.value = []

  if (!aiForm.value.title.trim() || !aiForm.value.goal.trim() || aiForm.value.selectedDirectionIds.length === 0) {
    aiError.value = "Заполните название, цель и выберите хотя бы одно направление."
    return
  }

  aiLoading.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 650))

    const interests = splitInterests(aiForm.value.interests)
    const selectedTitles = selectedDirections.value.map((item) => item.title)

    if (aiForm.value.generationMode === "single") {
      const milestones = [
        `Собранная база направлений: ${selectedTitles.join(" + ")}`,
        "Кросс-доменная практика: проекты, объединяющие выбранные направления",
        interests.length
          ? `Фокус интересов: ${interests.join(", ")}`
          : "Фокус интересов: практика, тесты, интервью",
        weakCompatibilityPairs.value.length
          ? `Проверьте слабые связки: ${weakCompatibilityPairs.value.join("; ")}`
          : "Связки направлений совместимы и формируют единый трек"
      ]

      const track: CustomRoadmapDraft = {
        id: `custom-${Date.now()}`,
        title: aiForm.value.title.trim(),
        goal: aiForm.value.goal.trim(),
        directionIds: [...aiForm.value.selectedDirectionIds],
        generationMode: "single",
        milestones,
        createdAt: new Date().toISOString()
      }

      generatedTracks.value = [track]
      customTracks.value = [track, ...customTracks.value]
    } else {
      const tracks = selectedDirections.value.map((direction, index) => {
        const milestones = [
          `База по направлению: ${direction.title}`,
          "Практика ключевых тем и выполнение тестов",
          interests.length
            ? `Доп. интересы: ${interests.join(", ")}`
            : "Доп. фокус: интервью и прикладные задачи",
          "Сравнение прогресса с другими выбранными направлениями"
        ]

        return {
          id: `custom-${Date.now()}-${index}`,
          title: `${aiForm.value.title.trim()} · ${direction.title}`,
          goal: aiForm.value.goal.trim(),
          directionIds: [direction.id],
          generationMode: "multiple" as const,
          milestones,
          createdAt: new Date().toISOString()
        }
      })

      generatedTracks.value = tracks
      customTracks.value = [...tracks, ...customTracks.value]
    }

    persistCustomTracks()
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <div class="page">
    <section class="roadmaps-page-head">
      <div class="roadmaps-head-main">
        <p class="roadmaps-head-kicker">Раздел дорожных карт</p>
        <h1>Ваши направления и персональные треки</h1>
        <p>
          Здесь только работа с дорожными картами: выбор направлений, AI-конструктор трека и отслеживание прогресса.
        </p>
      </div>
      <div class="roadmaps-head-stats">
        <article>
          <strong>{{ myRoadmaps.length }}</strong>
          <span>Мои направления</span>
        </article>
        <article>
          <strong>{{ availableRoadmaps.length }}</strong>
          <span>Доступно</span>
        </article>
        <article>
          <strong>{{ completedRoadmaps }}</strong>
          <span>Завершено</span>
        </article>
        <article>
          <strong>{{ dailyTasksSummary.pending }}</strong>
          <span>Задач сегодня</span>
        </article>
      </div>
    </section>

    <section class="flow-note info-flow">
      <p>Лучший темп для роста: небольшой, но регулярный прогресс по треку каждый день.</p>
      <p>Фокусируйтесь на 1–2 направлениях одновременно, чтобы быстрее видеть реальный результат в навыках.</p>
    </section>

    <!-- ── My roadmaps ── -->
    <section class="roadmaps-section">
      <div class="section-head">
        <span class="section-label">AI-конструктор дорожки</span>
        <span class="section-count badge">Новая функция</span>
      </div>

      <div class="builder-card">
        <div class="builder-layout">
          <div class="builder-main-column">
            <div class="builder-block">
              <p class="builder-block-title">Базовые параметры трека</p>

              <div class="builder-stack">
                <label class="builder-label">
                  Название вашей дорожки
                  <input v-model="aiForm.title" type="text" placeholder="Например: Fullstack + AI для карьерного роста" />
                </label>

                <label class="builder-label">
                  Цель пользователя
                  <textarea
                    v-model="aiForm.goal"
                    rows="3"
                    placeholder="Например: устроиться на Junior/Middle роль за 6 месяцев и собрать сильное портфолио"
                  />
                </label>

                <label class="builder-label">
                  Интересы (через запятую)
                  <input
                    v-model="aiForm.interests"
                    type="text"
                    placeholder="Например: архитектура, микросервисы, алгоритмы, system design"
                  />
                </label>
              </div>
            </div>
          </div>

          <aside class="builder-side-column">
            <div class="builder-block">
              <p class="builder-block-title">Режим генерации</p>
              <div class="mode-switch">
                <button
                  type="button"
                  class="btn btn--ghost"
                  :class="{ 'mode-active': aiForm.generationMode === 'single' }"
                  :aria-pressed="aiForm.generationMode === 'single'"
                  @click="aiForm.generationMode = 'single'"
                >
                  Один большой трек
                </button>
                <button
                  type="button"
                  class="btn btn--ghost"
                  :class="{ 'mode-active': aiForm.generationMode === 'multiple' }"
                  :aria-pressed="aiForm.generationMode === 'multiple'"
                  @click="aiForm.generationMode = 'multiple'"
                >
                  Несколько треков
                </button>
              </div>
              <span class="mode-selected">
                Выбран режим:
                <strong>{{ aiForm.generationMode === "single" ? "Один большой трек" : "Несколько треков" }}</strong>
              </span>
            </div>

            <div class="builder-block">
              <p class="builder-block-title">Направления</p>
              <div class="direction-pills">
                <button
                  v-for="roadmap in allRoadmaps"
                  :key="roadmap.id"
                  type="button"
                  class="direction-pill"
                  :class="{ active: isDirectionSelected(roadmap.id) }"
                  @click="toggleDirection(roadmap.id)"
                >
                  {{ roadmap.title }}
                </button>
              </div>
              <p class="builder-meta builder-meta--selected">
                Выбрано: {{ aiForm.selectedDirectionIds.length }} из {{ allRoadmaps.length }}
              </p>
              <div v-if="selectedDirections.length" class="selected-directions">
                <span v-for="direction in selectedDirections" :key="`selected-${direction.id}`">
                  {{ direction.title }}
                </span>
              </div>
            </div>

            <div class="builder-block builder-ai-hint">
              <p class="section-label">AI-рекомендации по связанным направлениям</p>
              <div class="tags">
                <span v-for="item in relatedSuggestions" :key="item.id">{{ item.title }}</span>
                <span v-if="!relatedSuggestions.length">Выберите направление, чтобы получить рекомендации</span>
              </div>
              <div class="compatibility-block">
                <div class="progress-head">
                  <span class="section-label" style="margin: 0;">Совместимость выбранных направлений</span>
                  <span class="badge">{{ compatibilityPercent }}%</span>
                </div>
                <div class="progress-track">
                  <span class="progress-fill" :style="{ width: `${compatibilityPercent}%` }" />
                </div>
                <p v-if="weakCompatibilityPairs.length" class="builder-warning">
                  Слабая связка: {{ weakCompatibilityPairs.join(", ") }}. Лучше генерировать в режиме "Несколько треков".
                </p>
              </div>
              <p class="builder-meta">
                Рекомендации и совместимость пересчитываются по мере выбора направлений.
              </p>
            </div>

            <p v-if="aiError" class="builder-error">{{ aiError }}</p>

            <div class="actions-row actions-row--builder">
              <button class="btn btn--primary" :disabled="aiLoading" @click="generateCustomTrack">
                {{ aiLoading ? "Генерация..." : "Собрать дорожку через AI" }}
              </button>
            </div>
          </aside>
        </div>
      </div>

      <div v-if="generatedTracks.length" class="generated-output">
        <p class="section-label">Сгенерированные треки</p>
        <div class="generated-grid">
          <div v-for="generatedTrack in generatedTracks" :key="generatedTrack.id" class="generated-card">
            <div class="generated-head">
              <h3>{{ generatedTrack.title }}</h3>
              <span class="badge">Создано</span>
            </div>
            <p class="roadmap-desc">{{ generatedTrack.goal }}</p>
            <p class="builder-meta">
              Направления: {{ generatedTrack.directionIds.map((id) => roadmapTitlesMap[id] ?? id).join(", ") }}
            </p>
            <ul class="milestones-list">
              <li v-for="item in generatedTrack.milestones" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="customTracks.length > 0" class="saved-tracks">
        <p class="section-label">Собранные пользовательские дорожки</p>
        <div class="saved-track-grid">
          <article v-for="track in customTracks" :key="track.id" class="saved-track-card">
            <h4>{{ track.title }}</h4>
            <p>{{ track.goal }}</p>
            <span class="badge">{{ new Date(track.createdAt).toLocaleDateString() }}</span>
          </article>
        </div>
      </div>
    </section>

    <!-- ── My roadmaps ── -->
    <section class="roadmaps-section">
      <div class="section-head">
        <span class="section-label">Мои дорожные карты</span>
        <span class="section-count badge">{{ myRoadmaps.length }}</span>
      </div>

      <div v-if="myRoadmaps.length === 0" class="empty-card">
        У вас пока нет дорожных карт. Добавьте направление ниже.
      </div>

      <div class="roadmaps-grid">
        <div
          v-for="roadmap in myRoadmaps"
          :key="roadmap.id"
          class="roadmap-card"
          :class="getLevelClass(getAssignedLevel(roadmap.id, roadmap.level))"
        >
          <div class="roadmap-card-body">
            <div class="roadmap-card-top">
              <span class="level-badge" :class="getLevelClass(getAssignedLevel(roadmap.id, roadmap.level))">
                {{ getAssignedLevel(roadmap.id, roadmap.level) }}
              </span>
            </div>
            <h3 class="roadmap-title">{{ roadmap.title }}</h3>
            <p class="roadmap-desc">{{ roadmap.description }}</p>

            <div class="progress-block">
              <div class="progress-head">
                <span class="section-label" style="margin: 0;">Прогресс</span>
                <span class="badge">{{ getProgressPercent(roadmap.id) }}%</span>
              </div>
              <div class="progress-track">
                <span class="progress-fill" :style="{ width: `${getProgressPercent(roadmap.id)}%` }" />
              </div>
              <p class="progress-meta">{{ getProgressMeta(roadmap.id) }}</p>
            </div>
          </div>

          <div class="actions-row">
            <button class="btn btn--primary" @click="openRoadmap(roadmap.id)">Открыть карту</button>
            <button
              class="btn btn--ghost"
              :disabled="removingRoadmapId === roadmap.id"
              @click="removeRoadmap(roadmap.id)"
            >
              {{ removingRoadmapId === roadmap.id ? "Удаление..." : "Удалить" }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Available roadmaps ── -->
    <section class="roadmaps-section">
      <div class="section-head">
        <span class="section-label">Добавить направление</span>
        <span class="section-count badge">{{ availableRoadmaps.length }}</span>
      </div>

      <div v-if="availableRoadmaps.length === 0" class="empty-card">
        Все доступные направления уже добавлены в вашу коллекцию.
      </div>

      <div class="roadmaps-grid">
        <div
          v-for="roadmap in availableRoadmaps"
          :key="roadmap.id"
          class="roadmap-card"
          :class="getLevelClass(roadmap.level)"
        >
          <div class="roadmap-card-body">
            <div class="roadmap-card-top">
              <span class="level-badge" :class="getLevelClass(roadmap.level)">
                {{ roadmap.level }}
              </span>
            </div>
            <h3 class="roadmap-title">{{ roadmap.title }}</h3>
            <p class="roadmap-desc">{{ roadmap.description }}</p>
          </div>

          <div class="actions-row">
            <button class="btn btn--primary" @click="startAssessment(roadmap.id)">Пройти оценку</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── Reset & Base ── */
.page {
  font-family: inherit;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.roadmaps-page-head {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 18px;
  display: grid;
  gap: 14px;
}

.roadmaps-head-main {
  display: grid;
  gap: 8px;
  max-width: 74ch;
}

.roadmaps-head-kicker {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.11em;
}

.roadmaps-head-main h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(24px, 3.5vw, 36px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.roadmaps-head-main p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.roadmaps-head-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.roadmaps-head-stats article {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 10px;
  display: grid;
  gap: 4px;
}

.roadmaps-head-stats strong {
  color: var(--text);
  font-size: 20px;
  line-height: 1;
}

.roadmaps-head-stats span {
  color: var(--muted);
  font-size: 12px;
}

.flow-note {
  padding: 2px 2px 0;
}

/* ── Intro Card ── */
.intro-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.intro-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.intro-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0 0 8px;
  line-height: 1.2;
}

.intro-desc {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
  max-width: 480px;
  line-height: 1.6;
}

.daily-strip {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: linear-gradient(135deg, var(--surface-soft) 0%, var(--surface) 100%);
  padding: 10px 12px;
}

.daily-strip-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}

.daily-strip-meta {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text);
  line-height: 1.4;
}

/* ── Stats ── */
.stats-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 20px;
  background: var(--surface-soft);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}

/* ── Feature Grid ── */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.feature-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: var(--surface-soft);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.feature-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(10, 10, 10, 0.07);
}

.visual-story-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.visual-story-item {
  display: grid;
  gap: 10px;
  animation: visual-in 0.7s ease forwards;
  animation-delay: var(--visual-delay, 0ms);
  opacity: 0;
  transform: translateY(10px);
}

.visual-story-item img {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  object-fit: cover;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  animation: visual-float 6s ease-in-out infinite;
}

.visual-story-item:nth-child(2) img {
  animation-delay: 0.3s;
}

.visual-story-item:nth-child(3) img {
  animation-delay: 0.6s;
}

.visual-story-copy {
  display: grid;
  gap: 4px;
}

.visual-story-copy h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
  color: var(--text);
}

.visual-story-copy p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}

.text-bridge {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;
  padding: 2px 0;
}

.text-bridge-lead {
  margin: 0;
  max-width: 34ch;
  font-size: clamp(24px, 3.8vw, 42px);
  line-height: 1.06;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: color-mix(in srgb, var(--text) 82%, var(--primary) 18%);
}

.text-bridge-sub {
  margin: 0;
  max-width: 56ch;
  font-size: 15px;
  line-height: 1.6;
  color: var(--muted);
}

.text-bridge--progress .text-bridge-lead {
  color: color-mix(in srgb, var(--text) 80%, #4f7ae8 20%);
}

.text-bridge--expand .text-bridge-lead {
  color: color-mix(in srgb, var(--text) 78%, #ff8e3c 22%);
}

/* ── Company Promo ── */
.company-promo {
  display: grid;
  gap: 16px;
}

.company-promo-head {
  display: grid;
  gap: 8px;
  text-align: center;
}

.company-promo-kicker {
  display: inline-flex;
  justify-self: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 5px 12px;
}

.company-promo-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
}

.company-value-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.company-value-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 18px;
  display: grid;
  gap: 8px;
}

.company-value-metric {
  display: inline-flex;
  align-self: start;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--primary) 55%, var(--surface));
  background: color-mix(in srgb, var(--primary) 18%, var(--surface));
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}

.company-value-card h3,
.company-why-card h3 {
  margin: 0;
  font-size: 17px;
  color: var(--text);
}

.company-value-card p,
.company-about-content p,
.company-why-card p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
}

.company-about {
  grid-template-columns: 1.2fr 0.8fr;
  align-items: stretch;
}

.company-about-content {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 20px;
  display: grid;
  gap: 10px;
}

.company-about-content .company-promo-kicker {
  justify-self: start;
}

.company-about-stats {
  display: grid;
  gap: 10px;
}

.company-about-stat {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 16px;
  display: grid;
  gap: 6px;
}

.company-about-stat strong {
  font-size: 26px;
  line-height: 1;
  color: var(--text);
}

.company-about-stat span {
  color: var(--muted);
  font-size: 14px;
}

.company-why-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.company-why-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 16px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: start;
}

.company-why-icon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  background: color-mix(in srgb, var(--primary) 35%, var(--surface-soft));
}

.feature-icon {
  font-size: 18px;
  display: block;
  margin-bottom: 8px;
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 6px;
}

.feature-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* ── Section ── */
.roadmaps-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.section-count {
  /* inherits .badge */
}

/* ── Badge / pill ── */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 2px 10px;
}

/* ── Level Badge ── */
.level-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 100px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--muted);
}

.level-badge.level-beginner {
  background: var(--surface-soft);
  color: var(--muted);
  border-color: var(--border);
}

.level-badge.level-intermediate {
  background: var(--surface-soft);
  color: var(--text);
  border-color: var(--border);
}

.level-badge.level-advanced {
  background: var(--primary);
  color: #fff;
  border-color: var(--text);
}

/* ── Empty Card ── */
.empty-card {
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 24px;
  color: var(--muted);
  font-size: 14px;
  background: var(--surface-soft);
}

.builder-card {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: 18px;
  padding: 20px;
  background:
    radial-gradient(460px 190px at -5% -20%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 72%),
    radial-gradient(360px 220px at 100% -12%, rgba(255, 142, 60, 0.17), transparent 72%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, transparent) 0%, var(--surface-soft) 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 12px 34px rgba(10, 10, 10, 0.08);
}

.builder-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 14px;
  align-items: start;
}

.builder-main-column,
.builder-side-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.builder-block {
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 95%, var(--surface-soft));
  padding: 13px;
  display: grid;
  gap: 10px;
}

.builder-block-title {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--muted);
}

.builder-stack {
  display: grid;
  gap: 10px;
}

.builder-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, color-mix(in srgb, var(--primary) 7%, transparent) 0%, transparent 58%);
  pointer-events: none;
}

.builder-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 42%, transparent);
  pointer-events: none;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 4px;
  border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, var(--surface-soft));
}

.mode-switch .btn {
  border-radius: 10px;
  min-height: 38px;
}

.mode-switch .btn.mode-active {
  background: linear-gradient(125deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: #fff;
  border-color: var(--primary);
  box-shadow: 0 7px 18px color-mix(in srgb, var(--primary) 36%, transparent);
}

.mode-switch .btn.mode-active:hover {
  background: linear-gradient(125deg, var(--primary-hover) 0%, var(--primary) 100%);
  border-color: var(--primary-hover);
}

.mode-switch .btn.mode-active::before {
  content: "✓";
  font-weight: 700;
  margin-right: 6px;
}

.mode-selected {
  margin-top: 4px;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 999px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--surface) 90%, var(--surface-soft));
  font-size: 12px;
  color: var(--muted);
}

.mode-selected strong {
  color: var(--primary);
}

.builder-label {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 7px;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--muted);
  font-weight: 700;
}

.builder-label input,
.builder-label textarea,
.builder-label select {
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  border-radius: 12px;
  padding: 11px 13px;
  font-family: inherit;
  font-size: 14px;
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 94%, var(--surface-soft));
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.builder-label input::placeholder,
.builder-label textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 86%, transparent);
}

.builder-label input:focus,
.builder-label textarea:focus,
.builder-label select:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--primary) 56%, var(--border));
  background: var(--surface);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 16%, transparent);
}

.builder-label textarea {
  min-height: 96px;
  resize: vertical;
}

.direction-pills {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.direction-pill {
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: 11px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--surface) 95%, var(--surface-soft));
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.direction-pill:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--soft-border) 92%, transparent);
  background: var(--surface);
  box-shadow: 0 5px 16px rgba(10, 10, 10, 0.08);
}

.direction-pill.active {
  border-color: color-mix(in srgb, var(--primary) 76%, transparent);
  background: linear-gradient(125deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: #fff;
  box-shadow: 0 7px 18px color-mix(in srgb, var(--primary) 34%, transparent);
}

.builder-ai-hint {
  position: static;
  z-index: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.builder-ai-hint .section-label {
  margin: 0;
}

.builder-ai-hint .tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.builder-ai-hint .tags span {
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 94%, var(--surface-soft));
}

.builder-meta {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.builder-meta--selected {
  font-weight: 600;
}

.selected-directions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selected-directions span {
  border: 1px solid color-mix(in srgb, var(--primary) 36%, transparent);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  color: var(--text);
  background: color-mix(in srgb, var(--primary) 14%, var(--surface));
}

.compatibility-block {
  display: flex;
  flex-direction: column;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--surface) 90%, var(--surface-soft));
}

.builder-warning {
  margin: 0;
  color: #92400e;
  font-size: 12px;
  border: 1px solid color-mix(in srgb, #f59e0b 36%, transparent);
  background: color-mix(in srgb, #f59e0b 16%, transparent);
  border-radius: 10px;
  padding: 8px 10px;
}

.builder-error {
  margin: 0;
  border: 1px solid color-mix(in srgb, #be123c 34%, transparent);
  background: color-mix(in srgb, #be123c 14%, transparent);
  border-radius: 11px;
  padding: 9px 11px;
  font-size: 13px;
  color: #be123c;
  font-weight: 600;
}

.actions-row--builder {
  position: relative;
  z-index: 1;
  justify-content: stretch;
  padding: 0;
  border-top: 0;
  background: transparent;
}

.actions-row--builder .btn--primary {
  width: 100%;
  min-width: 0;
  border-radius: 12px;
  padding-inline: 20px;
}

.generated-output {
  display: grid;
  gap: 10px;
}

.generated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 12px;
}

.generated-card {
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  border-radius: 16px;
  background:
    radial-gradient(420px 170px at 0% 0%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 72%),
    linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.generated-card:hover {
  border-color: var(--soft-border);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.generated-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.generated-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
}

.milestones-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.saved-tracks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.saved-track-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.saved-track-card {
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 13px;
  display: grid;
  gap: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.saved-track-card:hover {
  border-color: var(--soft-border);
  box-shadow: var(--shadow-sm);
}

.saved-track-card h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text);
}

.saved-track-card p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  min-height: 40px;
}

/* ── Roadmap Grid ── */
.roadmaps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* ── Roadmap Card ── */
.roadmap-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.roadmap-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(10, 10, 10, 0.08);
}

.roadmap-card-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.roadmap-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.roadmap-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  line-height: 1.3;
}

.roadmap-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  line-height: 1.55;
  flex: 1;
}

/* ── Progress ── */
.progress-block {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-track {
  width: 100%;
  height: 5px;
  border-radius: 100px;
  background: var(--border);
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.4s ease;
}

.progress-meta {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

/* ── Actions ── */
.actions-row {
  display: flex;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-soft);
}

.bottom-highlights {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bottom-highlights-head {
  display: grid;
  gap: 8px;
}

.bottom-highlights-head h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
}

.bottom-highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.bottom-highlight-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 16px;
  display: grid;
  gap: 8px;
}

.bottom-highlight-card h3 {
  margin: 0;
  font-size: 17px;
  color: var(--text);
}

.bottom-highlight-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--muted);
}

.bottom-cta {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;
  padding: 8px 0;
}

.bottom-cta-lead {
  margin: 0;
  max-width: 34ch;
  font-size: clamp(24px, 3.6vw, 40px);
  line-height: 1.08;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: color-mix(in srgb, var(--text) 83%, var(--primary) 17%);
}

.bottom-cta-sub {
  margin: 0;
  max-width: 54ch;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.page-footer {
  margin-top: 4px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
  display: grid;
  gap: 16px;
}

.page-footer-top {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.page-footer-brand {
  display: grid;
  gap: 8px;
}

.page-footer-brand h3 {
  margin: 0;
  font-size: 26px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text);
}

.page-footer-brand p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  max-width: 40ch;
}

.page-footer-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.footer-column {
  display: grid;
  gap: 5px;
}

.footer-column h4 {
  margin: 0 0 4px;
  color: var(--text);
  font-size: 14px;
  letter-spacing: 0.02em;
}

.footer-column p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.page-footer-bottom {
  border-top: 1px solid var(--border);
  padding-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.page-footer-bottom span {
  color: var(--muted);
  font-size: 12px;
}

.footer-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.footer-signals span {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  background: var(--surface-soft);
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--text);
}

.btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.2);
}

.btn--ghost {
  background: #fff;
  color: var(--text);
  border-color: var(--border);
}

.btn--ghost:hover {
  background: var(--surface-soft);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.06);
}

@keyframes visual-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-5px) scale(1.01);
  }
}

@keyframes visual-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 980px) {
  .roadmaps-head-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .builder-layout {
    grid-template-columns: 1fr;
  }

  .direction-pills {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .visual-story-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .visual-story-item,
  .visual-story-item img {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* ── Adaptive ── */
@media (max-width: 640px) {
  .intro-card {
    padding: 18px;
  }

  .intro-body {
    flex-direction: column;
  }

  .intro-title {
    font-size: 20px;
  }

  .daily-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-row {
    width: 100%;
    justify-content: space-between;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .visual-story-strip {
    grid-template-columns: 1fr;
  }

  .roadmaps-head-stats {
    grid-template-columns: 1fr;
  }

  .company-promo-title {
    font-size: 22px;
  }

  .company-value-grid,
  .company-about,
  .company-why-grid {
    grid-template-columns: 1fr;
  }

  .builder-card {
    padding: 14px;
    border-radius: 14px;
  }

  .builder-layout {
    gap: 10px;
  }

  .mode-switch {
    grid-template-columns: 1fr;
  }

  .direction-pills {
    grid-template-columns: 1fr;
  }

  .actions-row--builder .btn--primary {
    width: 100%;
    min-width: 0;
  }

  .generated-grid {
    grid-template-columns: 1fr;
  }

  .roadmaps-grid {
    grid-template-columns: 1fr;
  }

  .actions-row {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
