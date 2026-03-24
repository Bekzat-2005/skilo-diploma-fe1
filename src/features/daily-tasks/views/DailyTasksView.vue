<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useDailyTasksStore, type DailyTaskItem } from "@/features/daily-tasks/store/dailyTasks"

type TaskFilter = "all" | "pending" | "completed"

interface RoadmapTaskGroup {
  roadmapId: string
  roadmapTitle: string
  tasks: DailyTaskItem[]
  completed: number
  total: number
}

const dailyTasksStore = useDailyTasksStore()
const activeFilter = ref<TaskFilter>("all")
const quizTaskId = ref<string | null>(null)
const selectedQuizOptionId = ref<string>("")
const quizError = ref<string | null>(null)

const filterItems: Array<{ id: TaskFilter; label: string }> = [
  { id: "all", label: "Все задания" },
  { id: "pending", label: "Нужно выполнить" },
  { id: "completed", label: "Выполнено" }
]

const taskMatchesFilter = (task: DailyTaskItem) => {
  if (activeFilter.value === "pending") return !task.completed
  if (activeFilter.value === "completed") return task.completed
  return true
}

const filteredGlobalTask = computed(() => {
  const globalTask = dailyTasksStore.globalTodayTask
  if (!globalTask) return null
  return taskMatchesFilter(globalTask) ? globalTask : null
})

const activeQuiz = computed(() => {
  if (!quizTaskId.value) return null
  return dailyTasksStore.getQuizForTask(quizTaskId.value)
})

const roadmapGroups = computed<RoadmapTaskGroup[]>(() => {
  return Object.entries(dailyTasksStore.groupedTodayTasks ?? {})
    .map(([roadmapId, tasks]) => {
      const sortedTasks = [...tasks].sort((first, second) => first.nodeTitle.localeCompare(second.nodeTitle, "ru"))
      const completed = sortedTasks.filter((task) => task.completed).length

      return {
        roadmapId,
        roadmapTitle: sortedTasks[0]?.roadmapTitle ?? roadmapId,
        tasks: sortedTasks,
        completed,
        total: sortedTasks.length
      }
    })
    .sort((first, second) => first.roadmapTitle.localeCompare(second.roadmapTitle, "ru"))
})

const filteredRoadmapGroups = computed<RoadmapTaskGroup[]>(() => {
  return roadmapGroups.value
    .map((group) => {
      const filteredTasks = group.tasks.filter((task) => taskMatchesFilter(task))
      const completed = filteredTasks.filter((task) => task.completed).length

      return {
        ...group,
        tasks: filteredTasks,
        completed,
        total: filteredTasks.length
      }
    })
    .filter((group) => group.tasks.length > 0)
})

const totalTasks = computed(() => dailyTasksStore.todayTasks.length)

const completionPercent = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((dailyTasksStore.completedTodayCount / totalTasks.value) * 100)
})
const remainingPoints = computed(() => {
  return Math.max(0, dailyTasksStore.todayTotalPoints - dailyTasksStore.earnedTodayPoints)
})

const visibleTasksCount = computed(() => {
  const groupCount = filteredRoadmapGroups.value.reduce((sum, group) => sum + group.tasks.length, 0)
  return groupCount + (filteredGlobalTask.value ? 1 : 0)
})

const recentHistory = computed(() => {
  return Object.entries(dailyTasksStore.tasksByDate ?? {})
    .sort(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
    .slice(0, 7)
    .map(([date, tasks]) => {
      const completed = tasks.filter((task) => task.completed).length
      const points = tasks.reduce((sum, task) => sum + (task.completed ? task.points : 0), 0)

      return {
        date,
        completed,
        total: tasks.length,
        points
      }
    })
})

const formattedToday = computed(() => {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  })
})

const formatHistoryDate = (date: string) => {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  })
}

const openTaskTest = (taskId: string) => {
  quizTaskId.value = taskId
  selectedQuizOptionId.value = ""
  quizError.value = null
}

