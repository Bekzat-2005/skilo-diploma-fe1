<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/features/auth/store/auth"
import { useRoadmapsStore } from "@/features/roadmaps/store/roadmaps"
import { api } from "@/shared/api/client";

type VerificationMode = "online" | "offline"
type VerificationStatus = "scheduled" | "completed"

interface VerificationSlot {
  id: string
  date: string
  time: string
  mode: VerificationMode
  location: string
  assessor: string
  seats: number
}

interface VerificationBooking {
  id: string
  slotId: string
  roadmapId: string
  roadmapTitle: string
  mode: VerificationMode
  date: string
  time: string
  dateTimeIso: string
  location: string
  assessor: string
  status: VerificationStatus
  bookedAt: string
  completedAt: string | null
  certificateId: string | null
}

const router = useRouter()
const roadmapsStore = useRoadmapsStore()
const authStore = useAuthStore()

const modeLabel: Record<VerificationMode, string> = {
  online: "Онлайн",
  offline: "Офлайн"
}

// Уақытты әдемілеп көрсету үшін ғана
const formatDay = (dateIso: string) => {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short"
  })
}

const formatSessionDate = (dateIso: string, time: string) => {
  return new Date(`${dateIso}T${time}:00`).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  })
}

// РЕАКТИВТІ АЙНЫМАЛЫЛАР (Барлығы бос, бэкендтен толады)
const allSlots = ref<VerificationSlot[]>([])
const bookings = ref<VerificationBooking[]>([])
const slotDates = ref<string[]>([]) // Күндер де бэкендтен келетін слоттарға қарап құралады

const selectedMode = ref<VerificationMode>("online")
const selectedDate = ref<string>("")
const selectedRoadmapId = ref<string>("")
const selectedSlotId = ref<string>("")
const formError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isLoading = ref<boolean>(true)
const isActionLoading = ref<boolean>(false) // Түймелерді екі рет басып кетпеу үшін

// Бағыттар тек қана Pinia Store-дан (яғни бэкендтен алынған) алынады, ешқандай mock жоқ!
const directionOptions = computed(() => roadmapsStore.myRoadmaps)

const activeSlotIds = computed(() => {
  return new Set(bookings.value.filter((booking) => booking.status === "scheduled").map((booking) => booking.slotId))
})

const availableSlots = computed(() => {
  return allSlots.value
    .filter((slot) => slot.date === selectedDate.value && slot.mode === selectedMode.value)
    .filter((slot) => slot.seats > 0 && !activeSlotIds.value.has(slot.id))
})

const selectedSlot = computed(() => {
  return availableSlots.value.find((slot) => slot.id === selectedSlotId.value) ?? null
})

const selectedRoadmap = computed(() => {
  return directionOptions.value.find((item) => item.id === selectedRoadmapId.value) ?? null
})

const activeBookings = computed(() => {
  return bookings.value
    .filter((booking) => booking.status === "scheduled")
    .slice()
    .sort((first, second) => first.dateTimeIso.localeCompare(second.dateTimeIso))
})

const completedBookings = computed(() => {
  return bookings.value
    .filter((booking) => booking.status === "completed")
    .slice()
    .sort((first, second) => (second.completedAt ?? "").localeCompare(first.completedAt ?? ""))
})

const nextSession = computed(() => activeBookings.value[0] ?? null)

const nextSessionLabel = computed(() => {
  if (!nextSession.value) return "Пока не запланировано"
  return formatSessionDate(nextSession.value.date, nextSession.value.time)
})

watch(
  directionOptions,
  (next) => {
    if (!next.length) {
      selectedRoadmapId.value = ""
      return
    }
    if (!next.some((roadmap) => roadmap.id === selectedRoadmapId.value)) {
      selectedRoadmapId.value = next[0].id
    }
  },
  { immediate: true }
)

watch([selectedMode, selectedDate], () => {
  formError.value = null
  successMessage.value = null
  if (!availableSlots.value.some((slot) => slot.id === selectedSlotId.value)) {
    selectedSlotId.value = ""
  }
})

// --- 100% ШЫНАЙЫ БЭКЕНДПЕН ЖҰМЫС ---

