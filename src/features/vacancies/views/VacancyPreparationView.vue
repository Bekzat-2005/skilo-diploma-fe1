<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  vacanciesApi,
  type Vacancy,
  type VacancyTaskLeaderboardResponse,
  type VacancyTaskSubmission,
  type VacancyTaskSubmissionPayload
} from "@/features/vacancies/api/vacancies.api"
import { useAuthStore } from "@/features/auth/store/auth"
import { isNotFoundError, resolveApiError } from "@/shared/utils/resolveApiError"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)
const vacancy = ref<Vacancy | null>(null)
const openedAnswerId = ref<string | null>(null)
const prepMode = ref<"overview" | "questions" | "tasks" | "test">("overview")

const tasksLoading = ref(false)
const taskItems = ref<Array<{ task: Vacancy["realTasks"][number]; submission: VacancyTaskSubmission | null }>>([])
const taskLeaderboard = ref<VacancyTaskLeaderboardResponse | null>(null)
const taskDrafts = ref<Record<string, VacancyTaskSubmissionPayload>>({})
const taskSubmitting = ref<Record<string, boolean>>({})
const taskErrors = ref<Record<string, string | null>>({})

const currentQuestionIndex = ref(0)
const selectedAnswer = ref<number | null>(null)
const answers = ref<Record<string, number>>({})
const testFinished = ref(false)
const score = ref(0)

const testQuestions = computed(() => vacancy.value?.preparation.test ?? [])
const currentQuestion = computed(() => testQuestions.value[currentQuestionIndex.value] ?? null)
const answeredQuestions = computed(() => Object.keys(answers.value).length)
const taskLeadersTop = computed(() => (taskLeaderboard.value?.leaders ?? []).slice(0, 5))

const verdictLabel = {
  excellent: "Отлично",
  strong: "Сильная работа",
  good: "Хорошо",
  needs_improvement: "Нужно улучшить"
} as const

const toggleAnswer = (questionId: string) => {
  openedAnswerId.value = openedAnswerId.value === questionId ? null : questionId
}

const selectOption = (index: number) => {
  selectedAnswer.value = index
}

const nextQuestion = () => {
  const question = currentQuestion.value
  if (!question || selectedAnswer.value === null) return

  answers.value[question.id] = selectedAnswer.value

  if (currentQuestionIndex.value < testQuestions.value.length - 1) {
    currentQuestionIndex.value += 1
    selectedAnswer.value = answers.value[testQuestions.value[currentQuestionIndex.value].id] ?? null
    return
  }

  let total = 0
  testQuestions.value.forEach((item) => {
    if (answers.value[item.id] === item.correctAnswerIndex) total += 1
  })
  score.value = total
  testFinished.value = true
}

const restartTest = () => {
  currentQuestionIndex.value = 0
  selectedAnswer.value = null
  answers.value = {}
  testFinished.value = false
  score.value = 0
}

const initTaskDrafts = () => {
  const nextDrafts: Record<string, VacancyTaskSubmissionPayload> = {}
  taskItems.value.forEach((item) => {
    nextDrafts[item.task.id] = {
      solutionUrl: item.submission?.solutionUrl ?? "",
      comment: item.submission?.comment ?? ""
    }
  })
  taskDrafts.value = nextDrafts
}

const loadTasks = async (vacancyId: string) => {
  tasksLoading.value = true
  const [tasks, leaderboard] = await Promise.all([
    vacanciesApi.getVacancyRealTasks(vacancyId, authStore.user?.id ?? null),
    vacanciesApi.getVacancyTaskLeaderboard(vacancyId, authStore.user?.id ?? null)
  ])
  taskItems.value = tasks
  taskLeaderboard.value = leaderboard
  initTaskDrafts()
  tasksLoading.value = false
}