const closeTaskTest = () => {
  quizTaskId.value = null
  selectedQuizOptionId.value = ""
  quizError.value = null
}

const submitTaskTest = async () => {
  if (!activeQuiz.value || !quizTaskId.value) return

  if (!selectedQuizOptionId.value) {
    quizError.value = "Выберите один вариант ответа."
    return
  }

  // 1. Асинхронды шақыруды КҮТУ (await)
  const success = await dailyTasksStore.submitTaskAnswer(
    quizTaskId.value, 
    selectedQuizOptionId.value
  )

  if (success) {
    // Егер дұрыс болса - жабамыз
    quizError.value = null
    closeTaskTest()
  } else {
    // Егер қате болса - хабарлама шығарамыз
    quizError.value = "Неверный ответ. Попробуйте еще раз."
  }
}

onMounted(() => {
  dailyTasksStore.ensureTodayTasks()
})
</script>

<template>
  <div class="daily-page">
    <section class="daily-hero">
      <div class="daily-hero-text">
        <p class="daily-kicker">Ежедневные задания</p>
        <h1>Тест по каждой вашей дорожке + один общий тест дня</h1>
        <p class="daily-subtitle">
          Сегодня: {{ formattedToday }}. По каждой добавленной дорожке вы получаете один тест по теме, а общее задание дня дает повышенную награду.
        </p>
      </div>

      <div class="daily-stats">
        <article>
          <span>Выполнено</span>
          <strong>{{ dailyTasksStore.completedTodayCount }}/{{ totalTasks }}</strong>
        </article>
        <article>
          <span>Осталось</span>
          <strong>{{ dailyTasksStore.pendingTodayCount }}</strong>
        </article>
        <article>
          <span>Получено очков</span>
          <strong>+{{ dailyTasksStore.earnedTodayPoints }}</strong>
        </article>
        <article>
          <span>Доступно сегодня</span>
          <strong>+{{ remainingPoints }}</strong>
        </article>
      </div>
    </section>

    <section class="flow-note info-flow">
      <p>Короткая ежедневная сессия помогает закреплять темы быстрее, чем редкие длинные подходы.</p>
      <p>Общий тест дня дает больше очков, поэтому выгодно закрывать сначала его, а потом задания по направлениям.</p>
    </section>

    <section class="progress-shell">
      <div class="progress-head">
        <span>Прогресс дня</span>
        <span class="progress-badge">{{ completionPercent }}%</span>
      </div>
      <div class="progress-track">
        <span class="progress-fill" :style="{ width: `${completionPercent}%` }" />
      </div>
    </section>

    <section class="filter-shell">
      <div class="filter-row">
        <button
          v-for="item in filterItems"
          :key="item.id"
          class="filter-btn"
          :class="{ active: item.id === activeFilter }"
          @click="activeFilter = item.id"
        >
          {{ item.label }}
        </button>
      </div>
      <p class="filter-meta">Показано заданий: {{ visibleTasksCount }}</p>
    </section>

    <section
      v-if="filteredGlobalTask"
      class="global-task-shell"
      :class="{ done: filteredGlobalTask.completed }"
    >
      <div class="global-task-head">
        <p class="global-task-label">Общее задание дня</p>
        <span class="task-points global-task-points">+{{ filteredGlobalTask.points }}</span>
      </div>
      <h2>{{ filteredGlobalTask.nodeTitle }}</h2>
      <p class="task-desc">{{ filteredGlobalTask.description }}</p>
      <div class="task-actions">
        <span v-if="filteredGlobalTask.completed" class="task-status task-status--done">Общий тест выполнен</span>
        <span v-else class="task-status task-status--pending">Ожидает выполнения</span>

        <button
          class="task-btn"
          :class="{ done: filteredGlobalTask.completed }"
          :disabled="filteredGlobalTask.completed"
          @click="openTaskTest(filteredGlobalTask.id)"
        >
          {{ filteredGlobalTask.completed ? "Получено" : "Пройти тест" }}
        </button>
      </div>
    </section>

    <section v-if="filteredRoadmapGroups.length > 0" class="task-groups">
      <article
        v-for="group in filteredRoadmapGroups"
        :key="group.roadmapId"
        class="task-group"
      >
        <header class="task-group-head">
          <div>
            <h2>{{ group.roadmapTitle }}</h2>
            <p>Тест дня по одной теме дорожки</p>
          </div>
          <span class="group-percent">
            {{ group.total ? Math.round((group.completed / group.total) * 100) : 0 }}%
          </span>
        </header>

        <div class="task-list">
          <article
            v-for="task in group.tasks"
            :key="task.id"
            class="task-card"
            :class="{ done: task.completed }"
          >
            <div class="task-top">
              <h3>{{ task.nodeTitle }}</h3>
              <span class="task-points">+{{ task.points }}</span>
            </div>
            <p class="task-desc">{{ task.description }}</p>
            <div class="task-actions">
              <span v-if="task.completed" class="task-status task-status--done">Задание выполнено</span>
              <span v-else class="task-status task-status--pending">Ожидает выполнения</span>

              <button
                class="task-btn"
                :class="{ done: task.completed }"
                :disabled="task.completed"
                @click="openTaskTest(task.id)"
              >
                {{ task.completed ? "Получено" : "Пройти тест" }}
              </button>
            </div>
          </article>
        </div>
      </article>
    </section>

    <section v-if="!filteredGlobalTask && filteredRoadmapGroups.length === 0" class="empty-state">
      <h3>По текущему фильтру заданий нет</h3>
      <p>Смените фильтр или дождитесь следующего дня, чтобы получить новую подборку задач.</p>
    </section>

    <section class="history-shell">
      <header>
        <h2>История за последние дни</h2>
      </header>
      <div class="history-grid">
        <article v-for="item in recentHistory" :key="item.date" class="history-card">
          <span class="history-date">{{ formatHistoryDate(item.date) }}</span>
          <strong>{{ item.completed }}/{{ item.total }}</strong>
          <p>Очки: +{{ item.points }}</p>
        </article>
      </div>
    </section>

    <transition name="quiz-fade">
      <div v-if="activeQuiz" class="quiz-overlay" @click.self="closeTaskTest">
        <div class="quiz-modal">
          <p class="quiz-kicker">Мини-тест</p>
          <h3>{{ activeQuiz.question }}</h3>

          <label
            v-for="option in activeQuiz.options"
            :key="option.id"
            class="quiz-option"
          >
            <input
              v-model="selectedQuizOptionId"
              type="radio"
              :value="option.id"
              name="daily-task-quiz"
            />
            <span>{{ option.label }}</span>
          </label>

          <p v-if="quizError" class="quiz-error">{{ quizError }}</p>

          <div class="quiz-actions">
            <button type="button" class="quiz-btn quiz-btn--ghost" @click="closeTaskTest">
              Отмена
            </button>
            <button type="button" class="quiz-btn" @click="submitTaskTest">
              Проверить
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.daily-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--text);
}