const fetchInitialData = async () => {
  isLoading.value = true
  try {
    // 1. Бэкендтен мәліметтерді тарту
    const [slotsData, bookingsData] = await Promise.all([
      api.verification.getSlots(),
      api.verification.getBookings()
    ])
    
    allSlots.value = slotsData
    bookings.value = bookingsData

    // 2. Бэкендтен келген слоттарға қарап, күндерді (dates) динамикалық түрде шығарып алу
    if (slotsData && slotsData.length > 0) {
      // Set арқылы қайталанбайтын күндер тізімін жасаймыз
      const uniqueDates = [...new Set(slotsData.map((slot: VerificationSlot) => slot.date))]
      slotDates.value = uniqueDates
      selectedDate.value = uniqueDates[0] // Бірінші күнді автоматты түрде таңдау
    }
  } catch (error) {
    console.error("Бэкендтен мәліметтерді алу мүмкін болмады:", error)
    formError.value = "Сервермен байланыс жоқ. Мәліметтер жүктелмеді."
  } finally {
    isLoading.value = false
  }
}

const bookSession = async () => {
  if (!selectedRoadmap.value) {
    formError.value = "Выберите направление."
    return
  }
  if (!selectedSlot.value) {
    formError.value = "Выберите свободное время."
    return
  }

  // Егер процесс жүріп жатса, функцияны тоқтату (екі рет басылудан қорғау)
  if (isActionLoading.value) return 

  formError.value = null
  isActionLoading.value = true // Процесс басталды

  try {
    const newBooking = await api.verification.createBooking({
      slotId: selectedSlot.value.id,
      roadmapId: selectedRoadmap.value.id,
      roadmapTitle: selectedRoadmap.value.title,
      mode: selectedSlot.value.mode,
      date: selectedSlot.value.date,
      time: selectedSlot.value.time,
      dateTimeIso: `${selectedSlot.value.date}T${selectedSlot.value.time}:00`,
      location: selectedSlot.value.location,
      assessor: selectedSlot.value.assessor,
    })

    bookings.value = [newBooking, ...bookings.value]
    successMessage.value = `Запись подтверждена: ${selectedRoadmap.value.title}, ${formatSessionDate(newBooking.date, newBooking.time)}.`
    selectedSlotId.value = ""
  } catch (error) {
    formError.value = "Қате кетті. Бэкендке сақтау мүмкін болмады."
    console.error(error)
  } finally {
    isActionLoading.value = false // Процесс аяқталды
  }
}

const markCompleted = async (bookingId: string) => {
  // 1. Алдымен қолданушыдан растау сұраймыз
  const isConfirmed = window.confirm("Вы точно хотите отметить эту запись как пройденную?")
  
  // Егер "Отмена" басса, ештеңе істемейміз
  if (!isConfirmed) return

  // 2. Екі рет басылудан қорғау (Жүктеліп жатса, тоқтату)
  if (isActionLoading.value) return

  isActionLoading.value = true // Процесс басталды
  formError.value = null

  try {
    // Бэкендке сұраныс жіберу
    const updatedBooking = await api.verification.completeBooking(bookingId)
    
    // Бэкенд сәтті жауап берсе ғана фронтендтегі тізімді жаңартамыз
    bookings.value = bookings.value.map((b) => (b.id === bookingId ? updatedBooking : b))
    
    // Сәтті шыққаны туралы хабарлама
    successMessage.value = "Запись успешно отмечена как пройденная."
  } catch (error) {
    console.error("Бэкендте аяқтау мүмкін болмады:", error)
    formError.value = "Не удалось обновить статус. Попробуйте позже."
  } finally {
    isActionLoading.value = false // Процесс аяқталды, түймелер қайта ашылады
  }
}

const cancelBooking = async (bookingId: string) => {
  // 1. Алдымен қолданушыдан сұраймыз
  const isConfirmed = window.confirm("Вы точно хотите отменить эту запись?")
  
  // 2. Егер "Отмена" басса, ештеңе істемейміз
  if (!isConfirmed) return

  // 3. Егер процесс жүріп жатса, тоқтатамыз
  if (isActionLoading.value) return

  isActionLoading.value = true // Процесс басталды
  formError.value = null

  try {
    await api.verification.cancelBooking(bookingId)
    // Бэкендтен сәтті өшсе ғана, фронтендтен жоямыз
    bookings.value = bookings.value.filter((b) => b.id !== bookingId)
    successMessage.value = "Запись успешно отменена."
  } catch (error) {
    console.error("Бэкендтен өшіру мүмкін болмады:", error)
    formError.value = "Не удалось отменить запись. Попробуйте позже."
  } finally {
    isActionLoading.value = false // Процесс аяқталды
  }
}

onMounted(async () => {
  await roadmapsStore.loadAllRoadmaps()
  
  // 2. Қолданушыға тиесілі бағыттардың ID-лерін жүктейміз
  await roadmapsStore.loadUserRoadmapCollection(authStore.user?.id ?? null)
  
  // 3. Слоттар мен жазбаларды жүктейміз
  await fetchInitialData()
})
</script>

<template>
  <div class="verification-page">
    
