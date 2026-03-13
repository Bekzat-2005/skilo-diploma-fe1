<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { vacanciesApi, type Vacancy, type VacancyTaskLeaderboardResponse } from "@/features/vacancies/api/vacancies.api"

const router = useRouter()

// Штаттар (States)
const loading = ref(true)
const error = ref<string | null>(null)
const vacancies = ref<Vacancy[]>([])
const leaderboardByVacancy = ref<Record<string, VacancyTaskLeaderboardResponse>>({})
const openedLeadersVacancyId = ref<string | null>(null)

// 1. Деректерді жүктеу функциясы
const loadVacancies = async () => {
  try {
    loading.value = true
    error.value = null
    const data = await vacanciesApi.getVacancies()
    
    // Бэкендтен келген деректі массив екеніне тексеру
    vacancies.value = Array.isArray(data) ? data : []

    // Әр вакансияның лидербордын алдын-ала немесе қажет болғанда жүктеу
    // Бұл жерде алғашқы 3 вакансияның лидерлерін жүктеп қоямыз
    const initialLeaders = await Promise.all(
      vacancies.value.slice(0, 5).map(async (v) => {
        try {
          const lb = await vacanciesApi.getVacancyTaskLeaderboard(v.id, null)
          return [v.id, lb] as const
        } catch (e) {
          return [v.id, { leaders: [], vacancyId: v.id, vacancyTitle: v.title }] as const
        }
      })
    )
    leaderboardByVacancy.value = Object.fromEntries(initialLeaders)
  } catch (err) {
    console.error("Жүктеу қатесі:", err)
    error.value = "Вакансии загрузить не удалось. Проверьте соединение с сервером."
  } finally {
    loading.value = false
  }
}

// 2. Сұрыпталған вакансиялар (Computed)
const sortedVacancies = computed(() => {
  if (!vacancies.value) return []
  // Жаңа шыққандарын жоғары қою
  return [...vacancies.value].sort((a, b) => b.id.localeCompare(a.id))
})

// 3. Лидербордты ашу/жабу
const toggleVacancyLeaders = async (vacancyId: string) => {
  if (openedLeadersVacancyId.value === vacancyId) {
    openedLeadersVacancyId.value = null
    return
  }

  // Егер осы вакансияның лидерлері әлі жүктелмесе, жүктейміз
  if (!leaderboardByVacancy.value[vacancyId]) {
    try {
      const lb = await vacanciesApi.getVacancyTaskLeaderboard(vacancyId, null)
      leaderboardByVacancy.value[vacancyId] = lb
    } catch (e) {
      console.error("Лидерлерді жүктеу қатесі")
    }
  }
  
  openedLeadersVacancyId.value = vacancyId
}

// 4. Дайындық бетіне өту
const openPreparation = (vacancyId: string) => {
  router.push(`/vacancies/${vacancyId}/preparation`)
}

// Көмекші форматтау функциялары
const levelLabel = (level: string) => {
  const labels: Record<string, string> = {
    junior: "Junior",
    middle: "Middle",
    senior: "Senior",
    intern: "Стажер"
  }
  return labels[level.toLowerCase()] || level
}

const employmentLabel = (type: string) => {
  const types: Record<string, string> = {
    full_time: "Полная занятость",
    part_time: "Частичная",
    remote: "Удаленно",
    contract: "Контракт"
  }
  return types[type.toLowerCase()] || type
}

onMounted(() => {
  loadVacancies()
})
</script>

