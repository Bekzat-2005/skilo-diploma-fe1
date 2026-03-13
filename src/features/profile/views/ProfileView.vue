<script setup lang="ts">
import { computed, ref, onMounted, reactive } from "vue"
import { useRouter } from "vue-router"
import { useRoadmapsStore } from "@/features/roadmaps/store/roadmaps"
import { useSkillLevelsStore } from "@/features/skill-levels/store/skillLevels"
import { profileApi, type UserActivityDay } from "@/features/profile/api/profile.api"
import { useAuthStore } from "@/features/auth/store/auth"

const router = useRouter()
const roadmapsStore = useRoadmapsStore()
const skillLevelsStore = useSkillLevelsStore()
const authStore = useAuthStore()

// --- 1. НЕГІЗГІ ДЕРЕКТЕР ---
const userProfile = ref<any>(null)
const profile = computed(() => userProfile.value) // Шаблондағы 'profile' үшін алиас
const loading = ref(true)
const error = ref<string | null>(null)
const activity = ref<UserActivityDay[]>([])
const activityLoading = ref(false)

// Статистика мен интерфейс үшін
const profilePoints = ref(1250)
const activityViewMode = ref('heatmap')
const activityChartRange = ref('month')
const activityChartData = ref([])
const activityChartMax = ref(100)
const directionLevelsRows = ref([])
const resumeActionMessage = ref('')

// Computed Display мәндері
const displayFullName = computed(() => userProfile.value?.fullName || 'Пайдаланушы')
const displayEmail = computed(() => userProfile.value?.email || 'email@example.com')
const displayUniversity = computed(() => userProfile.value?.university || 'Жоғары оқу орны')
const displayLocation = computed(() => {
  if (!userProfile.value) return 'Қазақстан'
  return [userProfile.value.city, userProfile.value.country].filter(Boolean).join(", ") || 'Қазақстан'
})
const myRoadmaps = computed(() => roadmapsStore.myRoadmaps)

const userDetails = computed(() => {
  if (!userProfile.value) return []
  return [
    { label: "Email", value: userProfile.value.email },
    { label: "Университет", value: userProfile.value.university || 'Анықталмаған' },
    { label: "Тіркелген күні", value: new Date(userProfile.value.createdAt).toLocaleDateString() }
  ]
})

// --- 2. БЕЛСЕНДІЛІК (HEATMAP) ---
const activityStats = reactive({ totalActiveDays: 0, totalPoints: 0 })
const toRuDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU')

const activityWeeks = computed(() => {
  if (!activity.value.length) return []
  const weeks: any[][] = []
  let currentWeek: any[] = []
  activity.value.forEach((day, i) => {
    const level = day.count > 10 ? 4 : day.count > 5 ? 3 : day.count > 0 ? 1 : 0
    currentWeek.push({ ...day, level })
    if (currentWeek.length === 7 || i === activity.value.length - 1) {
      weeks.push(currentWeek); currentWeek = []
    }
  })
  return weeks
})

// --- 3. РАДАР ДИАГРАММАСЫ (KNOWLEDGE RADAR) - ТҮЗЕТІЛДІ ---
const radarSize = 300
const radarCenter = 150
const rawSkills = ref([
  { id: 'frontend', label: 'Frontend', value: 80 },
  { id: 'backend', label: 'Backend', value: 60 },
  { id: 'db', label: 'Database', value: 70 },
  { id: 'devops', label: 'DevOps', value: 40 },
  { id: 'soft', label: 'Soft Skills', value: 90 }
])

const getPoint = (index: number, total: number, value: number, radius: number) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  const r = (radius * value) / 100
  return { x: radarCenter + r * Math.cos(angle), y: radarCenter + r * Math.sin(angle) }
}

// Шаблонда қолданылатын басты айнымалы
const radarAxes = computed(() => {
  const total = rawSkills.value.length
  return rawSkills.value.map((s, i) => ({
    ...s,
    end: getPoint(i, total, 100, 100),
    valuePoint: getPoint(i, total, s.value, 100),
    labelPoint: getPoint(i, total, 125, 100)
  }))
})

