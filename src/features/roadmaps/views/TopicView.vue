<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { axiosInstance } from "@/shared/api/client"
import { useTopicProgressStore } from "@/features/roadmaps/store/topicProgress"



const route = useRoute()
const router = useRouter()
const topicProgress = useTopicProgressStore()

const topic = ref<any>(null)

const topicId = route.params.id as string
onMounted(async () => {
  try {

    const { data } = await axiosInstance.get(`/topics/${topicId}`)

    topic.value = data

  } catch (e) {

    console.error("Topic load error:", e)

  }
})

const test = ref<any>(null)

const loadTest = async () => {

  try {

    const { data } = await axiosInstance.get(`/topics/${topicId}/test`)

    console.log("TEST DATA:", data)

    test.value = data

  } catch (e) {

    console.error("test load error", e)

  }

}

const testStarted = ref(false)
const selectedAnswers = ref<number[]>([])
const testFinished = ref(false)
const score = ref(0)
const currentQuestionIndex = ref(0)
const remainingSeconds = ref(0)
let timerId: number | null = null

const persistedResult = computed(() => topicProgress.getResult(topicId))

const topicStatusLabel = computed(() => {
  if (testFinished.value) {
    return score.value >= 70 ? "Пройдено" : "Не пройдено"
  }

  if (persistedResult.value) {
    return persistedResult.value.passed ? "Пройдено" : "Не пройдено"
  }

  return "Не тестировалось"
})

const topicStatusClass = computed(() => {
  const label = topicStatusLabel.value
  if (label === "Пройдено") return "status--pass"
  if (label === "Не пройдено") return "status--fail"
  return "status--neutral"
})

const totalQuestions = computed(() => test?.questions?.length ?? 0)

const currentQuestion = computed(() => {
  if (!test) return null
  return test.value.questions[currentQuestionIndex.value] ?? null
})

const isLastQuestion = computed(() => {
  if (!test) return false
  return currentQuestionIndex.value >= (test.value?.questions?.length || 0) - 1
})

const isCurrentQuestionAnswered = computed(() => {
  return selectedAnswers.value[currentQuestionIndex.value] !== undefined
})

const formatTime = (seconds: number) => {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
}

const timerText = computed(() => formatTime(remainingSeconds.value))

