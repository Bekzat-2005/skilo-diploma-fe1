<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { api } from "@/shared/api/client"
import { useSkillLevelsStore, type DirectionLevelResult } from "@/features/skill-levels/store/skillLevels"

import { mockRoadmaps } from "@/shared/mocks/mockRoadmaps"

const skillLevelsStore = useSkillLevelsStore()

const selectedRoadmapId = ref("frontend")
const isLoading = ref(false)
const isSubmitting = ref(false)
const isTestStarted = ref(false) // ЖАҢА: Тесттің басталғанын қадағалайтын айнымалы
const submitMessage = ref("")

const theoryQuestions = ref<any[]>([])
const writtenQuestions = ref<any[]>([])

const answers = ref<Record<string, number>>({})
const writtenAnswers = ref<Record<string, string>>({})

const MIN_WRITTEN_LENGTH = 40

const THEORY_OPTIONS = [
  { id: "theory_low", label: "Знаю только базу, без уверенной практики", score: 1 },
  { id: "theory_mid", label: "Понимаю теорию и решал(а) учебные/рабочие кейсы", score: 2 },
  { id: "theory_high", label: "Уверенно применяю в продакшене и могу объяснить другим", score: 3 }
]

const selectedRoadmap = computed(() => mockRoadmaps.find(r => r.id === selectedRoadmapId.value))
const selectedStoredLevel = computed(() => skillLevelsStore.getLevel(selectedRoadmapId.value))

const theoryAnsweredCount = computed(() => Object.keys(answers.value).length)
const writtenAnsweredCount = computed(() =>
  writtenQuestions.value.filter(q => (writtenAnswers.value[q.id]?.length || 0) >= MIN_WRITTEN_LENGTH).length
)
const answeredCount = computed(() => theoryAnsweredCount.value + writtenAnsweredCount.value)
const totalQuestions = computed(() => theoryQuestions.value.length + writtenQuestions.value.length)
const allAnswered = computed(() => answeredCount.value === totalQuestions.value && totalQuestions.value > 0)

const isWrittenAnswerValid = (text: string) => (text?.length || 0) >= MIN_WRITTEN_LENGTH
const writtenCharCount = (id: string) => writtenAnswers.value[id]?.length || 0
const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString("ru-RU")

const openDirection = (id: string) => {
  selectedRoadmapId.value = id
}

const resetCurrentAnswers = () => {
  answers.value = {}
  writtenQuestions.value.forEach(q => {
    writtenAnswers.value[q.id] = ""
  })
  submitMessage.value = ""
}

// ЖАҢА: 1. Бет жүктелгенде тек базадағы деңгейлерді синхрондау (ИИ-ға тиіспейміз)
const syncSkillLevels = async () => {
  try {
    const dbLevels = await api.getUserSkillLevels()
    dbLevels.forEach((level: any) => skillLevelsStore.setLevel(level))
  } catch (error) {
    console.error("Деңгейлерді алу қатесі:", error)
  }
}

// ЖАҢА: 2. Қолданушы "Начать тест" басқанда ИИ-ден тест сұрау
const startTest = async () => {
  if (!selectedRoadmapId.value) return

  try {
    isTestStarted.value = true
    isLoading.value = true
    
    theoryQuestions.value = []
    writtenQuestions.value = []
    resetCurrentAnswers()

    const data = await api.getAssessmentQuestions(selectedRoadmapId.value)

    if (data && data.theoryQuestions && data.writtenQuestions) {
      theoryQuestions.value = data.theoryQuestions.map((text: string, index: number) => ({
        id: `tq_${index}`,
        text: text,
        options: THEORY_OPTIONS
      }))

      writtenQuestions.value = data.writtenQuestions
      writtenQuestions.value.forEach(q => {
        writtenAnswers.value[q.id] = ""
      })
    }
  } catch (error) {
    console.error("Сұрақтарды жүктеу қатесі:", error)
    isTestStarted.value = false // Қате шықса, бастапқы қалпына қайтару
  } finally {
    isLoading.value = false
  }
}

// Қайта тапсыру логикасы
const retakeTest = () => {
  skillLevelsStore.clearLevel(selectedRoadmapId.value) 
  startTest() 
}

onMounted(() => {
  syncSkillLevels() // Тек базадан оқимыз
})

// ЖАҢА: Басқа бағытты (табты) басқанда терезені тазалап, бастапқы күйге келтіру
watch(selectedRoadmapId, () => {
  isTestStarted.value = false
  theoryQuestions.value = []
  writtenQuestions.value = []
})