.flow-note {
  padding: 0 4px;
}

.daily-hero {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 24px;
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 20px;
  background:
    radial-gradient(420px 200px at 100% 0%, rgba(255, 142, 60, 0.2), transparent 70%),
    linear-gradient(135deg, var(--surface) 0%, var(--surface-soft) 100%);
}

.daily-kicker {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.daily-hero h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1.15;
}

.daily-subtitle {
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.daily-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.daily-stats article {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.daily-stats span {
  font-size: 12px;
  color: var(--muted);
}

.daily-stats strong {
  font-size: 22px;
  letter-spacing: -0.02em;
}

.progress-shell {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 14px;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
}

.progress-badge {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  background: var(--surface-soft);
}

.progress-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff8e3c 0%, #ffb56b 100%);
  transition: width 0.25s ease;
}

.filter-shell {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 12px;
}

.filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  border: 1px solid var(--border) !important;
  border-radius: 999px;
  background: var(--surface-soft) !important;
  color: var(--text) !important;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.filter-btn:hover {
  background: var(--surface-soft) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
  transform: translateY(-1px);
}

.filter-btn.active {
  border-color: var(--primary) !important;
  background: var(--primary) !important;
  color: var(--button-text) !important;
}

.filter-btn.active:hover {
  background: var(--primary-hover) !important;
  border-color: var(--primary-hover) !important;
  color: var(--button-text) !important;
}

.filter-meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.global-task-shell {
  border: 1px solid var(--primary);
  border-radius: 16px;
  background:
    radial-gradient(420px 180px at 100% 0%, rgba(255, 142, 60, 0.22), transparent 72%),
    linear-gradient(140deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 14px;
}

.global-task-shell.done {
  border-color: rgba(33, 150, 83, 0.35);
}

.global-task-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.global-task-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}

.global-task-shell h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.global-task-points {
  border-color: var(--primary);
  background: rgba(255, 142, 60, 0.2);
}

.task-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-group {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 14px;
}

.task-group-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 10px;
}