<section class="hero-card">
      <div>
        <p class="hero-kicker">Подтверждение навыков</p>
        <h1>Запись на онлайн/офлайн подтверждение на платформе</h1>
        <p class="hero-text">
          Выберите направление, свободный слот и формат прохождения. После завершения этапа в вашем профиле появится сертификат подтверждения.
        </p>
      </div>

      <div class="hero-stats">
        <article>
          <span>Активные записи</span>
          <strong>{{ activeBookings.length }}</strong>
        </article>
        <article>
          <span>Подтверждено</span>
          <strong>{{ completedBookings.length }}</strong>
        </article>
        <article>
          <span>Ближайшая сессия</span>
          <strong class="next-session">{{ nextSessionLabel }}</strong>
        </article>
      </div>
    </section>

    <div class="layout">
      <section class="booking-card">
        <h2>Оформление записи</h2>

        <div class="field">
          <label for="direction-select">Направление</label>
          <select id="direction-select" v-model="selectedRoadmapId">
            <option v-for="roadmap in directionOptions" :key="roadmap.id" :value="roadmap.id">
              {{ roadmap.title }}
            </option>
          </select>
        </div>

        <div class="field">
          <span>Формат прохождения</span>
          <div class="mode-row">
            <button
              type="button"
              class="mode-btn"
              :class="{ active: selectedMode === 'online' }"
              @click="selectedMode = 'online'"
            >
              Онлайн
            </button>
            <button
              type="button"
              class="mode-btn"
              :class="{ active: selectedMode === 'offline' }"
              @click="selectedMode = 'offline'"
            >
              Офлайн
            </button>
          </div>
        </div>

        <div class="field">
          <span>Свободные даты</span>
          <div class="date-row">
            <button
              v-for="date in slotDates"
              :key="date"
              type="button"
              class="date-btn"
              :class="{ active: date === selectedDate }"
              @click="selectedDate = date"
            >
              {{ formatDay(date) }}
            </button>
          </div>
        </div>

        <div class="field">
          <span>Свободное время</span>

          <div v-if="availableSlots.length" class="slots-grid">
            <button
              v-for="slot in availableSlots"
              :key="slot.id"
              type="button"
              class="slot-btn"
              :class="{ active: selectedSlotId === slot.id }"
              @click="selectedSlotId = slot.id"
            >
              <strong>{{ slot.time }}</strong>
              <small>{{ modeLabel[slot.mode] }} · {{ slot.location }}</small>
            </button>
          </div>

          <p v-else class="empty-note">
            На выбранную дату свободных слотов нет. Выберите другую дату.
          </p>
        </div>

        <article v-if="selectedSlot" class="slot-preview">
          <h3>Выбранный слот</h3>
          <p>{{ formatSessionDate(selectedSlot.date, selectedSlot.time) }}</p>
          <p>{{ modeLabel[selectedSlot.mode] }} · {{ selectedSlot.location }}</p>
          <p>Эксперт: {{ selectedSlot.assessor }}</p>
        </article>

        <p v-if="formError" class="form-error">{{ formError }}</p>
        <p v-if="successMessage" class="form-success">{{ successMessage }}</p>

        <button 
          class="submit-btn primary-btn" 
          @click="bookSession"
          :disabled="isActionLoading"
        >
          {{ isActionLoading ? 'Загрузка...' : 'Записаться' }}
        </button>
      </section>

      <aside class="side-column">
        <article class="side-card">
          <h2>Как это работает</h2>
          <ol class="steps-list">
            <li>Выберите направление из ваших дорожных карт.</li>
            <li>Запишитесь на свободный онлайн или офлайн слот.</li>
            <li>Пройдите подтверждение с экспертом платформы.</li>
            <li>Получите сертификат подтверждения навыка.</li>
          </ol>
        </article>

        <article class="side-card">
          <div class="side-head">
            <h2>Мои записи</h2>
            <span class="count-pill">{{ activeBookings.length }}</span>
          </div>

          <div v-if="activeBookings.length" class="booking-list">
            <article v-for="booking in activeBookings" :key="booking.id" class="booking-item">
              <div class="booking-item-head">
                <strong>{{ booking.roadmapTitle }}</strong>
                <span>{{ modeLabel[booking.mode] }}</span>
              </div>
              <p>{{ formatSessionDate(booking.date, booking.time) }}</p>
              <p>{{ booking.location }} · {{ booking.assessor }}</p>
              <div class="booking-actions">
                <button 
                  class="text-btn" 
                  @click="markCompleted(booking.id)"
                  :disabled="isActionLoading"
                >
                  Отметить как пройдено
                </button>
                <button 
                  class="ghost-btn danger-text" 
                  @click="cancelBooking(booking.id)"
                  :disabled="isActionLoading"
                >
                  Отменить
                </button>
              </div>
            </article>
          </div>

          <p v-else class="empty-note">Пока нет активных записей.</p>
        </article>

        <article class="side-card">
          <h2>Сертификаты подтверждения</h2>
          <p class="certificate-note">
            После завершения подтверждения по направлению вы получаете ID сертификата.
          </p>

          <div v-if="completedBookings.length" class="certificate-list">
            <article
              v-for="certificate in completedBookings"
              :key="`certificate-${certificate.id}`"
              class="certificate-item"
            >
              <strong>{{ certificate.roadmapTitle }}</strong>
              <p>ID: {{ certificate.certificateId }}</p>
              <span>Дата: {{ formatSessionDate(certificate.date, certificate.time) }}</span>
            </article>
          </div>

          <p v-else class="empty-note">
            Пока нет завершенных подтверждений. Пройдите этап, чтобы получить сертификат.
          </p>

          <button type="button" class="ghost-btn full" @click="router.push('/profile')">
            Перейти в профиль
          </button>
        </article>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.verification-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 8px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.back-link {
  width: fit-content;
  border: none !important;
  background: transparent !important;
  color: var(--muted) !important;
  padding: 0 !important;
  box-shadow: none !important;
  font-size: 13px;
  font-weight: 600;
}