// Бұл функцияны script setup ішіне кез келген жерге қосыңыз
const handleLogout = async () => {
  if (confirm("Шынмен де аккаунттан шыққыңыз келе ме?")) {
    try {
      // authStore ішінде logout функциясы бар деп есептейміз
      await authStore.logout(); 
      // Токенді тазалау (егер store ішінде жасалмаса)
      localStorage.removeItem('token');
      // Логин бетіне бағыттау
      router.push('/login');
    } catch (e) {
      console.error("Шығу кезінде қате кетті:", e);
      // Қате болса да, логинге жібере береміз
      router.push('/login');
    }
  }
}

const radarGridPolygons = computed(() => [20, 40, 60, 80, 100].map(lv => ({
  level: lv,
  points: rawSkills.value.map((_, i) => {
    const p = getPoint(i, rawSkills.value.length, lv, 100)
    return `${p.x},${p.y}`
  }).join(' ')
})))

const radarKnowledgePolygon = computed(() => 
  radarAxes.value.map(a => `${a.valuePoint.x},${a.valuePoint.y}`).join(' ')
)

const knowledgeAverage = computed(() => {
  const sum = rawSkills.value.reduce((acc, s) => acc + s.value, 0)
  return Math.round(sum / rawSkills.value.length)
})

// --- 4. РЕЗЮМЕ ЖӘНЕ СЕРТИФИКАТ ---
const resumeForm = reactive({ desiredRole: '', phone: '', portfolioUrl: '', githubUrl: '', linkedinUrl: '', extraSkills: '', summary: '', experience: '', achievements: '' })
const generatingResume = ref(false)
const generatedResume = ref<any>(null)
const generatingCertificate = ref(false)
const generatedCertificate = ref<any>(null)
const certificateIdInput = ref('')
const certificateAccessGranted = ref(false)
const certificateAccessError = ref('')

// --- 5. ЖҮКТЕУ ЛОГИКАСЫ ---
onMounted(async () => {
  try {
    loading.value = true
    const res = await profileApi.getProfile()
    userProfile.value = res.data || res
    
    activityLoading.value = true
    const actData = await profileApi.getUserYearActivity(authStore.user?.id ?? null)
    activity.value = actData
    activityStats.totalActiveDays = actData.filter(d => d.count > 0).length
    activityStats.totalPoints = actData.reduce((s, d) => s + d.count, 0)
  } catch (e) {
    error.value = "Деректерді алу мүмкін болмады"
  } finally {
    loading.value = false
    activityLoading.value = false
  }
  void roadmapsStore.loadUserRoadmapCollection(authStore.user?.id ?? null)
})

const generateResume = () => { generatingResume.value = true; setTimeout(() => { generatingResume.value = false }, 1000) }
const generateCertificate = () => { generatingCertificate.value = true; setTimeout(() => { generatingCertificate.value = false }, 1000) }
const verifyCertificateAccess = () => { certificateAccessGranted.value = true }
const buildResumeForDirection = (id: string) => {}
const handleResumeAction = (a: string) => {}
const handleCertificateAction = (a: string) => {}
</script>