.task-group-head h2 {
  margin: 0;
  font-size: 20px;
}

.task-group-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.group-percent {
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
}

.task-list {
  display: grid;
  gap: 10px;
}

.task-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  background: linear-gradient(140deg, var(--surface) 0%, var(--surface-soft) 100%);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.task-card:hover {
  border-color: var(--node-hover-border);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.task-card.done {
  border-color: rgba(33, 150, 83, 0.35);
}

.task-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.task-top h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
}

.task-points {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.task-desc {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.5;
}

.task-actions {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.task-status {
  font-size: 12px;
  font-weight: 600;
}

.task-status--done {
  color: #1f8f51;
}

.task-status--pending {
  color: var(--muted);
}

.task-btn {
  border: 1px solid var(--primary) !important;
  border-radius: 10px;
  background: var(--primary) !important;
  color: var(--button-text) !important;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.task-btn:hover {
  background: var(--primary-hover) !important;
  border-color: var(--primary-hover) !important;
  color: var(--button-text) !important;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.task-btn:disabled {
  cursor: not-allowed;
}

.task-btn.done {
  border-color: rgba(33, 150, 83, 0.3) !important;
  background: rgba(33, 150, 83, 0.15) !important;
  color: #1f8f51 !important;
}

.empty-state {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  text-align: center;
  padding: 24px 16px;
}

.empty-state h3 {
  margin: 0;
}

.empty-state p {
  margin: 8px 0 0;
  color: var(--muted);
}

.history-shell {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 14px;
}

.history-shell h2 {
  margin: 0 0 10px;
  font-size: 18px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.history-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-date {
  color: var(--muted);
  font-size: 12px;
}

.history-card strong {
  font-size: 18px;
}

.history-card p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.quiz-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 70;
}

.quiz-modal {
  width: min(460px, 100%);
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}

.quiz-modal h3 {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
  cursor: pointer;
}

.quiz-option input {
  margin: 0;
}

.quiz-option span {
  font-size: 14px;
}

.quiz-error {
  margin: 0;
  color: #c0342b;
  font-size: 13px;
  font-weight: 600;
}

.quiz-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.quiz-btn {
  border: 1px solid var(--primary) !important;
  border-radius: 10px;
  background: var(--primary) !important;
  color: var(--button-text) !important;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 700;
}

.quiz-btn--ghost {
  border: 1px solid var(--border) !important;
  background: var(--surface-soft) !important;
  color: var(--text) !important;
}

.quiz-fade-enter-active,
.quiz-fade-leave-active {
  transition: opacity 0.18s ease;
}

.quiz-fade-enter-from,
.quiz-fade-leave-to {
  opacity: 0;
}

@media (max-width: 920px) {
  .daily-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .daily-page {
    gap: 12px;
  }

  .daily-hero {
    padding: 16px;
  }

  .task-group {
    padding: 12px;
  }

  .task-top h3 {
    font-size: 15px;
  }
}
</style>