const submitTask = async (taskId: string) => {
  if (!vacancy.value) return

  const draft = taskDrafts.value[taskId]
  if (!draft?.solutionUrl?.trim()) {
    taskErrors.value[taskId] = "Добавьте ссылку на решение"
    return
  }

  try {
    taskSubmitting.value[taskId] = true
    taskErrors.value[taskId] = null
    const submission = await vacanciesApi.submitVacancyTask(vacancy.value.id, taskId, draft, authStore.user?.id ?? null)

    taskItems.value = taskItems.value.map((item) =>
      item.task.id === taskId ? { ...item, submission } : item
    )
    taskLeaderboard.value = await vacanciesApi.getVacancyTaskLeaderboard(vacancy.value.id, authStore.user?.id ?? null)
  } catch (err) {
    taskErrors.value[taskId] = resolveApiError(err, "Не удалось отправить решение").message
  } finally {
    taskSubmitting.value[taskId] = false
  }
}

const isGenerating = ref(false);

const loadVacancy = async () => {
  try {
    loading.value = true;
    const data = await vacanciesApi.getVacancyById(String(route.params.id));
    vacancy.value = data;

    // Егер ИИ деректері (сұрақтар не тест) әлі жоқ болса
    if (vacancy.value && (!vacancy.value.preparation.questions.length || !vacancy.value.preparation.test.length)) {
      await handleGenerateAIPrep();
    } else {
      await loadTasks(vacancy.value.id);
    }
  } catch (err) {
    error.value = "Жүктеу қатесі";
  } finally {
    loading.value = false;
  }
};

const handleGenerateAIPrep = async () => {
  if (!vacancy.value) return;
  
  try {
    isGenerating.value = true;
    // Бұл жерде backend-тегі генерация жасайтын жаңа endpoint-ты шақырамыз
    const aiData = await vacanciesApi.generateAIPrep(vacancy.value.id);
    vacancy.value.preparation.questions = aiData.questions;
    vacancy.value.preparation.test = aiData.test;
    await loadTasks(vacancy.value.id);
  } catch (err) {
    console.error("Генерация қатесі");
  } finally {
    isGenerating.value = false;
  }
};

onMounted(() => {
  void loadVacancy()
})
</script>

