<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import {
  friendsApi,
  type FriendChallenge,
  type FriendChallengeNotification,
  type FriendProfile,
  type GlobalItMapResponse
} from "@/features/friends/api/friends.api"
import { mockRoadmapAssessments } from "@/shared/mocks/mockRoadmaps"
import { useAuthStore } from "@/features/auth/store/auth"
import { resolveApiError } from "@/shared/utils/resolveApiError"

const authStore = useAuthStore()

const currentAiQuestions = ref<any[]>([])
const isAiLoading = ref(false)

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const addEmail = ref("")
const addError = ref<string | null>(null)

const friends = ref<FriendProfile[]>([])
const suggestions = ref<FriendProfile[]>([])
const globalMap = ref<GlobalItMapResponse | null>(null)
const challenges = ref<FriendChallenge[]>([])
const challengeNotifications = ref<FriendChallengeNotification[]>([])
const challengeActionUserId = ref<number | null>(null)
const challengeNotificationId = ref<string | null>(null)
const challengeMessage = ref<string | null>(null)
const challengeError = ref<string | null>(null)
const challengeRoadmapByUserId = ref<Record<number, string>>({})
const activeChallengeDraft = ref<{
  id?: string
  opponentUserId: number
  opponentName: string
  roadmapId: string
  roadmapTitle: string
} | null>(null)
const challengeQuizAnswers = ref<Record<string, number>>({})
const challengeQuizStartedAt = ref<number | null>(null)
const challengeQuizSubmitting = ref(false)
const challengeQuizError = ref<string | null>(null)
const challengeQuizRemainingSec = ref(0)
const challengeQuizProtectionEnabled = ref(false)
const challengeQuizModalRef = ref<HTMLElement | null>(null)
const CHALLENGE_QUIZ_SECONDS_PER_QUESTION = 45
let challengeQuizTimerId: number | null = null
let challengeQuizTerminating = false

const participants = computed(() => globalMap.value?.participants ?? [])
const roadmapRows = computed(() => globalMap.value?.roadmaps ?? [])
const radarSize = 360
const radarCenter = radarSize / 2
const radarRadius = 122
const radarLevels = [20, 40, 60, 80, 100]
const shortLabelByRoadmapId: Record<string, string> = {
  ai: "AI",
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps",
  mobile: "Mobile"
}
const radarPalette = [
  { stroke: "#ff8e3c", fill: "rgba(255, 142, 60, 0.28)" },
  { stroke: "#007f5f", fill: "rgba(0, 127, 95, 0.24)" },
  { stroke: "#2d6cdf", fill: "rgba(45, 108, 223, 0.24)" },
  { stroke: "#c84b6f", fill: "rgba(200, 75, 111, 0.24)" },
  { stroke: "#8e5cf2", fill: "rgba(142, 92, 242, 0.22)" },
  { stroke: "#1f9d9d", fill: "rgba(31, 157, 157, 0.22)" }
]
const activeRadarUserId = ref<number | null>(null)

const ensureChallengeRoadmapSelection = () => {
  const defaultRoadmapId = roadmapRows.value[0]?.roadmapId
  if (!defaultRoadmapId) return

  const next = { ...challengeRoadmapByUserId.value }

  participants.value
    .filter((participant) => !participant.isCurrentUser)
    .forEach((participant) => {
      if (!next[participant.userId]) {
        next[participant.userId] = defaultRoadmapId
      }
    })

  challengeRoadmapByUserId.value = next
}

const loadChallenges = async (userId: number | null) => {
  try {
    const [challengesData, notificationsData] = await Promise.all([
      friendsApi.getFriendChallenges(userId),
      friendsApi.getFriendChallengeNotifications(userId)
    ])

    challenges.value = challengesData
    challengeNotifications.value = notificationsData
    console.log("Хабарламалар жүктелді:", challengeNotifications.value)
  } catch (err) {
    console.error("Жүктеу қатесі:", err)
  }
}

const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const userId = authStore.user?.id ?? null

    const [friendsData, suggestionsData, mapData] = await Promise.all([
      friendsApi.getFriends(userId),
      friendsApi.getFriendSuggestions(userId),
      friendsApi.getGlobalItMap(userId)
    ])

    friends.value = friendsData
    suggestions.value = suggestionsData
    globalMap.value = mapData
    ensureChallengeRoadmapSelection()
    await loadChallenges(userId)
  } catch (err) {
    error.value = resolveApiError(err, "Не удалось загрузить страницу друзей").message
  } finally {
    loading.value = false
  }
}

const refreshMap = async () => {
  const userId = authStore.user?.id ?? null
  globalMap.value = await friendsApi.getGlobalItMap(userId)
  ensureChallengeRoadmapSelection()
}

const addFriend = async () => {
  addError.value = null
  const email = addEmail.value.trim()
  if (!email) return

  try {
    saving.value = true
    const userId = authStore.user?.id ?? null
    friends.value = await friendsApi.addFriendByEmail(userId, email)
    suggestions.value = await friendsApi.getFriendSuggestions(userId)
    await refreshMap()
    await loadChallenges(userId)
    addEmail.value = ""
  } catch (err) {
    addError.value = resolveApiError(err, "Не удалось добавить друга").message
  } finally {
    saving.value = false
  }
}