.back-link:hover {
  color: var(--text) !important;
  transform: none !important;
}

.hero-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(300px, 1.4fr) minmax(260px, 1fr);
  gap: 16px;
}

.hero-kicker {
  margin: 0 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.hero-card h1 {
  margin: 0 0 8px;
  font-size: 28px;
  line-height: 1.14;
  letter-spacing: -0.02em;
  color: var(--text);
}

.hero-text {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
  max-width: 70ch;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hero-stats article {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hero-stats span {
  font-size: 11px;
  color: var(--muted);
}

.hero-stats strong {
  color: var(--text);
  font-size: 18px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.hero-stats strong.next-session {
  font-size: 14px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(420px, 1.25fr) minmax(300px, 1fr);
  gap: 12px;
}

.booking-card,
.side-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}

.booking-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.booking-card h2,
.side-card h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.2;
  color: var(--text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label,
.field > span {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}

.mode-row,
.date-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-btn,
.date-btn,
.slot-btn,
.ghost-btn,
.text-btn {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
}

.mode-btn {
  min-width: 110px;
}

.mode-btn.active,
.date-btn.active,
.slot-btn.active {
  border-color: var(--primary) !important;
  background: rgba(255, 142, 60, 0.14) !important;
  color: var(--text) !important;
}

.date-btn {
  padding: 8px 10px;
  font-size: 12px;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.slot-btn {
  min-height: 76px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  text-align: left;
}

.slot-btn strong {
  font-size: 16px;
  line-height: 1;
}

.slot-btn small {
  font-size: 11px;
  color: var(--muted);
}

.slot-preview {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 12px;
}

.slot-preview h3 {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--text);
}

.slot-preview p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
}

.form-success {
  margin: 0;
  color: #16a34a;
  font-size: 13px;
  font-weight: 600;
}

.confirm-btn {
  width: 100%;
}

.side-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-card {
  padding: 14px;
}

.steps-list {
  margin: 10px 0 0;
  padding: 0 0 0 18px;
  display: grid;
  gap: 8px;
}

.steps-list li {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.side-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.count-pill {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  background: var(--surface-soft);
}

.booking-list,
.certificate-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.booking-item,
.certificate-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
}

.booking-item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.booking-item strong,
.certificate-item strong {
  font-size: 14px;
  color: var(--text);
}

.booking-item span,
.certificate-item span {
  font-size: 12px;
  color: var(--muted);
}

.booking-item p,
.certificate-item p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.booking-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.ghost-btn {
  flex: 1;
  font-size: 12px;
  padding: 8px 10px;
}

.ghost-btn:hover,
.text-btn:hover {
  background: var(--surface-soft) !important;
  border-color: var(--soft-border) !important;
  color: var(--text) !important;
}

.text-btn {
  font-size: 12px;
  padding: 8px 10px;
  min-width: 88px;
}

.certificate-note {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.empty-note {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.ghost-btn.full {
  margin-top: 10px;
  width: 100%;
}

@media (max-width: 980px) {
  .hero-card {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .verification-page {
    padding: 8px 2px 28px;
  }

  .hero-card {
    padding: 14px;
  }

  .hero-card h1 {
    font-size: 22px;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .slots-grid {
    grid-template-columns: 1fr;
  }

  .booking-actions {
    flex-direction: column;
  }
}
</style>