<template>
  <div class="prep-page">

    <div v-if="isGenerating" class="ai-loading-state">
      <div class="ai-sparkles">✨</div>
      <h3>ИИ сізге арнайы дайындық жоспарын құрып жатыр...</h3>
      <p>Бұл бірнеше секунд алуы мүмкін</p>
    </div>
    <!-- Top Section -->
    <section class="section-card">
      <button class="btn-back" @click="router.push('/vacancies')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Назад к вакансиям
      </button>

      <div v-if="loading" class="state-view">
        <span class="loader" />
        <p>Загрузка...</p>
      </div>
      <div v-else-if="error" class="state-view">
        <p class="error-text">{{ error }}</p>
      </div>

      <template v-else-if="vacancy">
        <h1>{{ vacancy.title }}</h1>
        <p class="head-sub">{{ vacancy.company }} · {{ vacancy.location }} · {{ vacancy.preparation.direction }}</p>

        <div class="mode-tabs">
          <button
            :class="{ active: prepMode === 'overview' }"
            @click="prepMode = 'overview'"
          >Обзор</button>
          <button
            :class="{ active: prepMode === 'questions' }"
            @click="prepMode = 'questions'"
          >Вопросы</button>
          <button
            :class="{ active: prepMode === 'tasks' }"
            @click="prepMode = 'tasks'"
          >Реальные задачи</button>
          <button
            :class="{ active: prepMode === 'test' }"
            @click="prepMode = 'test'"
          >Тест</button>
        </div>
      </template>
    </section>

    <!-- Overview -->
    <section v-if="vacancy && prepMode === 'overview'" class="section-card">
      <h3 class="section-title">План подготовки</h3>
      <div class="overview-grid">
        <article class="overview-item" @click="prepMode = 'questions'">
          <span class="overview-step">01</span>
          <div>
            <strong>Изучите вопросы</strong>
            <p>{{ vacancy.preparation.questions.length }} вопросов</p>
          </div>
          <svg class="arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </article>
        <article class="overview-item" @click="prepMode = 'tasks'">
          <span class="overview-step">02</span>
          <div>
            <strong>Выполните задачи</strong>
            <p>{{ vacancy.realTasks.length }} задач</p>
          </div>
          <svg class="arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </article>
        <article class="overview-item" @click="prepMode = 'test'">
          <span class="overview-step">03</span>
          <div>
            <strong>Пройдите тест</strong>
            <p>{{ testQuestions.length }} вопросов</p>
          </div>
          <svg class="arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </article>
      </div>
      <p class="hint">Рекомендуемый порядок: вопросы, задачи, тест.</p>
    </section>

    <!-- Questions -->
    <section v-if="vacancy && prepMode === 'questions'" class="section-card">
      <h3 class="section-title">Частые вопросы</h3>
      <div class="qa-list">
        <article v-for="item in vacancy.preparation.questions" :key="item.id" class="qa-item">
          <button class="qa-toggle" @click="toggleAnswer(item.id)">
            <span>{{ item.question }}</span>
            <svg
              class="qa-chevron"
              :class="{ open: openedAnswerId === item.id }"
              xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            ><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <transition name="expand">
            <p v-if="openedAnswerId === item.id" class="qa-answer">{{ item.answer }}</p>
          </transition>
        </article>
      </div>
      <div class="nav-actions">
        <button class="btn-secondary" @click="prepMode = 'overview'">К обзору</button>
        <button class="btn-primary" @click="prepMode = 'tasks'">
          Перейти к задачам
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </section>

    <!-- Tasks -->
    <section v-if="vacancy && prepMode === 'tasks'" class="section-card">
      <h3 class="section-title">Реальные задачи</h3>
      <p class="hint">Пока работает на mock-данных. В будущем компании смогут проверять решения.</p>

      <div v-if="tasksLoading" class="hint">Загрузка задач...</div>
      <div v-else-if="!taskItems.length" class="hint">По этой вакансии пока нет задач.</div>

      <div v-else class="task-list">
        <article v-for="item in taskItems" :key="item.task.id" class="task-card">
          <div class="task-head">
            <h4>{{ item.task.title }}</h4>
            <span class="hours-pill">{{ item.task.estimatedHours }} ч</span>
          </div>
          <p class="task-brief">{{ item.task.brief }}</p>

          <div class="task-cols">
            <div>
              <p class="col-label">Требования</p>
              <ul>
                <li v-for="req in item.task.requirements" :key="req">{{ req }}</li>
              </ul>
            </div>
            <div>
              <p class="col-label">Что отправить</p>
              <ul>
                <li v-for="deliverable in item.task.deliverables" :key="deliverable">{{ deliverable }}</li>
              </ul>
            </div>
          </div>

          <div class="task-form">
            <input
              v-model="taskDrafts[item.task.id].solutionUrl"
              placeholder="Ссылка на решение (GitHub / Drive)"
            />
            <textarea
              v-model="taskDrafts[item.task.id].comment"
              rows="3"
              placeholder="Комментарий к решению"
            />
            <div class="form-actions">
              <button class="btn-primary" :disabled="taskSubmitting[item.task.id]" @click="submitTask(item.task.id)">
                <span v-if="taskSubmitting[item.task.id]" class="spinner" />
                {{ taskSubmitting[item.task.id] ? "Отправка..." : "Отправить решение" }}
              </button>
              <span v-if="item.submission" class="sent-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                {{ new Date(item.submission.submittedAt).toLocaleDateString("ru-RU") }}
              </span>
            </div>
            <p v-if="taskErrors[item.task.id]" class="error-text">{{ taskErrors[item.task.id] }}</p>
          </div>
        </article>
      </div>

      <div class="nav-actions">
        <button class="btn-secondary" @click="prepMode = 'questions'">К вопросам</button>
        <button class="btn-primary" @click="prepMode = 'test'">
          Перейти к тесту
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>

      <!-- Leaders -->
      <div v-if="taskLeadersTop.length" class="leaders-box">
        <h4 class="section-title">Лидеры по вакансии</h4>
        <div class="leaders-list">
          <article
            v-for="leader in taskLeadersTop"
            :key="`task-leader-${leader.userId}`"
            class="leader-row"
          >
            <span
              class="leader-rank"
              :class="{ gold: leader.rank === 1, silver: leader.rank === 2, bronze: leader.rank === 3 }"
            >{{ leader.rank }}</span>
            <div class="leader-info">
              <strong>{{ leader.fullName }}</strong>
              <p>{{ leader.tasksSubmitted }} задач · {{ verdictLabel[leader.aiVerdict] }}</p>
            </div>
            <span class="leader-score">{{ leader.averageQualityScore }}<small>/100</small></span>
            <span class="hr-status" :class="{ sent: leader.sentToHr }">
              {{ leader.sentToHr ? "Отправлено HR" : "В обработке" }}
            </span>
          </article>
        </div>

        <div v-if="taskLeaderboard?.currentUser" class="my-rank">
          <span>Ваше место: <strong>#{{ taskLeaderboard.currentUser.rank }}</strong></span>
          <span>Качество: <strong>{{ taskLeaderboard.currentUser.averageQualityScore }}/100</strong></span>
        </div>
      </div>
    </section>

    <!-- Test -->
    <section v-if="vacancy && prepMode === 'test'" class="section-card">
      <h3 class="section-title">Мини-тест</h3>

      <div v-if="!testFinished && currentQuestion" class="test-block">
        <p class="test-progress">
          Вопрос {{ currentQuestionIndex + 1 }} из {{ testQuestions.length }}
          <span class="test-dot" />
          Отвечено: {{ answeredQuestions }}
        </p>

        <div class="progress-track">
          <span :style="{ width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%` }" />
        </div>

        <p class="test-question">{{ currentQuestion.question }}</p>

        <div class="test-options">
          <button
            v-for="(option, index) in currentQuestion.options"
            :key="`${currentQuestion.id}-${option}`"
            class="test-option"
            :class="{ selected: selectedAnswer === index }"
            @click="selectOption(index)"
          >
            <span class="option-marker">{{ String.fromCharCode(65 + index) }}</span>
            {{ option }}
          </button>
        </div>

        <div class="nav-actions">
          <button class="btn-secondary" @click="prepMode = 'tasks'">Вернуться к задачам</button>
          <button class="btn-primary" :disabled="selectedAnswer === null" @click="nextQuestion">
            {{ currentQuestionIndex === testQuestions.length - 1 ? "Завершить тест" : "Следующий вопрос" }}
          </button>
        </div>
      </div>

      <div v-else class="test-result">
        <div class="result-score">
          <span class="score-num">{{ score }}</span>
          <span class="score-sep">/</span>
          <span class="score-total">{{ testQuestions.length }}</span>
        </div>
        <p>Подготовка завершена. Повторите тест для закрепления.</p>
        <div class="nav-actions">
          <button class="btn-secondary" @click="restartTest">Пройти заново</button>
          <button class="btn-secondary" @click="prepMode = 'overview'">К обзору</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.prep-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 80px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Section Card */