const addSuggestedFriend = async (email: string) => {
  addEmail.value = email
  await addFriend()
}

const removeFriend = async (friendUserId: number) => {
  try {
    saving.value = true
    const userId = authStore.user?.id ?? null
    friends.value = await friendsApi.removeFriend(userId, friendUserId)
    suggestions.value = await friendsApi.getFriendSuggestions(userId)
    await refreshMap()
    await loadChallenges(userId)
  } finally {
    saving.value = false
  }
}

const getProgress = (participantId: number, roadmapId: string) => {
  const participant = participants.value.find((item) => item.userId === participantId)
  if (!participant) return 0
  return participant.roadmapProgress[roadmapId] ?? 0
}

const toRadarPoint = (index: number, total: number, ratio: number) => {
  const safeTotal = Math.max(total, 1)
  const angle = (Math.PI * 2 * index) / safeTotal - Math.PI / 2
  const radius = radarRadius * ratio

  return {
    x: radarCenter + Math.cos(angle) * radius,
    y: radarCenter + Math.sin(angle) * radius
  }
}

const radarAxes = computed(() => {
  const total = roadmapRows.value.length

  return roadmapRows.value.map((roadmap, index) => ({
    id: roadmap.roadmapId,
    label: shortLabelByRoadmapId[roadmap.roadmapId] ?? roadmap.title,
    end: toRadarPoint(index, total, 1),
    labelPoint: toRadarPoint(index, total, 1.16)
  }))
})

const radarGridPolygons = computed(() => {
  return radarLevels.map((level) => {
    const points = roadmapRows.value
      .map((_, index) => {
        const point = toRadarPoint(index, roadmapRows.value.length, level / 100)
        return `${point.x},${point.y}`
      })
      .join(" ")

    return { level, points }
  })
})

const participantRadarVisuals = computed(() => {
  const totalRoadmaps = roadmapRows.value.length

  return participants.value.map((participant, index) => {
    const color = radarPalette[index % radarPalette.length]

    const valuePoints = roadmapRows.value.map((roadmap, roadmapIndex) => {
      const value = getProgress(participant.userId, roadmap.roadmapId)
      const point = toRadarPoint(roadmapIndex, totalRoadmaps, value / 100)

      return {
        id: roadmap.roadmapId,
        label: roadmap.title,
        value,
        x: point.x,
        y: point.y
      }
    })

    return {
      ...participant,
      color,
      polygon: valuePoints.map((point) => `${point.x},${point.y}`).join(" "),
      valuePoints
    }
  })
})

const latestChallengeByOpponent = computed<Record<number, FriendChallenge>>(() => {
  return challenges.value.reduce<Record<number, FriendChallenge>>((acc, challenge) => {
    if (!acc[challenge.opponentUserId]) {
      acc[challenge.opponentUserId] = challenge
    }
    return acc
  }, {})
})

const getChallengeRoadmapId = (participantUserId: number) => {
  const selected = challengeRoadmapByUserId.value[participantUserId]
  if (selected) return selected

  const fallback = roadmapRows.value[0]?.roadmapId ?? ""

  if (fallback) {
    challengeRoadmapByUserId.value = {
      ...challengeRoadmapByUserId.value,
      [participantUserId]: fallback
    }
  }

  return fallback
}

const activeChallengeAssessment = computed(() => {
  if (!activeChallengeDraft.value) return null
  return mockRoadmapAssessments[activeChallengeDraft.value.roadmapId] ?? null
})

const challengeQuizAnsweredCount = computed(() => {
  return currentAiQuestions.value.filter((q) => challengeQuizAnswers.value[q.id] !== undefined).length
})

const challengeQuizAllAnswered = computed(() => {
  if (currentAiQuestions.value.length === 0) return false
  return currentAiQuestions.value.every((q) => challengeQuizAnswers.value[q.id] !== undefined)
})