<template>
  <div class="profile-page">

    <!-- Loading -->
    <div v-if="loading" class="state-view">
      <span class="loader" />
      <p>Загрузка профиля...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="state-view">
      <p class="error-text">{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else-if="profile" class="profile-content">

      <!-- Header -->
      <header class="section profile-header">
        <div class="avatar-placeholder">
          {{ displayFullName.charAt(0) }}
        </div>
        <div class="profile-info">
          <h1>{{ displayFullName }}</h1>
          <p class="profile-email">{{ displayEmail }}</p>
          <div class="profile-meta">
            <span>📍 {{ displayLocation }}</span>
            <span>🎓 {{ displayUniversity }}</span>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn btn--danger-ghost" @click="handleLogout" style="color: #dc2626; border: 1px solid #fee2e2; background: #fef2f2;">
            Выйти
          </button>
        </div>
      </header>

      <div class="stats-grid">
        <article class="stat-card">
          <strong>{{ userProfile?.completedTests || 0 }}</strong>
          <span>Аяқталған тесттер</span>
        </article>
        <article class="stat-card">
          <strong>{{ myRoadmaps.length }}</strong>
          <span>Белсенді бағыттар</span>
        </article>
      </div>

      <!-- Meta Stats -->
      <div class="meta-grid">
        <div class="meta-card">
          <span>Дата регистрации</span>
          <strong>{{ profile.joinedAt }}</strong>
        </div>
        <div class="meta-card">
          <span>Пройдено тестов</span>
          <strong>{{ profile.completedTests }}</strong>
        </div>
        <div class="meta-card">
          <span>Очки</span>
          <strong class="trophy-value">
            <svg class="trophy-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 4h8v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-.17A6.01 6.01 0 0 1 13 16.92V19h3v2H8v-2h3v-2.08A6.01 6.01 0 0 1 9.17 13H9a5 5 0 0 1-5-5V7a1 1 0 0 1 1-1h3V4Zm-2 4a3 3 0 0 0 3 3h.03A6.03 6.03 0 0 1 8 8V8H6Zm12 0v0a6.03 6.03 0 0 1-1.03 3H17a3 3 0 0 0 3-3h-2Z" fill="currentColor"/>
            </svg>
            {{ profilePoints ?? "---" }}
          </strong>
        </div>
      </div>

      <!-- Skills -->
      <section class="section">
        <h2 class="section-title">Навыки</h2>
        <div class="tag-list">
          <span v-for="skill in profile.skills" :key="skill" class="tag">{{ skill }}</span>
        </div>
      </section>

      <!-- Achievements -->
      <section class="section">
        <h2 class="section-title">Достижения</h2>
        <ul class="ach-list">
          <li v-for="ach in profile.achievements" :key="ach">
            <span class="ach-dot" />
            {{ ach }}
          </li>
        </ul>
      </section>

      <!-- User Details -->
      <section class="section">
        <h2 class="section-title">Данные пользователя</h2>
        <p v-if="!userDetails.length" class="muted">Данные пользователя не загружены.</p>
        <div v-else class="details-grid">
          <div v-for="item in userDetails" :key="item.label" class="detail-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <!-- Activity -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Активность за год</h2>
          <p class="section-note">Рассчитывается автоматически по результатам тестов.</p>
        </div>

        <div class="activity-stats">
          <span>Активных дней: <strong>{{ activityStats.totalActiveDays }}</strong></span>
          <span>Сумма: <strong>{{ activityStats.totalPoints }}</strong></span>
        </div>

        <div class="toggle-bar">
          <div class="toggle-group">
            <button
              :class="{ active: activityViewMode === 'heatmap' }"
              @click="activityViewMode = 'heatmap'"
            >Тепловая карта</button>
            <button
              :class="{ active: activityViewMode === 'chart' }"
              @click="activityViewMode = 'chart'"
            >Диаграмма</button>
          </div>

          <div v-if="activityViewMode === 'chart'" class="toggle-group">
            <button :class="{ active: activityChartRange === 'day' }" @click="activityChartRange = 'day'">Дни</button>
            <button :class="{ active: activityChartRange === 'week' }" @click="activityChartRange = 'week'">Недели</button>
            <button :class="{ active: activityChartRange === 'month' }" @click="activityChartRange = 'month'">Месяцы</button>
            <button :class="{ active: activityChartRange === 'year' }" @click="activityChartRange = 'year'">Годы</button>
          </div>
        </div>

        <div v-if="activityLoading" class="muted">Загрузка активности...</div>

        <!-- Heatmap -->
        <div v-else-if="activityViewMode === 'heatmap'" class="heatmap-wrap">
          <div class="heatmap" aria-label="Годовая активность">
            <div v-for="(week, wi) in activityWeeks" :key="`w-${wi}`" class="heatmap-week">
              <span
                v-for="(day, di) in week"
                :key="`d-${wi}-${di}`"
                class="heatmap-day"
                :class="day ? `level-${day.level}` : 'level-empty'"
                :title="day ? `${toRuDate(day.date)} - уровень ${day.level}` : ''"
              />
            </div>
          </div>
          <div class="heatmap-legend">
            <span>Меньше</span>
            <i class="heatmap-day level-0" />
            <i class="heatmap-day level-1" />
            <i class="heatmap-day level-2" />
            <i class="heatmap-day level-3" />
            <i class="heatmap-day level-4" />
            <span>Больше</span>
          </div>
        </div>

        <!-- Chart -->
        <div v-else class="chart-wrap">
          <div class="chart">
            <div v-for="(item, index) in activityChartData" :key="`${item.label}-${index}`" class="bar-col">
              <div class="bar-shell">
                <span class="bar-fill" :style="{ height: `${Math.max(4, (item.value / activityChartMax) * 100)}%` }" />
              </div>
              <span class="bar-label">{{ item.label }}</span>
              <span class="bar-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Knowledge Radar -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Паутина знаний</h2>
          <p class="section-note">Распределение уровня по ключевым направлениям.</p>
        </div>

        <div class="knowledge-shell">
          <div class="knowledge-radar-card">
            <svg
              class="knowledge-radar"
              :viewBox="`0 0 ${radarSize} ${radarSize}`"
              aria-label="Диаграмма знаний по направлениям"
            >
              <g class="radar-grid">
                <polygon
                  v-for="item in radarGridPolygons"
                  :key="`grid-${item.level}`"
                  :points="item.points"
                />
              </g>

              <g class="radar-axis">
                <line
                  v-for="axis in radarAxes"
                  :key="`axis-${axis.id}`"
                  :x1="radarCenter"
                  :y1="radarCenter"
                  :x2="axis.end.x"
                  :y2="axis.end.y"
                />
              </g>

              <polygon v-if="radarKnowledgePolygon" class="radar-shape" :points="radarKnowledgePolygon" />

              <g class="radar-points">
                <circle
                  v-for="axis in radarAxes"
                  :key="`point-${axis.id}`"
                  :cx="axis.valuePoint.x"
                  :cy="axis.valuePoint.y"
                  r="4"
                />
              </g>

              <g class="radar-labels">
                <text
                  v-for="axis in radarAxes"
                  :key="`label-${axis.id}`"
                  :x="axis.labelPoint.x"
                  :y="axis.labelPoint.y"
                  text-anchor="middle"
                  dominant-baseline="middle"
                >
                  {{ axis.label }}
                </text>
              </g>
            </svg>
          </div>

          <div class="knowledge-stats">
            <div class="knowledge-summary">
              <span>Средний уровень</span>
              <strong>{{ knowledgeAverage }}%</strong>
            </div>

            <div class="knowledge-list">
              <article v-for="axis in radarAxes" :key="`stat-${axis.id}`" class="knowledge-item">
                <div class="knowledge-item-head">
                  <span>{{ axis.label }}</span>
                  <strong>{{ axis.value }}%</strong>
                </div>
                <div class="knowledge-track">
                  <span :style="{ width: `${axis.value}%` }" />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- Resume -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Резюме</h2>
          <p class="section-note">Заполните поля от себя и сформируйте резюме через платформу.</p>
        </div>

        <details class="resume-fields-panel">
          <summary>Добавить поля от себя (опционально)</summary>

          <div class="resume-fields-body">
            <div class="resume-form-grid">
              <label class="resume-field">
                <span>Желаемая позиция</span>
                <input v-model="resumeForm.desiredRole" type="text" placeholder="Например: Frontend Developer" />
              </label>

              <label class="resume-field">
                <span>Телефон</span>
                <input v-model="resumeForm.phone" type="text" placeholder="+7 777 000 00 00" />
              </label>

              <label class="resume-field">
                <span>Портфолио</span>
                <input v-model="resumeForm.portfolioUrl" type="text" placeholder="https://portfolio.example" />
              </label>

              <label class="resume-field">
                <span>GitHub</span>
                <input v-model="resumeForm.githubUrl" type="text" placeholder="https://github.com/username" />
              </label>

              <label class="resume-field">
                <span>LinkedIn</span>
                <input v-model="resumeForm.linkedinUrl" type="text" placeholder="https://linkedin.com/in/username" />
              </label>

              <label class="resume-field resume-field--wide">
                <span>Дополнительные навыки (через запятую)</span>
                <input v-model="resumeForm.extraSkills" type="text" placeholder="TypeScript, Docker, SQL" />
              </label>

              <label class="resume-field resume-field--wide">
                <span>О себе</span>
                <textarea
                  v-model="resumeForm.summary"
                  rows="3"
                  placeholder="Кратко опишите ваш профиль, сильные стороны и карьерные цели"
                />
              </label>

              <label class="resume-field resume-field--wide">
                <span>Опыт</span>
                <textarea
                  v-model="resumeForm.experience"
                  rows="3"
                  placeholder="Укажите ваш опыт: стажировки, проекты, коммерческая разработка"
                />
              </label>

              <label class="resume-field resume-field--wide">
                <span>Достижения</span>
                <textarea
                  v-model="resumeForm.achievements"
                  rows="3"
                  placeholder="Опишите ваши достижения: конкурсы, хакатоны, результаты проектов"
                />
              </label>
            </div>
          </div>
        </details>

        <button class="btn-primary" :disabled="generatingResume" @click="generateResume">
          <span v-if="generatingResume" class="spinner" />
          {{ generatingResume ? "Генерация..." : "Сгенерировать резюме" }}
        </button>

        <div v-if="generatedResume" class="resume-container">
          <h3 class="cert-preview-title">Предпросмотр резюме</h3>

          <article class="resume-card">
            <header class="resume-head">
              <h4>{{ generatedResume.fullName }}</h4>
              <p v-if="generatedResume.desiredRole" class="resume-role">{{ generatedResume.desiredRole }}</p>
              <p>{{ generatedResume.email }} · {{ generatedResume.country }}, {{ generatedResume.city }}</p>
              <p v-if="generatedResume.phone">Телефон: {{ generatedResume.phone }}</p>
              <p>{{ generatedResume.university }}</p>
            </header>

            <p class="resume-summary">{{ generatedResume.summary }}</p>

            <section
              v-if="generatedResume.portfolioUrl || generatedResume.githubUrl || generatedResume.linkedinUrl"
              class="resume-section"
            >
              <h6>Ссылки</h6>
              <div class="resume-links">
                <a v-if="generatedResume.portfolioUrl" :href="generatedResume.portfolioUrl" target="_blank" rel="noreferrer">
                  Портфолио
                </a>
                <a v-if="generatedResume.githubUrl" :href="generatedResume.githubUrl" target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a v-if="generatedResume.linkedinUrl" :href="generatedResume.linkedinUrl" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </div>
            </section>

            <section v-if="generatedResume.experience" class="resume-section">
              <h6>Опыт</h6>
              <p class="resume-free-text">{{ generatedResume.experience }}</p>
            </section>

            <section v-if="generatedResume.achievements" class="resume-section">
              <h6>Достижения</h6>
              <p class="resume-free-text">{{ generatedResume.achievements }}</p>
            </section>

            <section class="resume-section">
              <h6>Ключевые навыки</h6>
              <div class="cert-skills">
                <span v-for="skill in generatedResume.skills" :key="`resume-skill-${skill}`">{{ skill }}</span>
              </div>
            </section>

            <section class="resume-section">
              <h6>Прогресс по направлениям</h6>
              <div v-if="generatedResume.roadmapResults.length" class="cert-progress-list">
                <div
                  v-for="item in generatedResume.roadmapResults"
                  :key="`resume-progress-${item.title}`"
                  class="cert-progress-item"
                >
                  <div class="cert-progress-head">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.percent }}% - {{ item.status }}</span>
                  </div>
                  <div class="cert-progress-track">
                    <span :style="{ width: `${item.percent}%` }" />
                  </div>
                </div>
              </div>
              <p v-else class="muted">Нет данных по направлениям.</p>
            </section>

            <p class="resume-meta">Обновлено: {{ generatedResume.generatedAt }}</p>
          </article>

          <div class="resume-actions">
            <button class="btn-secondary" @click="handleResumeAction('txt')">Скачать TXT</button>
            <button class="btn-secondary" @click="handleResumeAction('copy')">Скопировать текст</button>
          </div>

          <p v-if="resumeActionMessage" class="resume-action-note">{{ resumeActionMessage }}</p>
        </div>
      </section>

      <!-- Direction Levels -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Уровни по направлениям</h2>
          <p class="section-note">
            Пройдите тесты на странице определения уровня и соберите резюме под конкретное направление.
          </p>
        </div>

        <router-link to="/skill-levels" class="levels-link">
          Перейти к странице определения уровня
        </router-link>

        <div v-if="directionLevelsRows.length" class="direction-levels-list">
          <article
            v-for="item in directionLevelsRows"
            :key="`direction-level-${item.roadmapId}`"
            class="direction-level-card"
          >
            <div class="direction-level-main">
              <strong>{{ item.title }}</strong>
              <span>Уровень: {{ item.levelLabel }}</span>
            </div>

            <button class="btn-secondary" @click="buildResumeForDirection(item.roadmapId)">
              Собрать резюме
            </button>
          </article>
        </div>

        <p v-else class="muted">
          Уровни пока не определены. Пройдите тесты по направлениям.
        </p>
      </section>

      <!-- Certificate -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Сертификат Skillo</h2>
          <p class="section-note">Сертификат от Skillo. Для скачивания и публикации требуется ID подтверждения.</p>
        </div>

        <button class="btn-primary" :disabled="generatingCertificate" @click="generateCertificate">
          <span v-if="generatingCertificate" class="spinner" />
          {{ generatingCertificate ? "Генерация..." : "Сгенерировать сертификат Skillo" }}
        </button>

        <div v-if="generatedCertificate" class="certificate-container">
          <h3 class="cert-preview-title">Предпросмотр сертификата</h3>

          <article class="certificate">
            <header class="cert-header">
              <p class="cert-issuer">{{ generatedCertificate.issuedBy }}</p>
              <h4 class="cert-title">{{ generatedCertificate.title }}</h4>
              <p class="cert-id">ID: {{ generatedCertificate.certificateId }}</p>
            </header>

            <section class="cert-body">
              <p>Настоящим подтверждается, что</p>
              <h5 class="cert-name">{{ generatedCertificate.fullName }}</h5>
              <p>успешно проходит обучение по дорожным картам платформы и демонстрирует уровень:</p>
              <p class="cert-level">{{ generatedCertificate.overallLevel }}</p>
            </section>

            <section class="cert-meta-grid">
              <div>
                <span>Email</span>
                <strong>{{ generatedCertificate.email }}</strong>
              </div>
              <div>
                <span>Дата выдачи</span>
                <strong>{{ generatedCertificate.issueDate }}</strong>
              </div>
              <div>
                <span>Код проверки</span>
                <strong>{{ generatedCertificate.verificationCode }}</strong>
              </div>
            </section>

            <section class="cert-section">
              <h6>Подтверждённые навыки</h6>
              <div class="cert-skills">
                <span v-for="skill in generatedCertificate.skills" :key="skill">{{ skill }}</span>
              </div>
            </section>

            <section class="cert-section">
              <h6>Результаты по направлениям</h6>
              <div v-if="generatedCertificate.roadmapResults.length" class="cert-progress-list">
                <div v-for="item in generatedCertificate.roadmapResults" :key="item.title" class="cert-progress-item">
                  <div class="cert-progress-head">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.percent }}% - {{ item.status }}</span>
                  </div>
                  <div class="cert-progress-track">
                    <span :style="{ width: `${item.percent}%` }" />
                  </div>
                </div>
              </div>
              <p v-else class="muted">Нет данных по направлениям.</p>
            </section>

            <footer class="cert-footer">
              <p>Пройдено тестов: <strong>{{ generatedCertificate.completedTests }}</strong></p>
              <p>Статус: Сертификат подтверждения навыков Skillo</p>
            </footer>
          </article>

          <div class="cert-actions">
            <div class="cert-id-gate">
              <p>Чтобы скачать и поделиться сертификатом, введите ID подтверждения из письма.</p>

              <div class="cert-id-gate-row">
                <input
                  v-model="certificateIdInput"
                  type="text"
                  placeholder="Введите ID подтверждения"
                />
                <button class="btn-secondary" @click="verifyCertificateAccess">
                  Подтвердить ID
                </button>
              </div>

              <p v-if="certificateAccessError" class="cert-id-error">{{ certificateAccessError }}</p>
              <p v-else-if="certificateAccessGranted" class="cert-id-success">
                Доступ подтвержден. Вы можете скачать и поделиться сертификатом.
              </p>
            </div>

            <div class="cert-actions-grid">
              <button class="btn-secondary" :disabled="!certificateAccessGranted" @click="handleCertificateAction('pdf')">
                Скачать PDF
              </button>
              <button class="btn-secondary" :disabled="!certificateAccessGranted" @click="handleCertificateAction('docx')">
                Скачать DOCX
              </button>
              <button class="btn-secondary" :disabled="!certificateAccessGranted" @click="handleCertificateAction('txt')">
                Скачать TXT
              </button>
              <button class="btn-secondary" :disabled="!certificateAccessGranted" @click="handleCertificateAction('linkedin')">
                LinkedIn
              </button>
              <button class="btn-secondary" :disabled="!certificateAccessGranted" @click="handleCertificateAction('telegram')">
                Telegram
              </button>
            </div>

            <p v-if="certificateActionMessage" class="cert-action-note">{{ certificateActionMessage }}</p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 42px 20px 76px;
  font-family: inherit;
  color: var(--text);
  position: relative;
  isolation: isolate;
}