const clearTimer = () => {
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

const startTimer = () => {
  clearTimer()

  timerId = window.setInterval(() => {
    if (remainingSeconds.value <= 1) {
      remainingSeconds.value = 0
      clearTimer()
      finishTest()
      return
    }

    remainingSeconds.value -= 1
  }, 1000)
}

const startTest = async () => {

  await loadTest()

  if (!test.value?.questions?.length || 0) return

  testStarted.value = true
  selectedAnswers.value = []
  testFinished.value = false
  score.value = 0
  currentQuestionIndex.value = 0
  remainingSeconds.value = (test.value?.questions?.length || 0) * 45
  startTimer()

}

const nextQuestion = () => {
  if (!test || !isCurrentQuestionAnswered.value || isLastQuestion.value) return
  currentQuestionIndex.value += 1
}

const finishTest = async () => {
  if (!test.value) return;

  clearTimer();

  // 1. Дұрыс жауаптарды есептеу
  let correct = 0;
  test.value.questions.forEach((q: any, index: number) => {
    if (selectedAnswers.value[index] === q.correctIndex) {
      correct++;
    }
  });

  // 2. Пайызды шығару
  const totalQuestions = test.value.questions.length;
  const percentage = Math.round((correct / totalQuestions) * 100);

  // 3. UI-ды жаңарту
  score.value = percentage;
  testFinished.value = true;

  try {
    // 4. Бэкендке пайызды жіберу
    const { data } = await axiosInstance.post(`/topics/${topicId}/submit`, {
      score: percentage
    });

    // 5. Локалды Store-ды жаңарту (прогресс бірден көрінуі үшін)
    topicProgress.setResult(topicId, percentage, percentage >= 70);

    console.log("Progress saved:", data.status);
    
  } catch (e) {
    console.error("Нәтижені сақтау мүмкін болмады:", e);
  }
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push("/roadmaps")
}

onBeforeUnmount(() => {
  clearTimer()
})
</script>

<template>
  <div class="topic-page">

    <button class="btn btn--ghost" @click="goBack">← Назад</button>

    <!-- Tabs -->
    <div class="topic-tabs">
      <router-link class="topic-tab" :to="`/topics/${topicId}`">Обучение и тест</router-link>
      <router-link class="topic-tab" :to="`/topics/${topicId}/interview`">Вопросы интервью</router-link>
    </div>

    <div v-if="!topic" class="empty-state">
      <h2>Тема не найдена</h2>
    </div>

    <div v-else class="topic-body">

      <!-- Topic header -->
      <div class="topic-header">
        <div class="topic-header-main">
          <h1 class="topic-title">{{  topic?.title }}</h1>
          <div class="topic-meta">
            <span class="badge">{{ topic.level }}</span>
            <span class="badge" :class="topicStatusClass">{{ topicStatusLabel }}</span>
          </div>
        </div>
      </div>

      <!-- THEORY -->
      <section v-if="!testStarted" class="section-card">
        <span class="section-label">Теория</span>
        <div class="theory-content">
          <pre class="theory-pre">{{ topic?.theory }}</pre>
        </div>
        <div class="section-footer">
          <button
            class="btn btn--primary"
          
            @click="startTest"
          >
            Начать тест
          </button>
        </div>
      </section>

      <!-- TEST -->
      <section v-if="testStarted && test && !testFinished" class="section-card">
        <span class="section-label">Тест</span>

        <div class="test-meta-row">
          <div class="test-meta-item">
            <span class="meta-label">Осталось времени</span>
            <span class="meta-value timer" :class="{ 'timer--low': remainingSeconds <= 30 }">
              {{ timerText }}
            </span>
          </div>
          <div class="test-meta-divider" />
          <div class="test-meta-item">
            <span class="meta-label">Вопрос</span>
            <span class="meta-value">{{ currentQuestionIndex + 1 }} / {{ totalQuestions }}</span>
          </div>
          <div class="test-progress-track">
            <span
              class="test-progress-fill"
              :style="{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }"
            />
          </div>
        </div>

        <div v-if="currentQuestion" class="question-card">
          <p class="question-text">{{ currentQuestion.question }}</p>

          <div class="options-list">
            <label
              v-for="(option, oIndex) in currentQuestion.options"
              :key="oIndex"
              class="option-item"
              :class="{ 'option-item--selected': selectedAnswers[currentQuestionIndex] === oIndex }"
            >
              <input
                type="radio"
                class="option-radio"
                :name="currentQuestion.id"
                :value="oIndex"
                v-model="selectedAnswers[currentQuestionIndex]"
              />
              <span class="option-marker" />
              <span class="option-text">{{ option }}</span>
            </label>
          </div>
        </div>

        <div class="section-footer">
          <button
            v-if="!isLastQuestion"
            class="btn btn--ghost"
            :disabled="!isCurrentQuestionAnswered"
            @click="nextQuestion"
          >
            Следующий вопрос →
          </button>
          <button
            v-else
            class="btn btn--primary"
            :disabled="!isCurrentQuestionAnswered"
            @click="finishTest"
          >
            Завершить тест
          </button>
        </div>
      </section>

      <!-- RESULT -->
      <section v-if="testFinished" class="section-card result-card">
        <span class="section-label">Результат</span>

        <div class="result-score-block">
          <span class="result-score-value">{{ score }}%</span>
          <span class="result-score-label">ваш результат</span>
        </div>

        <div class="result-track-wrap">
          <div class="result-track">
            <span class="result-fill" :style="{ width: `${score}%` }" :class="score >= 70 ? 'result-fill--pass' : 'result-fill--fail'" />
            <span class="result-threshold" />
          </div>
          <div class="result-threshold-label">70% — порог</div>
        </div>

        <p v-if="score >= 70" class="result-verdict result-verdict--pass">
          ✓ Тест пройден
        </p>
        <p v-else class="result-verdict result-verdict--fail">
          ✗ Тест не пройден. Попробуйте снова.
        </p>

        <div class="section-footer">
          <button class="btn btn--ghost" @click="startTest">Пересдать тест</button>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── Base ── */
.topic-page {
  font-family: 'Inter', sans-serif;
  color: var(--text);
  max-width: 820px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 18px;
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
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.btn--primary {
  background: var(--primary);
  color: var(--button-text);
  border-color: var(--text);
}

.btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(10, 10, 10, 0.2);
}

.btn--ghost {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.btn--ghost:hover {
  background: var(--surface-soft);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.06);
}

/* ── Tabs ── */
.topic-tabs {
  display: flex;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 4px;
  background: var(--surface-soft);
  align-self: flex-start;
}

.topic-tab {
  padding: 7px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.topic-tab:hover {
  color: var(--text);
  background: var(--surface);
}

.topic-tab.router-link-active {
  background: var(--primary);
  color: var(--button-text);
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.15);
}

/* ── Topic header ── */
.topic-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.topic-header-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.topic-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0;
  line-height: 1.2;
}