const submitDirectionAssessment = async () => {
  if (!allAnswered.value) return

  try {
    isSubmitting.value = true
    submitMessage.value = "AI бағалауда... Күте тұрыңыз."

    let totalTheoryScore = 0
    Object.values(answers.value).forEach(score => {
      totalTheoryScore += score
    })

    const formattedWrittenAnswers = writtenQuestions.value.map(q => ({
      question: q.text,
      answer: writtenAnswers.value[q.id]
    }))

    const result = await api.submitAssessmentAnswers(selectedRoadmapId.value, {
      theoryScore: totalTheoryScore,
      writtenAnswers: formattedWrittenAnswers
    })

    const finalResult: DirectionLevelResult = {
      roadmapId: selectedRoadmapId.value,
      roadmapTitle: selectedRoadmap.value?.title || result.title || selectedRoadmapId.value,
      levelLabel: result.levelLabel,
      score: result.score,
      updatedAt: new Date().toISOString()
    }
    skillLevelsStore.setLevel(finalResult)
    
    // Сәтті өткен соң сұрақтарды жасырамыз
    theoryQuestions.value = []
    writtenQuestions.value = []
    isTestStarted.value = false // Тест бітті

  } catch (error) {
    console.error("Бағалау қатесі", error)
    submitMessage.value = "Қате кетті, серверді тексеріп қайта көріңіз."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="skill-level-page">
    <section class="hero-card">
      <div>
        <p class="hero-kicker">Определение уровня</p>
        <h1>Тесты по направлениям</h1>
        <p class="hero-note">
          Выберите направление и пройдите полную оценку: блок теории + письменные ответы. После этого получите уровень (Junior, Junior Strong, Middle, Middle Strong, Senior).
        </p>
      </div>
      <div class="hero-actions">
        <router-link class="hero-link" to="/profile">Перейти в профиль</router-link>
      </div>
    </section>

    <section class="flow-note info-flow">
      <p>Чем конкретнее письменные ответы, тем точнее итоговая оценка вашего уровня по направлению.</p>
      <p>Лучше проходить тесты по одному треку за раз, чтобы профиль уровней получился честным и полезным.</p>
    </section>

    <div class="layout">
      <aside class="direction-list">
        <h2>Направления</h2>
        <article
          v-for="roadmap in mockRoadmaps"
          :key="roadmap.id"
          class="direction-card"
          :class="{ active: roadmap.id === selectedRoadmapId }"
          @click="openDirection(roadmap.id)"
        >
          <div class="direction-main">
            <strong>{{ roadmap.title }}</strong>
            <small>{{ roadmap.description }}</small>
          </div>
          <span v-if="skillLevelsStore.getLevel(roadmap.id)" class="level-badge">
            {{ skillLevelsStore.getLevel(roadmap.id)?.levelLabel }}
          </span>
          <span v-else class="level-badge level-badge--empty">Не определен</span>
        </article>
      </aside>

      <section class="assessment-card">
        <div v-if="isLoading" class="loading-state" style="text-align: center; padding: 40px;">
          <h2>Сұрақтар дайындалуда...</h2>
          <p style="color: var(--muted);">AI сіздің деңгейіңізге сай бірегей сұрақтар құрастырып жатыр 🤖</p>
        </div>

        <article v-else-if="selectedStoredLevel" class="result-card" style="text-align: center; padding: 40px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
          <h2 style="color: #15803d; margin-bottom: 10px;">Бұл бағыт бойынша сіздің деңгейіңіз анықталған! 🎉</h2>
          <p style="font-size: 18px; margin-bottom: 5px;">Нәтиже: <strong>{{ selectedStoredLevel.levelLabel }}</strong></p>
          <span style="display: block; color: var(--muted); margin-bottom: 20px; font-size: 14px;">Орындалған уақыты: {{ formatDateTime(selectedStoredLevel.updatedAt) }}</span>
          
          <button class="btn-secondary" @click="retakeTest">Тестті қайта тапсыру</button>
        </article>

        <div v-else-if="!isTestStarted && selectedRoadmap" class="start-test-state" style="text-align: center; padding: 60px 20px;">
          <h2 style="margin-bottom: 10px;">{{ selectedRoadmap.title }}</h2>
          <p style="color: var(--muted); margin-bottom: 30px;">
            Осы бағыт бойынша біліміңізді тексеріп, деңгейіңізді анықтау үшін тестті бастаңыз.
          </p>
          <button class="btn-primary" style="padding: 12px 24px; font-size: 16px;" @click="startTest">
            Начать тест
          </button>
        </div>

        <template v-else-if="isTestStarted && totalQuestions > 0">
          <header class="assessment-head">
             <h2>{{ selectedRoadmap.title }}</h2>
             <p>
               Для этого направления: {{ theoryQuestions.length }} теоретических и
               {{ writtenQuestions.length }} письменных вопросов.
             </p>
          </header>

          <div class="progress-row">
            <span>
              {{ answeredCount }} / {{ totalQuestions }} (теория {{ theoryAnsweredCount }} / {{ theoryQuestions.length }},
              письменные {{ writtenAnsweredCount }} / {{ writtenQuestions.length }})
            </span>
            <div class="progress-track">
              <span :style="{ width: `${(answeredCount / totalQuestions) * 100}%` }" />
            </div>
          </div>

          <div class="question-list">
            <article
              v-for="(question, index) in theoryQuestions"
              :key="question.id"
              class="question-card"
            >
              <p class="question-title">{{ index + 1 }}. {{ question.text }}</p>

              <label
                v-for="option in question.options"
                :key="option.id"
                class="option-row"
                :class="{ selected: answers[question.id] === option.score }"
              >
                <input
                  v-model="answers[question.id]"
                  type="radio"
                  :name="question.id"
                  :value="option.score"
                />
                <span>{{ option.label }}</span>
              </label>
            </article>
          </div>

          <section v-if="writtenQuestions.length" class="written-section">
            <header class="written-head">
              <h3>Письменные вопросы</h3>
              <p>Каждый ответ обязателен, минимум {{ MIN_WRITTEN_LENGTH }} символов.</p>
            </header>

            <article
              v-for="(question, index) in writtenQuestions"
              :key="question.id"
              class="written-card"
            >
              <p class="written-title">{{ index + 1 }}. {{ question.text }}</p>
              <p class="written-hint">{{ question.hint }}</p>
              <textarea
                v-model="writtenAnswers[question.id]"
                class="written-input"
                :class="{
                  invalid:
                    !!writtenAnswers[question.id] && !isWrittenAnswerValid(writtenAnswers[question.id])
                }"
                :placeholder="question.placeholder"
                rows="5"
              />
              <div class="written-meta">
                <span>Минимум {{ MIN_WRITTEN_LENGTH }} символов</span>
                <span :class="{ ready: isWrittenAnswerValid(writtenAnswers[question.id]) }">
                  {{ writtenCharCount(question.id) }} символов
                </span>
              </div>
            </article>
          </section>

          <div class="assessment-actions">
            <button class="btn-primary" :disabled="!allAnswered || isSubmitting" @click="submitDirectionAssessment">
              {{ isSubmitting ? 'Бағалануда...' : 'Определить уровень' }}
            </button>
            <button class="btn-secondary" @click="resetCurrentAnswers" :disabled="isSubmitting">Очистить ответы</button>
          </div>

          <p v-if="submitMessage" class="submit-note">{{ submitMessage }}</p>
        </template>

        <p v-else class="empty-note">Для выбранного направления пока нет полного набора вопросов.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.skill-level-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 10px 8px 36px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.flow-note {
  padding: 0 4px;
}

.hero-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hero-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.hero-card h1 {
  margin: 0 0 6px;
  font-size: 28px;
  line-height: 1.1;
  color: var(--text);
}

.hero-note {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  max-width: 70ch;
}

.hero-link {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}

.layout {
  display: grid;
  grid-template-columns: minmax(250px, 0.75fr) minmax(420px, 1.25fr);
  gap: 18px;
}

.direction-list,
.assessment-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 14px;
}