<template>
  <div class="vacancies-page">
    <header class="hero">
      <div>
        <p class="section-title">Карьерный трек</p>
        <h1>Вакансии</h1>
        <p class="hero-note">Выберите вакансию и перейдите в отдельный план подготовки с задачами, вопросами и тестом.</p>
      </div>
      <div class="hero-metrics">
        <div class="metric">
          <span>Открытых позиций</span>
          <strong>{{ sortedVacancies?.length || 0 }}</strong>
        </div>
        <div class="metric">
          <span>Компаний</span>
          <strong>{{ new Set(sortedVacancies?.map((item) => item.company) || []).size }}</strong>
        </div>
      </div>
    </header>

    <div v-if="loading" class="state-view">
      <span class="loader" />
      <p>Загрузка вакансий...</p>
    </div>

    <div v-else-if="error" class="state-view">
      <p class="error-text">{{ error }}</p>
    </div>

    <div v-else-if="!sortedVacancies.length" class="state-view">
      <p>Пока нет опубликованных вакансий.</p>
    </div>

    <div v-else class="vacancies-layout">
      <aside class="left-panel">
        <section class="panel-block">
          <p class="section-title">Навигация</p>
          <p class="panel-note">Откройте карточку справа, чтобы посмотреть обзор, лидеров и перейти к подготовке.</p>
        </section>

        <section class="panel-block compact-list">
          <p class="section-title">Список вакансий</p>
          <article v-for="vacancy in sortedVacancies" :key="`mini-${vacancy.id}`" class="mini-item">
            <div>
              <h4>{{ vacancy.title }}</h4>
              <p>{{ vacancy.company }}</p>
            </div>
            <span class="badge-pill">{{ levelLabel(vacancy.level) }}</span>
          </article>
        </section>
      </aside>

      <section class="right-panel">
        <div class="vacancy-grid">
          <article
            v-for="vacancy in sortedVacancies"
            :key="vacancy.id"
            class="vacancy-card"
          >
            <div class="card-top">
              <div>
                <h3>{{ vacancy.title }}</h3>
                <p class="company">{{ vacancy.company }} · {{ vacancy.location }}</p>
              </div>
              <span class="level-pill">{{ levelLabel(vacancy.level) }}</span>
            </div>

            <p class="summary">{{ vacancy.summary }}</p>

            <div class="meta-row">
              <span class="meta-chip">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                {{ employmentLabel(vacancy.employment) }}
              </span>
              <span class="meta-chip">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3l-5 3Z"/><path d="M12 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3l-5 3Z"/><path d="M7 14c3.22-2.91 4.29-8.75 5-12 1.66 2.38 4.94 9 5 12"/></svg>
                {{ vacancy.salaryRange }}
              </span>
              <span class="meta-chip accent">
                {{ vacancy.realTasks?.length || 0 }} {{ (vacancy.realTasks?.length || 0) === 1 ? 'задача' : 'задач' }}
              </span>
            </div>

            <div class="tags">
              <span v-for="tag in vacancy.tags" :key="tag">{{ tag }}</span>
            </div>

            <button class="btn-ghost" @click="toggleVacancyLeaders(vacancy.id)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {{ openedLeadersVacancyId === vacancy.id ? "Скрыть лидеров" : "Лидеры по задачам" }}
              <svg
                class="chevron"
                :class="{ rotated: openedLeadersVacancyId === vacancy.id }"
                xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              ><path d="m6 9 6 6 6-6"/></svg>
            </button>

            <transition name="slide">
              <div v-if="openedLeadersVacancyId === vacancy.id" class="leaders-panel">
                <div
                  v-for="leader in (leaderboardByVacancy[vacancy.id]?.leaders ?? []).slice(0, 3)"
                  :key="`vac-leader-${vacancy.id}-${leader.userId}`"
                  class="leader-row"
                >
                  <span
                    class="leader-rank"
                    :class="{ gold: leader.rank === 1, silver: leader.rank === 2, bronze: leader.rank === 3 }"
                  >{{ leader.rank }}</span>
                  <span class="leader-name">{{ leader.fullName }}</span>
                  <span class="leader-score">{{ leader.averageQualityScore }}<small>/100</small></span>
                </div>
                <p v-if="!(leaderboardByVacancy[vacancy.id]?.leaders ?? []).length" class="no-leaders">
                  Пока нет участников
                </p>
              </div>
            </transition>

            <button class="btn-primary" @click="openPreparation(vacancy.id)">
              Подготовка к вакансии
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.vacancies-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 18px 72px;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
}

.hero {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(165deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.hero h1 {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 6px;
}

.hero-note {
  margin: 0;
  color: var(--muted);
  max-width: 620px;
}

.hero-metrics {
  display: flex;
  gap: 10px;
}

.metric {
  min-width: 130px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 10px;
}

.metric span {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.metric strong {
  font-size: 24px;
  letter-spacing: -0.02em;
}

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

.error-text {
  color: var(--text);
}

.loader {
  width: 24px;
  height: 24px;
  border: 2.5px solid var(--border);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.vacancies-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 14px;
}

.left-panel,
.right-panel {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 14px;
}

.left-panel {
  display: grid;
  align-content: start;
  gap: 12px;
}

.panel-block {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 12px;
}

.panel-note {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.compact-list {
  max-height: 640px;
  overflow: auto;
}

.mini-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 8px;
  margin-bottom: 8px;
}

.mini-item:last-child {
  margin-bottom: 0;
}

.mini-item h4 {
  margin: 0;
  font-size: 13px;
}

.mini-item p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 4px 10px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}

.vacancy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.vacancy-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.vacancy-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(10, 10, 10, 0.06);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.card-top h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text);
  letter-spacing: -0.01em;
}

.company {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

.level-pill {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 5px 10px;
  border-radius: 100px;
  background: var(--surface-soft);
  color: var(--muted);
  border: 1px solid var(--border);
}

.summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 100px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
}

.meta-chip.accent {
  background: var(--primary);
  border-color: var(--text);
  color: #fff;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tags span {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 11px;
  border-radius: 100px;
  background: var(--surface-soft);
  color: var(--muted);
  border: 1px solid var(--border);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-ghost:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(10, 10, 10, 0.08);
}

.chevron {
  transition: transform 0.2s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.leaders-panel {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leader-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.leader-rank {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  background: var(--border);
  flex-shrink: 0;
}

.leader-rank.gold {
  background: var(--primary);
  color: #fff;
}

.leader-rank.silver {
  background: var(--text);
  color: #fff;
}

.leader-rank.bronze {
  background: var(--muted);
  color: #fff;
}

.leader-name {
  flex: 1;
  font-weight: 600;
  color: var(--primary-hover);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.leader-score {
  font-weight: 700;
  color: var(--text);
  flex-shrink: 0;
}

.leader-score small {
  font-weight: 500;
  color: var(--muted);
}

.no-leaders {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  text-align: center;
  padding: 6px 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 20px;
  border: 1px solid var(--primary);
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 980px) {
  .vacancies-layout {
    grid-template-columns: 1fr;
  }

  .left-panel {
    order: 2;
  }

  .right-panel {
    order: 1;
  }
}

@media (max-width: 640px) {
  .vacancies-page {
    padding: 16px 12px 56px;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero h1 {
    font-size: 24px;
  }

  .hero-metrics {
    width: 100%;
  }

  .metric {
    flex: 1;
    min-width: 0;
  }

  .vacancy-grid {
    grid-template-columns: 1fr;
  }

  .right-panel,
  .left-panel {
    padding: 10px;
  }
}
</style>