.profile-page::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(420px 220px at 2% 0%, rgba(28, 28, 28, 0.06), transparent 72%),
    radial-gradient(360px 200px at 98% 4%, rgba(28, 28, 28, 0.05), transparent 74%);
}

.profile-content {
  display: grid;
  gap: 14px;
}

/* States */
.state-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
  gap: 12px;
}

.state-view p {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
}

.error-text {
  color: #dc2626;
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

/* Header */
.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  box-shadow: var(--shadow-sm);
  padding: 18px;
}

.profile-header-main {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-logout-btn {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
}

.profile-logout-btn:hover {
  border-color: var(--soft-border);
  background: var(--surface-soft);
  color: var(--text);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--button-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-header h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 2px;
  color: var(--text);
}

.email {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

/* Meta Grid */
.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 0;
}

.meta-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  text-align: center;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.meta-card:hover {
  border-color: var(--soft-border);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.meta-card span {
  display: block;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.meta-card strong {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.trophy-value {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.trophy-icon {
  width: 18px;
  height: 18px;
  color: #d4a000;
}

/* Sections */
.section {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  box-shadow: var(--shadow-sm);
  padding: 18px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin: 0 0 16px;
}

.section-title::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text);
  opacity: 0.55;
}

.section-header {
  margin-bottom: 16px;
}

.section-header .section-title {
  margin-bottom: 4px;
}

.section-note {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

.muted {
  font-size: 14px;
  color: var(--muted);
}

/* Tags */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 13px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 100px;
  background: var(--surface-soft);
  color: var(--text);
  border: 1px solid var(--border);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.tag:hover {
  border-color: var(--soft-border);
  background: var(--surface);
}

/* Achievements */
.ach-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ach-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text);
}

.ach-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
}

/* User Details */
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.detail-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  background: linear-gradient(180deg, var(--surface-soft) 0%, var(--surface) 100%);
}