.direction-list h2,
.assessment-head h2 {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--text);
}

.direction-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.direction-card:last-child {
  margin-bottom: 0;
}

.direction-card.active {
  border-color: var(--primary);
  background: rgba(255, 142, 60, 0.14);
}

.direction-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.direction-main strong {
  font-size: 14px;
  color: var(--text);
}

.direction-main small {
  font-size: 12px;
  color: var(--muted);
}

.level-badge {
  align-self: flex-start;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  background: var(--surface);
  white-space: nowrap;
}

.level-badge--empty {
  color: var(--muted);
}

.assessment-head p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.progress-row {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-row span {
  font-size: 12px;
  color: var(--muted);
}

.progress-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.question-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.question-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
}

.question-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
}

.option-row.selected {
  border-color: var(--primary);
  background: rgba(255, 142, 60, 0.12);
}

.written-section {
  margin-top: 12px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.written-head h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text);
}

.written-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.written-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
}

.written-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.written-hint {
  margin: 6px 0 8px;
  font-size: 12px;
  color: var(--muted);
}

.written-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 10px;
  resize: vertical;
  min-height: 110px;
}

.written-input::placeholder {
  color: var(--muted);
}

.written-input:focus {
  outline: none;
  border-color: var(--primary);
}

.written-input.invalid {
  border-color: #ef4444;
}

.written-meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
}

.written-meta .ready {
  color: #15803d;
  font-weight: 600;
}

.assessment-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.submit-note {
  margin: 10px 0 0;
  color: #15803d;
  font-size: 13px;
  font-weight: 600;
}

.result-card {
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-card p,
.result-card span {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.result-card strong {
  font-size: 16px;
  color: var(--text);
}

.empty-note {
  margin: 0;
  color: var(--muted);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-card h1 {
    font-size: 23px;
  }

  .assessment-actions {
    flex-direction: column;
  }
}
</style>