const challengeQuizTimerText = computed(() => {
  const safe = Math.max(0, challengeQuizRemainingSec.value)
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0")
  const seconds = String(safe % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
})

const challengeQuizTimerDanger = computed(() => challengeQuizRemainingSec.value <= 30)

const clearChallengeQuizTimer = () => {
  if (challengeQuizTimerId !== null) {
    window.clearInterval(challengeQuizTimerId)
    challengeQuizTimerId = null
  }
}

const exitChallengeFullscreen = async () => {
  if (!document.fullscreenElement) return

  try {
    await document.exitFullscreen()
  } catch {
    // noop
  }
}

const startChallengeQuizTimer = (durationSec: number) => {
  clearChallengeQuizTimer()
  challengeQuizRemainingSec.value = Math.max(1, durationSec)

  challengeQuizTimerId = window.setInterval(() => {
    if (challengeQuizRemainingSec.value <= 1) {
      clearChallengeQuizTimer()
      void terminateChallengeQuizAttempt("Время теста вышло")
      return
    }

    challengeQuizRemainingSec.value -= 1
  }, 1000)
}

const disableChallengeQuizProtection = () => {
  if (!challengeQuizProtectionEnabled.value) return
  challengeQuizProtectionEnabled.value = false

  document.removeEventListener("visibilitychange", handleChallengeQuizVisibilityChange)
  document.removeEventListener("fullscreenchange", handleChallengeQuizFullscreenChange)
  document.removeEventListener("keydown", handleChallengeQuizKeydown, true)
  window.removeEventListener("blur", handleChallengeQuizBlur)
}

const enableChallengeQuizProtection = () => {
  if (challengeQuizProtectionEnabled.value) return
  challengeQuizProtectionEnabled.value = true

  document.addEventListener("visibilitychange", handleChallengeQuizVisibilityChange)
  document.addEventListener("fullscreenchange", handleChallengeQuizFullscreenChange)
  document.addEventListener("keydown", handleChallengeQuizKeydown, true)
  window.addEventListener("blur", handleChallengeQuizBlur)
}

const terminateChallengeQuizAttempt = async (reason: string) => {
  if (!activeChallengeDraft.value || challengeQuizTerminating) return

  challengeQuizTerminating = true
  const opponentName = activeChallengeDraft.value.opponentName

  closeChallengeQuiz({ keepGlobalError: true })
  challengeMessage.value = null
  challengeError.value = `Попытка остановлена: ${reason}. Вызов пользователю ${opponentName} не отправлен.`

  challengeQuizTerminating = false
}

const handleChallengeQuizVisibilityChange = () => {
  if (!challengeQuizProtectionEnabled.value || challengeQuizSubmitting.value) return
  if (!document.hidden) return

  void terminateChallengeQuizAttempt("Обнаружено переключение вкладки")
}

const handleChallengeQuizBlur = () => {
  if (!challengeQuizProtectionEnabled.value || challengeQuizSubmitting.value) return

  void terminateChallengeQuizAttempt("Обнаружена потеря фокуса окна")
}

const handleChallengeQuizFullscreenChange = () => {
  if (!challengeQuizProtectionEnabled.value || challengeQuizSubmitting.value) return
  if (document.fullscreenElement) return

  void terminateChallengeQuizAttempt("Выход из полноэкранного режима запрещен")
}

const handleChallengeQuizKeydown = (event: KeyboardEvent) => {
  if (!challengeQuizProtectionEnabled.value || challengeQuizSubmitting.value) return

  const key = event.key.toLowerCase()
  const openDevToolsAttempt =
    key === "f12" ||
    ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === "i" || key === "j" || key === "c")) ||
    ((event.ctrlKey || event.metaKey) && key === "u")

  if (!openDevToolsAttempt) return

  event.preventDefault()
  void terminateChallengeQuizAttempt("Обнаружена попытка открыть инструменты разработчика")
}

const enterChallengeFullscreen = async () => {
  if (document.fullscreenElement) return true
  const target = challengeQuizModalRef.value ?? document.documentElement

  if (!target.requestFullscreen) return false

  try {
    await target.requestFullscreen()
    return Boolean(document.fullscreenElement)
  } catch {
    return false
  }
}

