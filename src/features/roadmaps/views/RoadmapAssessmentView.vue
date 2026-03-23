<script setup lang="ts">
import { computed, ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useRoadmapsStore, type RoadmapLevel } from "@/features/roadmaps/store/roadmaps"
import { useAuthStore } from "@/features/auth/store/auth"
import { roadmapsApi } from "@/features/roadmaps/api/roadmaps.api"

const route = useRoute()
const router = useRouter()
const roadmapsStore = useRoadmapsStore()
const authStore = useAuthStore()

const roadmapId = route.params.id as string
const roadmap = computed(() => roadmapsStore.allRoadmaps.find(r => r.id === roadmapId))

const assessment = ref<any>(null)
const loading = ref(true)

const submitting = ref(false);

const answers = ref<Record<string, number>>({})
const completed = ref(false)
const detectedLevel = ref<RoadmapLevel | null>(null)

onMounted(async () => {
  // Алдымен барлық бағыттар жүктелгеніне көз жеткіземіз
  await roadmapsStore.loadAllRoadmaps()
  
  try {
    // Бэкендтен ассессмент (бастапқы тест) сұрақтарын алу
    assessment.value = await roadmapsApi.getAssessment(roadmapId)
  } catch (e) {
    console.error("Assessment жүктелмеді", e)
  } finally {
    loading.value = false
  }
})

const allAnswered = computed(() => {
  if (!assessment.value?.questions) return false
  return assessment.value.questions.every((q: any) => answers.value[q.id] !== undefined)
})

const answeredCount = computed(() => {
  if (!assessment.value?.questions) return 0
  return assessment.value.questions.filter((q: any) => answers.value[q.id] !== undefined).length
})

const submitAssessment = async () => {
  if (!assessment.value || !allAnswered.value || submitting.value) return;

  try {
    submitting.value = true; // Жүктелуді бастау

    const response = await roadmapsApi.submitAssessment(roadmapId, answers.value);
    detectedLevel.value = response.level;
    
    // Store-ға қосу (Тек локалдық жаңарту, өйткені бэкендте қосылып қойды)
    await roadmapsStore.loadUserRoadmapCollection(authStore.user?.id ?? null);
    await roadmapsStore.loadUserProgress(); // Прогресті де қайта жүктеу
    
    completed.value = true; // Сәтті аяқталды бетіне өту
  } catch (error) {
    console.error("Тестті жіберу кезінде қате шықты", error);
    alert("Қате кетті. Қайта көріңіз."); // Пайдаланушыға ескерту
  } finally {
    submitting.value = false; // Жүктелуді тоқтату
  }
};

const goToRoadmap = () => {
  router.push(`/roadmaps/${roadmapId}`)
}
</script>

<template>
  <div class="assessment-page">
    <!-- Not found -->
    <div v-if="!roadmap || !assessment" class="state-view">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <p>Оценка не найдена</p>
    </div>

    <!-- Assessment Form -->
    <div v-else-if="!completed" class="section-card">
      <header class="form-header">
        <h1>{{ roadmap.title }}</h1>
        <p>Ответьте на несколько вопросов, чтобы определить ваш текущий уровень</p>
      </header>

      <div class="progress-bar-wrap">
        <div class="progress-info">
          <span>{{ answeredCount }} из {{ assessment.questions.length }}</span>
          <span v-if="allAnswered" class="ready-badge">Готово к отправке</span>
        </div>
        <div class="progress-track">
          <span :style="{ width: `${(answeredCount / assessment.questions.length) * 100}%` }" />
        </div>
      </div>

      <div class="questions-list">
        <article
          v-for="(question, qi) in assessment.questions"
          :key="question.id"
          class="question-card"
          :class="{ answered: answers[question.id] !== undefined }"
        >
          <div class="question-head">
            <span class="question-num">{{ qi + 1 }}</span>
            <p class="question-text">{{ question.text }}</p>
          </div>

          <div class="options-list">
            <label
              v-for="option in question.options"
              :key="option.id"
              class="option-label"
              :class="{ selected: answers[question.id] === option.score }"
            >
              <input
                :name="question.id"
                type="radio"
                :value="option.score"
                v-model="answers[question.id]"
                class="sr-only"
              />
              <span class="option-radio" />
              {{ option.label }}
            </label>
          </div>
        </article>
      </div>

      <div class="submit-row">
        <button
          class="btn-primary"
          :class="{ disabled: !allAnswered || submitting }"
          :disabled="!allAnswered || submitting"
          @click="submitAssessment"
        >
          {{ submitting ? 'Сақталуда...' : 'Добавить направление' }}
          <svg v-if="!submitting" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </div>

    <!-- Result -->
    <div v-else class="section-card result-card">
      <div class="result-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <h2>Направление добавлено</h2>
      <p>
        Определённый уровень для <strong>{{ roadmap.title }}</strong>:
      </p>
      <span class="level-pill">{{ detectedLevel }}</span>
      <button class="btn-primary" @click="goToRoadmap">
        Открыть roadmap
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.assessment-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 20px 80px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* State */
.state-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px 0;
  gap: 12px;
}

.state-view p {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
}

/* Section Card */
.section-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 28px 24px;
}

/* Form Header */
.form-header {
  margin-bottom: 20px;
}

.form-header h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: var(--text);
}

.form-header p {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* Progress */
.progress-bar-wrap {
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-info span {
  font-size: 13px;
  color: var(--muted);
}

.ready-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 100px;
  background: var(--primary);
  color: var(--button-text);
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

/* Questions */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.question-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 16px;
  background: var(--surface-soft);
  transition: border-color 0.15s ease;
}

.question-card.answered {
  border-color: var(--border);
  background: var(--surface);
}

.question-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.question-num {
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

.question-card.answered .question-num {
  background: var(--primary);
  color: #fff;
}

.question-text {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  padding-top: 3px;
}

/* Options */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 40px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-label:hover {
  border-color: var(--border);
  background: var(--surface-soft);
}

.option-label.selected {
  border-color: var(--text);
  background: var(--surface-soft);
  color: var(--text);
}

.option-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
  position: relative;
  transition: all 0.15s ease;
}

.option-label.selected .option-radio {
  border-color: var(--text);
}

.option-label.selected .option-radio::after {
  content: "";
  position: absolute;
  inset: 3px;
  background: var(--primary);
  border-radius: 50%;
}

/* Submit */
.submit-row {
  display: flex;
  justify-content: flex-end;
}

/* Result */
.result-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
}

.result-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.result-card h2 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0;
}

.result-card p {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
}

.result-card p strong {
  color: var(--text);
}

.level-pill {
  font-size: 14px;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 100px;
  background: var(--surface-soft);
  color: var(--text);
  border: 1px solid var(--border);
  margin-bottom: 4px;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 15px;
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

.btn-primary.disabled {
  background: var(--border);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive */
@media (max-width: 640px) {
  .assessment-page {
    padding: 32px 16px 60px;
  }

  .section-card {
    padding: 20px 16px;
  }

  .form-header h1 {
    font-size: 20px;
  }

  .options-list {
    padding-left: 0;
  }

  .result-card {
    padding: 36px 16px;
  }
}
</style>