.topic-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* ── Badges ── */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 3px 10px;
}

.status--pass {
  background: var(--primary);
  color: var(--button-text);
  border-color: var(--text);
}

.status--fail {
  background: var(--surface-soft);
  color: var(--muted);
  border-color: var(--border);
}

.status--neutral {
  background: var(--surface-soft);
  color: var(--muted);
  border-color: var(--border);
}

/* ── Section label ── */
.section-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 14px;
}

/* ── Section card ── */
.section-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section-footer {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* ── Theory ── */
.theory-content {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 16px;
  overflow: auto;
  max-height: 420px;
}

.theory-pre {
  font-family: inherit;
  font-size: 14px;
  color: var(--text);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

/* ── Test meta ── */
.test-meta-row {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 14px 18px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  position: relative;
}

.test-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.meta-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.timer {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.timer--low {
  color: var(--muted);
}

.test-meta-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}

.test-progress-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--border);
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

.test-progress-fill {
  display: block;
  height: 100%;
  background: var(--primary);
  border-radius: inherit;
  transition: width 0.3s ease;
}

/* ── Question ── */
.question-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  background: var(--surface);
}

.question-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.5;
  margin: 0 0 16px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.option-item:hover {
  background: var(--surface-soft);
  transform: translateY(-1px);
}

.option-item--selected {
  border-color: var(--text);
  background: var(--surface-soft);
}

.option-radio {
  display: none;
}

.option-marker {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-radius: 100px;
  background: var(--surface);
  transition: border-color 0.15s ease, background 0.15s ease;
  position: relative;
}

.option-item--selected .option-marker {
  border-color: var(--text);
  background: var(--primary);
}

.option-item--selected .option-marker::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 5px;
  height: 5px;
  border-radius: 100px;
  background: #fff;
}

.option-text {
  font-size: 14px;
  color: var(--text);
  line-height: 1.4;
}

/* ── Result ── */
.result-card {
  gap: 16px;
}

.result-score-block {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.result-score-value {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
  line-height: 1;
}

.result-score-label {
  font-size: 13px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.result-track-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-track {
  width: 100%;
  height: 8px;
  border-radius: 100px;
  background: var(--border);
  overflow: visible;
  position: relative;
}

.result-fill {
  display: block;
  height: 100%;
  border-radius: 100px;
  transition: width 0.5s ease;
}

.result-fill--pass {
  background: var(--primary);
}

.result-fill--fail {
  background: var(--muted);
}

.result-threshold {
  position: absolute;
  left: 70%;
  top: -4px;
  width: 2px;
  height: 16px;
  background: var(--primary);
  border-radius: 100px;
}

.result-threshold-label {
  font-size: 11px;
  color: var(--muted);
  margin-left: calc(70% - 6px);
}

.result-verdict {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.result-verdict--pass {
  background: var(--surface-soft);
  color: var(--text);
  border-color: var(--border);
}

.result-verdict--fail {
  background: var(--surface-soft);
  color: var(--muted);
  border-color: var(--border);
}

/* ── Empty ── */
.empty-state {
  color: var(--muted);
  padding: 40px 0;
}

/* ── Adaptive ── */
@media (max-width: 640px) {
  .topic-title {
    font-size: 18px;
  }

  .topic-tabs {
    width: 100%;
  }

  .topic-tab {
    flex: 1;
    text-align: center;
  }

  .test-meta-row {
    padding: 12px 14px;
    gap: 12px;
  }

  .section-card {
    padding: 16px;
  }

  .result-score-value {
    font-size: 36px;
  }

  .section-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