const formatChallengeTime = (seconds: number | null) => {
  if (seconds === null) return "--:--"
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0")
  const rest = String(safe % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}

const challengeStatusText = (challenge: FriendChallenge) => {
  const currentUserId = authStore.user?.id ?? null;
  // ID-лерді міндетті түрде Number-ге айналдырып салыстырамыз
  const curId = currentUserId ? Number(currentUserId) : null;
  
  const isChallenger = Number(challenge.challengerUserId) === curId;
  const opponentName = isChallenger ? challenge.opponentName : challenge.challengerName;

  if (challenge.status === "waiting_opponent") {
    return `⏳ ${opponentName} жауабын күтудеміз...`;
  }

  const myScore = isChallenger ? challenge.challengerScore : (challenge.opponentScore ?? 0);
  const myTime = isChallenger ? challenge.challengerDurationSec : (challenge.opponentDurationSec ?? 0);
  const oppScore = isChallenger ? (challenge.opponentScore ?? 0) : challenge.challengerScore;
  const oppTime = isChallenger ? (challenge.opponentDurationSec ?? 0) : challenge.challengerDurationSec;

  // Жеңімпазды тексеру (ID типіне қарамастан Number арқылы)
  if (!challenge.winnerUserId && challenge.status === 'completed') {
     return `🤝 Тең түсті: ${myScore}% (${formatChallengeTime(myTime)})`;
  }

  console.log(challenge.winnerUserId, curId)

  const iWon = Number(challenge.winnerUserId) === curId;

  return iWon 
    ? `🎉 Сіз жеңдіңіз! ${myScore}% vs ${oppScore}%` 
    : `💀 Сіз жеңілдіңіз: ${myScore}% vs ${oppScore}%`;
};

const markChallengeNotificationRead = async (challengeId: string) => {
  try {
    challengeNotificationId.value = challengeId
    const userId = authStore.user?.id ?? null
    await friendsApi.markFriendChallengeNotificationRead(userId, challengeId)
    await loadChallenges(userId)
  } finally {
    challengeNotificationId.value = null
  }
}

const closeChallengeQuiz = (options: { keepGlobalError?: boolean } = {}) => {
  disableChallengeQuizProtection()
  clearChallengeQuizTimer()

  activeChallengeDraft.value = null
  challengeQuizAnswers.value = {}
  challengeQuizStartedAt.value = null
  challengeQuizSubmitting.value = false
  challengeQuizError.value = null
  challengeQuizRemainingSec.value = 0

  if (!options.keepGlobalError) {
    challengeError.value = null
  }

  void exitChallengeFullscreen()
}

// FriendsView.vue ішіндегі осы функцияны толық ауыстырыңыз:

// Осы функцияны мынаған ауыстырыңыз:
const openChallengeQuiz = async (participantUserId: number) => {
  const roadmapId = getChallengeRoadmapId(participantUserId)
  const roadmap = roadmapRows.value.find((item) => item.roadmapId === roadmapId)
  const participant = participants.value.find((item) => item.userId === participantUserId)

  if (!participant) return

  activeChallengeDraft.value = {
    opponentUserId: participantUserId,
    opponentName: participant.fullName,
    roadmapId,
    roadmapTitle: roadmap?.title ?? roadmapId
  }

  isAiLoading.value = true
  try {
    const userId = authStore.user?.id ?? null
    const response = await friendsApi.createFriendChallenge(userId, {
      opponentUserId: participantUserId,
      roadmapId,
      roadmapTitle: roadmap?.title ?? roadmapId,
      challengerScore: 0,
      challengerDurationSec: 0
    })

    // Бэкендтен келген ID-ді draft-қа сақтаймыз
    if (activeChallengeDraft.value) {
      activeChallengeDraft.value.id = response.id; // Енді бұл жерде ID бар
    }

    currentAiQuestions.value = response.quizData || []
    challengeQuizAnswers.value = {}
    challengeQuizStartedAt.value = Date.now()

    await enterChallengeFullscreen()
    enableChallengeQuizProtection()
  } catch (err) {
    // ...
  } finally {
    isAiLoading.value = false
  }
}

const calculateScore = () => {
  if (currentAiQuestions.value.length === 0) return 0;
  let correct = 0;
  
  currentAiQuestions.value.forEach((q) => {
    const userAnswer = challengeQuizAnswers.value[q.id];
    
    // AI-дан келген дұрыс жауап индексі
    const correctAnswer = q.correctOption !== undefined ? q.correctOption : q.correctIndex;
    
    console.log(`Сұрақ ID ${q.id}: Пайдаланушы жауабы: ${userAnswer}, Дұрыс жауап: ${correctAnswer}`);

    if (userAnswer === correctAnswer) {
      correct++;
    }
  });
  
  const finalScore = Math.round((correct / currentAiQuestions.value.length) * 100);
  console.log("Общий очко:", finalScore);
  return finalScore;
};

const submitChallengeQuiz = async () => {
  if (!activeChallengeDraft.value) return;

  const score = calculateScore();
  const duration = Math.round((Date.now() - (challengeQuizStartedAt.value || 0)) / 1000);

  try {
    challengeQuizSubmitting.value = true;
    const userId = authStore.user?.id || null;

    // СЕРВЕРГЕ ЖІБЕРУ:
    // Бірінші адамда ID жаңа құрылған жарыстан келеді (activeChallengeDraft.value.id)
    // Екінші адамда ол хабарламадан келеді
    const challengeId = activeChallengeDraft.value.id;

    if (!challengeId) {
      console.error("Challenge ID табылмады!");
      return;
    }

    await friendsApi.completeFriendChallenge(userId, challengeId, {
      challengeId: challengeId,
      score: score,
      durationSec: duration
    });

    // МЫНА ЖЕР ӨТЕ МАҢЫЗДЫ:
    // Сервер жауап берген соң, экранды бірден жабу
    closeChallengeQuiz(); 
    await loadChallenges(userId);
    
    // Егер жеңімпаз анықталса, тізім автоматты түрде жаңаруы тиіс
    alert("Нәтиже сақталды!");

  } catch (err) {
    console.error("Сақтау қатесі:", err);
    alert("Нәтижені жіберу мүмкін болмады.");
  } finally {
    challengeQuizSubmitting.value = false;
  }
};

const acceptFriendChallenge = async (challengeId: string) => {
  try {
    const challenge = challenges.value.find(c => c.id === challengeId);
    
    if (!challenge || !challenge.quizData) {
      challengeError.value = "Сұрақтар табылмады.";
      return;
    }

    const fullScreenEntered = await enterChallengeFullscreen();
    if (!fullScreenEntered) return;

    currentAiQuestions.value = challenge.quizData; 
    
    activeChallengeDraft.value = {
      id: challenge.id, // Атауы 'id' болуы шарт, сонда submit көреді
      opponentUserId: challenge.challengerUserId,
      opponentName: challenge.challengerName || "Сіздің досыңыз",
      roadmapId: challenge.roadmapId,
      roadmapTitle: challenge.roadmapTitle,
    };

    challengeQuizAnswers.value = {};
    challengeQuizStartedAt.value = Date.now();

    startChallengeQuizTimer(currentAiQuestions.value.length * CHALLENGE_QUIZ_SECONDS_PER_QUESTION);
    enableChallengeQuizProtection();

  } catch (err) {
    console.error(err);
    challengeError.value = "Тестті бастау мүмкін болмады.";
  }
};

const activeParticipantRadar = computed(() => {
  if (activeRadarUserId.value === null) return null
  return participantRadarVisuals.value.find((participant) => participant.userId === activeRadarUserId.value) ?? null
})

const openParticipantRadar = (participantId: number) => {
  activeRadarUserId.value = participantId
}

const closeParticipantRadar = () => {
  activeRadarUserId.value = null
}

onMounted(async() => {
  void loadData()
  if (authStore.token) {
    await authStore.fetchMe()
  }
})

onBeforeUnmount(() => {
  disableChallengeQuizProtection()
  clearChallengeQuizTimer()
})
</script>

<template>
  <div class="friends-page">
    <header class="hero">
      <div>
        <p class="section-title">Социальный прогресс</p>
        <h1>Друзья</h1>
        <p class="hero-note">Добавляйте людей в сеть и наблюдайте общий рост на глобальной карте айтишника.</p>
      </div>
      <div class="hero-metrics">
        <div class="metric">
          <span>Друзья</span>
          <strong>{{ friends.length }}</strong>
        </div>
        <div class="metric">
          <span>Участники карты</span>
          <strong>{{ participants.length }}</strong>
        </div>
      </div>
    </header>

    <div v-if="loading" class="state">Загрузка...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else class="friends-layout">
      <aside class="network-panel">
        <section class="panel-block">
          <p class="section-title">Добавить друга</p>
          <div class="add-row">
            <input
              v-model="addEmail"
              type="email"
              placeholder="Введите email пользователя"
              :disabled="saving"
            />
            <button class="primary" :disabled="saving || !addEmail.trim()" @click="addFriend">
              {{ saving ? "Добавление..." : "Добавить" }}
            </button>
          </div>
          <p v-if="addError" class="error">{{ addError }}</p>
        </section>

        <section v-if="suggestions.length" class="panel-block">
          <p class="section-title">Рекомендации</p>
          <div class="chips">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion.userId"
              type="button"
              class="chip"
              :disabled="saving"
              @click="addSuggestedFriend(suggestion.email)"
            >
              {{ suggestion.fullName }}
            </button>
          </div>
        </section>

        <section class="panel-block">
          <p class="section-title">Ваша сеть</p>
          <p v-if="!friends.length" class="muted">Пока нет друзей в списке.</p>
          <div v-else class="friends-list">
            <article v-for="friend in friends" :key="friend.userId" class="friend-card">
              <div class="friend-main">
                <span class="avatar">{{ friend.avatar }}</span>
                <div class="friend-copy">
                  <h3>{{ friend.fullName }}</h3>
                  <p>{{ friend.country }} · {{ friend.city }}</p>
                </div>
                <button class="secondary tiny" :disabled="saving" @click="removeFriend(friend.userId)">Удалить</button>
              </div>
              <div class="friend-meta">
                <span class="badge-pill">{{ friend.roadmapProgressPercent }}%</span>
                <span class="badge-pill">🏆 {{ friend.points }}</span>
              </div>
            </article>
          </div>
        </section>
      </aside>

      <section class="map-panel">
        <div class="map-panel-head">
          <p class="section-title">Глобальная карта</p>
          <p>Открывайте каждого участника и смотрите его персональную паутинную диаграмму.</p>
        </div>

        <p v-if="participants.length <= 1" class="muted">
          Добавьте хотя бы одного друга, чтобы видеть профили и запускать мини-соревнования.
        </p>

        <div v-else class="radar-scene">
          <div class="tree-root">
            <span class="root-dot" />
            <strong>Global IT Root</strong>
          </div>

          <div class="challenges-section">
            <p class="section-title">Приглашений...</p>
            <div v-if="challengeNotifications.length > 0" class="notif-grid">
              <div v-for="notif in challengeNotifications" :key="notif.id" class="notif-card pulse-border">
                <div class="notif-info">
                  <strong>{{ notif.challengerName }}</strong>
                  <span>Бағыт: {{ notif.roadmapTitle }}</span>
                </div>
                <button class="primary tiny" @click="acceptFriendChallenge(notif.challengeId)">
                  Принять
                </button>
              </div>
            </div>
            <p v-else class="muted">Новое приглашении нету.</p>
          </div>

          <section class="challenge-board">
            <p class="section-title">Последние соревновании</p>
            <ul v-if="challenges.length" class="challenge-board-list">
              <li v-for="challenge in challenges" :key="challenge.id" class="challenge-item">
                <div class="challenge-info">
                  <span class="roadmap-badge">{{ challenge.roadmapTitle }}</span>
                  <p>
                  {{ challenge.challengerName }} vs {{ challenge.opponentName }}
                </p>
                  <p>{{ challengeStatusText(challenge) }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="muted">Не было соревновании.</p>
          </section>

          <p v-if="challengeMessage" class="challenge-feedback success">{{ challengeMessage }}</p>
          <p v-if="challengeError" class="challenge-feedback error">{{ challengeError }}</p>

          <div class="tree-canopy">
            <article
              v-for="participant in participantRadarVisuals"
              :key="participant.userId"
              class="tree-branch"
              :class="{ me: participant.isCurrentUser }"
            >
              <div class="branch-head">
                <span class="avatar">{{ participant.avatar }}</span>
                <div class="branch-copy">
                  <div class="branch-title-row">
                    <h3>{{ participant.fullName }}</h3>
                    <span class="legend-dot" :style="{ background: participant.color.stroke }" />
                  </div>
                  <div class="branch-badges">
                    <span class="badge-pill">{{ participant.overallProgressPercent }}%</span>
                    <span class="badge-pill">🏆 {{ participant.points }}</span>
                  </div>
                  <button
                    type="button"
                    class="secondary tiny branch-open-btn"
                    @click="openParticipantRadar(participant.userId)"
                  >
                    Открыть паутину
                  </button>

                  <div v-if="!participant.isCurrentUser" class="challenge-actions">
                    <label class="challenge-label">Тест для вызова</label>
                    <div class="challenge-controls">
                      <select v-model="challengeRoadmapByUserId[participant.userId]" class="challenge-select">
                        <option v-for="roadmap in roadmapRows" :key="roadmap.roadmapId" :value="roadmap.roadmapId">
                          {{ roadmap.title }}
                        </option>
                      </select>
                      <button
                        type="button"
                        class="primary tiny"
                        :disabled="challengeActionUserId === participant.userId"
                        @click="openChallengeQuiz(participant.userId)"
                      >
                        {{ challengeActionUserId === participant.userId ? "Отправка..." : "Пройти тест и бросить вызов" }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div
            v-if="activeParticipantRadar"
            class="radar-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Персональная паутинная диаграмма"
            @click.self="closeParticipantRadar"
          >
            <article class="radar-modal">
              <header class="radar-modal-head">
                <div class="radar-modal-user">
                  <span class="avatar">{{ activeParticipantRadar.avatar }}</span>
                  <div>
                    <h3>{{ activeParticipantRadar.fullName }}</h3>
                    <p>{{ activeParticipantRadar.overallProgressPercent }}% · 🏆 {{ activeParticipantRadar.points }}</p>
                  </div>
                </div>
                <button type="button" class="secondary tiny" @click="closeParticipantRadar">Закрыть</button>
              </header>

              <div class="friends-radar-card">
                <svg
                  class="friends-radar"
                  :viewBox="`0 0 ${radarSize} ${radarSize}`"
                  aria-label="Персональная паутина участника"
                >
                  <g class="radar-grid">
                    <polygon
                      v-for="item in radarGridPolygons"
                      :key="`modal-grid-${item.level}`"
                      :points="item.points"
                    />
                  </g>

                  <g class="radar-axis">
                    <line
                      v-for="axis in radarAxes"
                      :key="`modal-axis-${axis.id}`"
                      :x1="radarCenter"
                      :y1="radarCenter"
                      :x2="axis.end.x"
                      :y2="axis.end.y"
                    />
                  </g>

                  <g class="radar-shapes">
                    <polygon
                      :points="activeParticipantRadar.polygon"
                      :style="{ fill: activeParticipantRadar.color.fill, stroke: activeParticipantRadar.color.stroke }"
                    />
                  </g>

                  <g class="radar-points">
                    <circle
                      v-for="point in activeParticipantRadar.valuePoints"
                      :key="`modal-point-${activeParticipantRadar.userId}-${point.id}`"
                      :cx="point.x"
                      :cy="point.y"
                      r="4"
                      :style="{ fill: activeParticipantRadar.color.stroke }"
                    />
                  </g>

                  <g class="radar-labels">
                    <text
                      v-for="axis in radarAxes"
                      :key="`modal-label-${axis.id}`"
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

              <ul class="radar-modal-list">
                <li v-for="point in activeParticipantRadar.valuePoints" :key="`metric-${point.id}`">
                  <span>{{ point.label }}</span>
                  <strong>{{ point.value }}%</strong>
                </li>
              </ul>
            </article>
          </div>

          <div
            v-if="activeChallengeDraft"
            class="challenge-quiz-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Тест перед вызовом друга"
          >
            <article ref="challengeQuizModalRef" class="challenge-quiz-modal">
              <header class="challenge-quiz-head">
                <div>
                  <h3>Тест соревнования: {{ activeChallengeDraft.roadmapTitle }}</h3>
                  <div class="challenge-quiz-meta">
                    <p>Соперник: {{ activeChallengeDraft.opponentName }}</p>
                    <strong class="challenge-quiz-timer" :class="{ danger: challengeQuizTimerDanger }">
                      Таймер: {{ challengeQuizTimerText }}
                    </strong>
                  </div>
                </div>
                <button type="button" class="secondary tiny" :disabled="challengeQuizSubmitting" @click="closeChallengeQuiz()">
                  Завершить попытку
                </button>
              </header>

              <p class="challenge-quiz-note">
                Теоретический тест проходит в полноэкранном режиме.
                Переключение вкладки, потеря фокуса окна, выход из fullscreen или попытка открыть DevTools
                приводят к немедленному завершению попытки.
              </p>

              <p v-if="challengeQuizError" class="challenge-feedback error">{{ challengeQuizError }}</p>

              <div v-if="activeChallengeDraft" class="quiz-overlay">
                <div v-if="isAiLoading" class="quiz-loading">AI сұрақтарды дайындап жатыр...</div>

                <div v-else>
                  <div v-for="(question, index) in currentAiQuestions" :key="question.id" class="quiz-item">
                    <p class="quiz-q-text">{{ index + 1 }}. {{ question.question }}</p>
                    <div class="quiz-options">
                      <button 
                        v-for="(option, optIdx) in question.options" 
                        :key="optIdx"
                        :class="{ selected: challengeQuizAnswers[question.id] === optIdx }"
                        @click="challengeQuizAnswers[question.id] = optIdx"
                      >
                        {{ option }}
                      </button>
                    </div>
                  </div>

                  <button 
                    class="primary"
                    @click="submitChallengeQuiz" 
                    :disabled="!challengeQuizAllAnswered || challengeQuizSubmitting"
                  >
                    {{ challengeQuizSubmitting ? 'Жіберілуде...' : 'Вызов тастау' }}
                  </button>
                </div> 
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.friends-page {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
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
}

.hero h1 {
  margin: 0 0 6px;
  font-size: 28px;
  letter-spacing: -0.03em;
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

.friends-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 14px;
}

.network-panel,
.map-panel {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 14px;
}

.network-panel {
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

.section-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.state {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 24px;
}

.state.error {
  color: var(--text);
  background: var(--surface-soft);
}

.add-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.add-row input {
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 12px;
  background: var(--surface);
  color: var(--text);
}

.add-row input::placeholder {
  color: var(--muted);
}

.add-row input:focus {
  outline: none;
  border-color: var(--muted);
}

.primary,
.secondary,
.chip {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.primary {
  background: var(--primary);
  border-color: var(--text);
  color: #fff;
}

.secondary {
  background: var(--surface);
  color: var(--text);
}

.secondary.tiny {
  padding: 6px 10px;
  font-size: 12px;
}

.primary.tiny {
  padding: 6px 10px;
  font-size: 12px;
}

.chip {
  border-radius: 100px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
}

.primary:hover,
.secondary:hover,
.chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(10, 10, 10, 0.08);
}

.error {
  color: var(--text);
  margin: 8px 0 0;
  font-size: 13px;
}

.muted {
  color: var(--muted);
}

.suggestions {
  margin-top: 12px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.friends-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.friend-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(10, 10, 10, 0.08);
}

.friend-main {
  display: flex;
  gap: 8px;
  align-items: center;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.friend-copy {
  min-width: 0;
  flex: 1;
}

.friend-copy h3 {
  margin: 0;
  font-size: 14px;
  color: var(--text);
}

.friend-copy p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.friend-meta {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0;
  color: var(--muted);
  font-size: 13px;
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

.map-panel-head {
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
  margin-bottom: 10px;
}

.map-panel-head p {
  margin: 0;
  color: var(--muted);
}

.radar-scene {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: radial-gradient(circle at 50% -20%, var(--surface-soft) 0%, var(--surface) 46%);
  padding: 14px 12px;
  display: grid;
  gap: 12px;
}

.tree-root {
  margin: 0 auto;
  width: fit-content;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: var(--surface-soft);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.root-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

.tree-root strong {
  font-size: 13px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.challenge-notifications,
.challenge-board {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 10px;
}

.challenge-note {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 8px 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.challenge-note + .challenge-note {
  margin-top: 8px;
}

.challenge-note p {
  margin: 0;
  font-size: 13px;
  color: var(--text);
}

.challenge-board-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.challenge-board-list li {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.challenge-board-list strong {
  display: block;
  font-size: 13px;
  color: var(--text);
}

.challenge-board-list span {
  font-size: 12px;
  color: var(--muted);
}

.challenge-board-list em {
  font-size: 12px;
  color: var(--muted);
  font-style: normal;
  white-space: nowrap;
}

.challenge-feedback {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
}

.challenge-feedback.success {
  background: var(--surface);
  color: var(--text);
}

.challenge-feedback.error {
  background: var(--surface-soft);
  color: var(--text);
}

.friends-radar-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  place-items: center;
}

.friends-radar {
  width: 100%;
  max-width: 420px;
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

.radar-shapes polygon {
  stroke-width: 2;
}

.radar-points circle {
  stroke: var(--surface);
  stroke-width: 1.6;
}

.radar-labels text {
  fill: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.tree-canopy {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 14px;
}

.tree-branch {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(160deg, var(--surface) 0%, var(--surface-soft) 58%, var(--surface) 100%);
  padding: 14px;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  box-shadow: 0 10px 18px rgba(10, 10, 10, 0.06);
}

.tree-branch::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 100% 0, rgba(255, 142, 60, 0.16) 0%, rgba(255, 142, 60, 0) 45%);
  pointer-events: none;
}

.tree-branch::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, rgba(255, 142, 60, 0.92), rgba(255, 142, 60, 0));
}

.tree-branch.me {
  background: linear-gradient(160deg, var(--surface-soft) 0%, var(--surface) 100%);
}

.tree-branch.me::before {
  background: radial-gradient(circle at 100% 0, rgba(36, 101, 255, 0.14) 0%, rgba(36, 101, 255, 0) 45%);
}

.tree-branch.me::after {
  background: linear-gradient(90deg, rgba(36, 101, 255, 0.9), rgba(36, 101, 255, 0));
}

.tree-branch:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 142, 60, 0.35);
  box-shadow: 0 16px 26px rgba(10, 10, 10, 0.12);
}

.branch-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 4px;
}

.branch-copy {
  min-width: 0;
  flex: 1;
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
}

.branch-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 0;
}

.branch-copy h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text);
}

.tree-branch .avatar {
  width: 40px;
  height: 40px;
  box-shadow: 0 8px 16px rgba(10, 10, 10, 0.16);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px rgba(10, 10, 10, 0.12);
}

.branch-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tree-branch .badge-pill {
  background: var(--surface);
  border-color: var(--border);
}

.branch-open-btn {
  margin-top: 2px;
  align-self: stretch;
  border-color: var(--border);
  background: var(--surface);
}

.branch-open-btn:hover {
  box-shadow: 0 10px 16px rgba(10, 10, 10, 0.14);
}

.challenge-actions {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.challenge-label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.challenge-controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 9px;
}

.challenge-select {
  height: 38px;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  padding: 0 10px;
  appearance: none;
  cursor: pointer;
}

.challenge-select:focus {
  outline: none;
  border-color: var(--primary);
}

.challenge-controls .primary.tiny {
  width: 100%;
  justify-content: center;
  border-color: var(--text);
  box-shadow: 0 8px 14px rgba(10, 10, 10, 0.18);
}

.challenge-status {
  margin: 4px 0 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  line-height: 1.35;
}

.challenge-quiz-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1250;
  background: rgba(10, 10, 10, 0.56);
  display: grid;
  place-items: center;
  padding: 16px;
}