.section-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin: 0 0 16px;
}

/* States */
.state-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
  gap: 10px;
}

.state-view p {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
}

.error-text {
  color: #dc2626;
  font-size: 14px;
  margin: 4px 0 0;
}

.loader {
  width: 22px;
  height: 22px;
  border: 2.5px solid var(--border);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Back Button */
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  margin-bottom: 18px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.btn-back:hover {
  color: var(--text);
}

/* Header */
.section-card h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: var(--text);
}

.head-sub {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

/* Mode Tabs */
.mode-tabs {
  margin-top: 18px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mode-tabs button {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-tabs button:hover {
  border-color: var(--border);
  color: var(--muted);
}

.mode-tabs button.active {
  background: var(--primary);
  color: var(--button-text);
  border-color: var(--text);
}

/* Overview */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.overview-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--surface-soft);
}

.overview-item:hover {
  border-color: var(--border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transform: translateY(-1px);
}

.overview-step {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary);
  color: var(--button-text);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.overview-item div {
  flex: 1;
  min-width: 0;
}

.overview-item strong {
  display: block;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 2px;
}

.overview-item p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.overview-item .arrow {
  color: var(--border);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.overview-item:hover .arrow {
  color: var(--muted);
}

.hint {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

/* Q&A */
.qa-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.qa-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  overflow: hidden;
}

.qa-toggle {
  width: 100%;
  background: none;
  border: none;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  text-align: left;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: color 0.15s ease;
}

.qa-toggle:hover {
  color: var(--text);
}

.qa-chevron {
  color: var(--muted);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.qa-chevron.open {
  transform: rotate(180deg);
}

.qa-answer {
  margin: 0;
  padding: 0 16px 14px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-bottom: 0;
}

/* Tasks */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.task-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 18px 16px;
}

.task-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.task-head h4 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.hours-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--surface-soft);
  color: var(--muted);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.task-brief {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

.task-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.col-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.task-cols ul {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

/* Task Form */
.task-form {
  border-top: 1px solid var(--border);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-form input,
.task-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  transition: border-color 0.15s ease;
  resize: vertical;
}

.task-form input:focus,
.task-form textarea:focus {
  outline: none;
  border-color: var(--text);
}

.task-form input::placeholder,
.task-form textarea::placeholder {
  color: var(--muted);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sent-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 100px;
  background: var(--surface-soft);
  color: var(--muted);
  border: 1px solid var(--border);
}

/* Leaders Box */
.leaders-box {
  margin-top: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: var(--surface-soft);
}

.leaders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leader-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

.leader-rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  background: var(--surface-soft);
  flex-shrink: 0;
}

.leader-rank.gold { background: var(--primary); color: #fff; }
.leader-rank.silver { background: var(--text); color: #fff; }
.leader-rank.bronze { background: var(--muted); color: #fff; }

.leader-info {
  flex: 1;
  min-width: 0;
}

.leader-info strong {
  display: block;
  font-size: 14px;
  color: var(--text);
}

.leader-info p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.leader-score {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  flex-shrink: 0;
}

.leader-score small {
  font-weight: 500;
  color: var(--muted);
}

.hr-status {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--surface-soft);
  color: var(--muted);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.hr-status.sent {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}

.my-rank {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 13px;
  color: var(--muted);
}

.my-rank strong {
  color: var(--text);
}

/* Test */
.test-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.test-progress {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.test-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border);
}

.progress-track {
  width: 100%;
  height: 4px;
  border-radius: 100px;
  background: var(--border);
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.3s ease;
}

.test-question {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.test-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-option {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  font-family: inherit;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.test-option:hover {
  border-color: var(--border);
  background: var(--surface-soft);
}

.test-option.selected {
  border-color: var(--text);
  background: var(--surface-soft);
}

.option-marker {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.test-option.selected .option-marker {
  background: var(--primary);
  color: var(--button-text);
}

/* Test Result */
.test-result {
  text-align: center;
  padding: 20px 0;
}

.result-score {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 12px;
}

.score-num {
  font-size: 48px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.03em;
}

.score-sep {
  font-size: 28px;
  color: var(--border);
}

.score-total {
  font-size: 28px;
  font-weight: 700;
  color: var(--border);
}

.test-result p {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 16px;
}

/* Navigation Actions */
.nav-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border: none;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary:disabled {
  background: var(--border);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  border-color: var(--border);
  background: var(--surface-soft);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Responsive */
@media (max-width: 640px) {
  .prep-page {
    padding: 32px 16px 60px;
  }

  .section-card {
    padding: 18px 16px;
  }

  .section-card h1 {
    font-size: 20px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .task-cols {
    grid-template-columns: 1fr;
  }

  .leader-row {
    flex-wrap: wrap;
  }

  .hr-status {
    width: 100%;
    text-align: center;
  }

  .mode-tabs {
    gap: 4px;
  }

  .mode-tabs button {
    padding: 7px 12px;
    font-size: 12px;
  }
}
</style>