.detail-item span {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
}

.detail-item strong {
  display: block;
  font-size: 14px;
  color: var(--text);
}

/* Activity */
.activity-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--muted);
}

.activity-stats strong {
  color: var(--text);
}

.toggle-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.toggle-group {
  display: flex;
  gap: 4px;
}

.toggle-group button {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-group button:hover {
  border-color: var(--border);
  color: var(--muted);
}

.toggle-group button.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--text);
}

/* Heatmap */
.heatmap-wrap {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 14px;
}

.heatmap {
  display: flex;
  gap: 3px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.heatmap-week {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  gap: 3px;
}

.heatmap-day {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: none;
  background: var(--border);
}

.heatmap-day.level-empty {
  opacity: 0;
  pointer-events: none;
}

.heatmap-day.level-0 { background: var(--border); }
.heatmap-day.level-1 { background: var(--border); }
.heatmap-day.level-2 { background: var(--muted); }
.heatmap-day.level-3 { background: var(--muted); }
.heatmap-day.level-4 { background: var(--primary); }

.heatmap-legend {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
}

.heatmap-legend .heatmap-day {
  width: 10px;
  height: 10px;
}

/* Chart */
.chart-wrap {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 14px;
}

.chart {
  min-height: 200px;
  display: flex;
  align-items: flex-end;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.bar-col {
  min-width: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bar-shell {
  width: 18px;
  height: 140px;
  border-radius: 100px;
  background: var(--border);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: height 0.3s ease;
}

.bar-label {
  font-size: 10px;
  color: var(--muted);
}

.bar-value {
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
}

/* Knowledge Radar */
.knowledge-shell {
  display: grid;
  grid-template-columns: minmax(290px, 1fr) minmax(220px, 1fr);
  gap: 12px;
  align-items: stretch;
}

.knowledge-radar-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.knowledge-radar {
  width: 100%;
  height: auto;
  display: block;
}

.radar-grid polygon {
  fill: none;
  stroke: var(--border);
  stroke-width: 1;
}

.radar-axis line {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.radar-shape {
  fill: rgba(255, 142, 60, 0.28);
  stroke: var(--primary);
  stroke-width: 2;
}

.radar-points circle {
  fill: var(--primary);
  stroke: var(--surface);
  stroke-width: 2;
}

.radar-labels text {
  fill: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.knowledge-stats {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 12px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.knowledge-summary {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.knowledge-summary span {
  font-size: 12px;
  color: var(--muted);
}

.knowledge-summary strong {
  font-size: 24px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text);
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.knowledge-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 10px;
}

.knowledge-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.knowledge-item-head span {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.knowledge-item-head strong {
  font-size: 12px;
  color: var(--muted);
}

.knowledge-track {
  width: 100%;
  height: 6px;
  border-radius: 100px;
  background: var(--border);
  overflow: hidden;
}

.knowledge-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.25s ease;
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
  color: var(--button-text);
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
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
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

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Resume */
.resume-fields-panel {
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  overflow: hidden;
}

.resume-fields-panel > summary {
  cursor: pointer;
  list-style: none;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.resume-fields-panel > summary::-webkit-details-marker {
  display: none;
}

.resume-fields-panel[open] > summary {
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}

.resume-fields-body {
  padding: 12px;
}

.resume-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.resume-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.resume-field > span {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.resume-field--wide {
  grid-column: 1 / -1;
}

.resume-container {
  margin-top: 20px;
}

.resume-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.resume-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.resume-head h4 {
  margin: 0;
  font-size: 21px;
  color: var(--text);
  letter-spacing: -0.02em;
}

.resume-head p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.resume-role {
  font-size: 14px !important;
  color: var(--text) !important;
  font-weight: 600;
}

.resume-summary {
  margin: 14px 0 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}

.resume-section {
  padding-top: 14px;
}

.resume-section h6 {
  margin: 0 0 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  font-weight: 600;
}

.resume-meta {
  margin: 16px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted);
}

.resume-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resume-links a {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}

.resume-free-text {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
}

.resume-actions {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resume-action-note {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.levels-link {
  display: inline-flex;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
}

.direction-levels-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.direction-level-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.direction-level-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.direction-level-main strong {
  font-size: 14px;
  color: var(--text);
}

.direction-level-main span {
  font-size: 12px;
  color: var(--muted);
}

/* Certificate */
.certificate-container {
  margin-top: 20px;
}

.cert-preview-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 14px;
}

.certificate {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 28px 24px;
  box-shadow: var(--shadow-sm);
}

.cert-header {
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.cert-issuer {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.cert-title {
  margin: 6px 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.cert-id {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.cert-body {
  text-align: center;
  padding: 20px 0;
}

.cert-body p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.cert-name {
  margin: 10px 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

.cert-level {
  margin: 10px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.cert-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 16px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.cert-meta-grid div {
  text-align: center;
}

.cert-meta-grid span {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 4px;
}

.cert-meta-grid strong {
  font-size: 13px;
  color: var(--text);
}

.cert-section {
  padding-top: 16px;
}

.cert-section h6 {
  margin: 0 0 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  font-weight: 600;
}

.cert-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cert-skills span {
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--muted);
  background: var(--surface-soft);
}

.cert-progress-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cert-progress-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px 12px;
}

.cert-progress-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.cert-progress-head strong {
  color: var(--text);
}

.cert-progress-head span {
  color: var(--muted);
  font-size: 12px;
}

.cert-progress-track {
  width: 100%;
  height: 6px;
  border-radius: 100px;
  background: var(--border);
  overflow: hidden;
}

.cert-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.3s ease;
}

.cert-footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.cert-footer p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.cert-footer strong {
  color: var(--text);
}

.cert-actions {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cert-id-gate {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 10px;
}

.cert-id-gate p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.cert-id-gate-row {
  margin-top: 8px;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto;
  gap: 8px;
}

.cert-id-error {
  margin-top: 6px !important;
  color: #dc2626 !important;
  font-weight: 600;
}

.cert-id-success {
  margin-top: 6px !important;
  color: #15803d !important;
  font-weight: 600;
}

.cert-actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cert-action-note {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

/* Responsive */
@media (max-width: 640px) {
  .profile-page {
    padding: 32px 16px 60px;
  }

  .section {
    padding: 16px;
  }

  .profile-header {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-header-main {
    gap: 14px;
  }

  .profile-logout-btn {
    width: 100%;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .cert-meta-grid {
    grid-template-columns: 1fr;
  }

  .cert-footer {
    flex-direction: column;
  }

  .cert-id-gate-row {
    grid-template-columns: 1fr;
  }

  .resume-form-grid {
    grid-template-columns: 1fr;
  }

  .direction-level-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .toggle-bar {
    flex-direction: column;
  }

  .knowledge-shell {
    grid-template-columns: 1fr;
  }

  .knowledge-summary strong {
    font-size: 22px;
  }
}
</style>