.challenge-quiz-modal {
  width: min(860px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 12px;
}

.challenge-quiz-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.challenge-quiz-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
}

.challenge-quiz-head p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.challenge-quiz-meta {
  margin-top: 2px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.challenge-quiz-timer {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 10px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.challenge-quiz-timer.danger {
  border-color: rgba(180, 35, 24, 0.38);
  background: rgba(180, 35, 24, 0.12);
  color: #b42318;
}

.challenge-quiz-note {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.4;
}

.challenge-quiz-progress {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}

.challenge-quiz-list {
  display: grid;
  gap: 10px;
}

.challenge-quiz-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.challenge-quiz-question {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: start;
  color: var(--text);
  font-size: 14px;
}

.challenge-quiz-options {
  display: grid;
  gap: 6px;
}

.challenge-quiz-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
}

.challenge-quiz-option input {
  margin-top: 2px;
}

.challenge-quiz-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.radar-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(10, 10, 10, 0.48);
  display: grid;
  place-items: center;
  padding: 16px;
}

.radar-modal {
  width: min(760px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 12px;
  box-shadow: 0 18px 34px rgba(10, 10, 10, 0.24);
}

.radar-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.radar-modal-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.radar-modal-user h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
}

.radar-modal-user p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.radar-modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.radar-modal-list li {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.radar-modal-list span {
  color: var(--muted);
}

.radar-modal-list strong {
  color: var(--text);
}

@media (max-width: 640px) {
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

  .friends-layout {
    grid-template-columns: 1fr;
  }

  .add-row {
    grid-template-columns: 1fr;
  }

  .tree-canopy {
    grid-template-columns: 1fr;
  }

  .challenge-note {
    flex-direction: column;
    align-items: stretch;
  }

  .challenge-controls {
    grid-template-columns: 1fr;
  }

  .challenge-quiz-head {
    flex-direction: column;
  }

  .challenge-quiz-actions {
    flex-direction: column;
  }

  .friends-radar {
    max-width: 320px;
  }

  .radar-modal-head {
    flex-direction: column;
  }
}

.pulse-border {
  border: 1px solid var(--primary);
  box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { border-color: var(--primary); }
  50% { border-color: transparent; }
  100% { border-color: var(--primary); }
}

.roadmap-badge {
  background: var(--surface-soft);
  color: var(--primary);
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  margin-bottom: 4px;
  display: inline-block;
}

.notif-grid {
  display: grid;
  gap: 10px;
}

.notif-card {
  background: var(--surface-soft);
  padding: 12px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
