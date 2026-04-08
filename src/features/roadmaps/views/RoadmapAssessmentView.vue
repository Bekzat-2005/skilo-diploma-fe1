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
const submitting = ref(false)

// Жауаптарды сақтау: { "сұрақ_тексті": "қолданушы_жауабы" }
const answers = ref<Record<string, string>>({})
const completed = ref(false)
const detectedLevel = ref<RoadmapLevel | null>(null)
const aiFeedback = ref("")

onMounted(async () => {
  await roadmapsStore.loadAllRoadmaps()
  try {
    assessment.value = await roadmapsApi.getAssessment(roadmapId)
  } catch (e) {
    console.error("Assessment жүктелмеді", e)
  } finally {
    loading.value = false
  }
})

// Сұрақтарды біріктіру (Теория + Жазбаша)
const currentQuestions = computed(() => {
  if (!assessment.value) return []
  const theory = (assessment.value.theoryQuestions || []).map((q: any) => 
    typeof q === 'string' ? { id: q, text: q, isWritten: true } : { ...q, isWritten: true }
  )
  const written = (assessment.value.writtenQuestions || []).map((q: any) => ({ ...q, isWritten: true }))
  return [...theory, ...written]
})

const answeredCount = computed(() => {
  return currentQuestions.value.filter(q => answers.value[q.id] && answers.value[q.id].trim().length > 5).length
})

const allAnswered = computed(() => {
  return currentQuestions.value.length > 0 && answeredCount.value === currentQuestions.value.length
})

const submitAssessment = async () => {
  if (!allAnswered.value || submitting.value) return
  
  submitting.value = true
  
  try {
    // Бэкенд күтетін форматқа келтіру
    const payload = {
      writtenAnswers: currentQuestions.value.map(q => ({
        question: q.text,
        answer: answers.value[q.id]
      }))
    }

    const response = await roadmapsApi.submitAssessment(roadmapId, payload)
    
    detectedLevel.value = response.levelLabel || response.level
    aiFeedback.value = response.feedback || ""
    
    if (authStore.user?.id) {
      await roadmapsStore.loadUserRoadmapCollection(authStore.user.id)
    }
    completed.value = true
  } catch (error) {
    alert("ИИ талдау кезінде қате кетті. Қайта көріңіз.")
  } finally {
    submitting.value = false
  }
}

const goToRoadmap = () => router.push(`/roadmaps/${roadmapId}`)
</script>

<template>
  <div class="assessment-page">
    <div v-if="loading" class="state-view">Жүктелуде...</div>

    <div v-else-if="submitting" class="state-view ai-processing">
      <div class="ai-orb"></div>
      <h2>ИИ сіздің жауаптарыңызды талдауда...</h2>
      <p>Біз сіздің деңгейіңізді анықтап, оқу бағдарламасын дайындап жатырмыз.</p>
    </div>

    <div v-else-if="!completed" class="section-card">
      <header class="form-header">
        <h1>{{ roadmap?.title }}</h1>
        <p>Келесі сұрақтарға жазбаша жауап беріңіз. ИИ сіздің біліміңізді бағалайды.</p>
        
        <div class="progress-bar-wrap">
          <div class="progress-info">
            <span>{{ answeredCount }} / {{ currentQuestions.length }} сұраққа жауап берілді</span>
          </div>
          <div class="progress-track">
            <span :style="{ width: `${(answeredCount / currentQuestions.length) * 100}%` }" />
          </div>
        </div>
      </header>

      <div class="questions-list">
        <article v-for="(question, index) in currentQuestions" :key="index" class="question-card">
          <div class="question-head">
            <span class="question-num">{{ index + 1 }}</span>
            <p class="question-text">{{ question.text }}</p>
          </div>
          
          <div class="answer-area">
            <textarea
              v-model="answers[question.id]"
              class="answer-textarea"
              :placeholder="question.placeholder || 'Жауабыңызды осында жазыңыз...'"
            ></textarea>
            <small v-if="question.hint" class="hint-text">Көмек: {{ question.hint }}</small>
          </div>
        </article>
      </div>

      <div class="submit-row">
        <button 
          class="btn-primary" 
          :disabled="!allAnswered"
          @click="submitAssessment"
        >
          Нәтижені алу
        </button>
      </div>
    </div>

    <div v-else class="section-card result-card">
      <div class="result-icon">✓</div>
      <h2>Талдау аяқталды</h2>
      <p>Сіздің деңгейіңіз:</p>
      <span class="level-pill">{{ detectedLevel }}</span>
      <p v-if="aiFeedback" class="ai-feedback">"{{ aiFeedback }}"</p>
      <button class="btn-primary" @click="goToRoadmap">Roadmap-қа өту</button>
    </div>
  </div>
</template>

<style scoped>
.ai-processing { text-align: center; padding: 60px 20px; }
.ai-orb {
  width: 60px; height: 60px; margin: 0 auto 20px;
  border-radius: 50%;
  background: linear-gradient(45deg, var(--primary), #8e44ad);
  box-shadow: 0 0 20px var(--primary);
  animation: pulse 1.5s infinite ease-in-out;
}
@keyframes pulse { 
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}
.answer-textarea {
  width: 100%; min-height: 120px; padding: 15px;
  border-radius: 12px; border: 1px solid var(--border);
  background: var(--surface-soft); color: var(--text);
  font-family: inherit; font-size: 15px; resize: vertical;
  transition: border-color 0.3s;
}
.answer-textarea:focus { border-color: var(--primary); outline: none; }
.hint-text { display: block; margin-top: 8px; color: var(--muted); font-style: italic; }
.ai-feedback { margin-top: 15px; font-style: italic; color: var(--muted); padding: 0 20px; }
/* Қалған стильдер сіздікі... */
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
