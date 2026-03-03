<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import { useRouter } from "vue-router"
import roadmapVisual from "@/assets/visual-roadmap.svg"
import interviewVisual from "@/assets/visual-interview.svg"
import communityVisual from "@/assets/visual-community.svg"
import { primaryNavLinks } from "@/app/layout/config/navigation"
import AmbientMotionLayer from "@/shared/ui/AmbientMotionLayer.vue"

const router = useRouter()

const projectSlides = [
  {
    id: "roadmaps",
    title: "Маршрут от базы до уверенного уровня",
    caption: "Дорожные карты превращают хаотичное обучение в последовательные шаги.",
    image: roadmapVisual
  },
  {
    id: "practice",
    title: "Практика, интервью и проверка решений",
    caption: "Короткие циклы: теория, задачи, обратная связь и следующий шаг.",
    image: interviewVisual
  },
  {
    id: "community",
    title: "Среда обмена опытом",
    caption: "Разработчики и компании делятся историями, новостями и мнениями.",
    image: communityVisual
  }
]

const valueCards = [
  {
    title: "Персональный трек",
    text: "Выбираете направление, проходите оценку уровня и получаете понятную точку старта."
  },
  {
    title: "Измеримый прогресс",
    text: "Платформа показывает, где вы уже сильны и какие темы дают максимальный рост."
  },
  {
    title: "Подготовка к карьере",
    text: "Практические задания, интервью-вопросы и подтверждение навыков в едином процессе."
  }
]

const whyCards = [
  {
    title: "От обучения к результату",
    text: "Сфокусировано не на потреблении контента, а на готовности к реальным рабочим задачам."
  },
  {
    title: "Один контур развития",
    text: "Roadmaps, ежедневные задания, профиль, резюме и сообщество работают как связанная система."
  },
  {
    title: "Гибкий темп",
    text: "Можно двигаться маленькими шагами каждый день, не теряя целостной картины."
  },
  {
    title: "Понятная ценность",
    text: "Каждый этап объясняет, какой конкретный навык вы усиливаете и зачем он нужен на рынке."
  }
]

const stats = [
  { value: "24/7", label: "доступ к платформе" },
  { value: "AI", label: "поддержка и рекомендации" },
  { value: "IT", label: "фокус на востребованные роли" }
]

interface NavJourneyCopy {
  headline: string
  description: string
  actionLabel: string
  bridgeLead: string
  bridgeText: string
}

const navJourneyCopyByPath: Record<string, NavJourneyCopy> = {
  "/": {
    headline: "О проекте: единая точка входа в экосистему Skillo",
    description: "Этот раздел собирает общую картину платформы и помогает выбрать ближайший полезный шаг.",
    actionLabel: "Вы на главной",
    bridgeLead: "После обзора проекта переходите к основной рабочей зоне обучения.",
    bridgeText: "Следующий шаг - открыть дорожные карты и выбрать направление развития."
  },
  "/roadmaps": {
    headline: "Постройте маршрут обучения под конкретную цель",
    description: "Дорожные карты собирают темы в логичную последовательность и убирают хаотичное обучение.",
    actionLabel: "К дорожным картам",
    bridgeLead: "Когда маршрут определен, появляется понятный ежедневный ритм.",
    bridgeText: "Следующий шаг: закреплять темы короткими практиками, чтобы не терять темп."
  },
  "/daily-tasks": {
    headline: "Закрепляйте прогресс ежедневными заданиями",
    description: "Ежедневные тесты по вашим трекам помогают удерживать фокус и накапливать результат без перегруза.",
    actionLabel: "К ежедневным заданиям",
    bridgeLead: "Практика даёт данные о вашем уровне и готовности к проверке.",
    bridgeText: "После серии заданий логично перейти к формальному подтверждению навыков."
  },
  "/skill-verification": {
    headline: "Подтверждайте навыки в онлайн или офлайн формате",
    description: "Записывайтесь на слот с экспертом и фиксируйте достигнутый уровень в формате сертификата.",
    actionLabel: "К подтверждению навыков",
    bridgeLead: "Подтверждение сильнее работает, когда есть честная стартовая оценка.",
    bridgeText: "Перед углублением в треки полезно точно определить текущий уровень."
  },
  "/skill-levels": {
    headline: "Определите текущий уровень по направлению",
    description: "Оценка уровня показывает стартовую точку и помогает выбрать реалистичную нагрузку в треке.",
    actionLabel: "Определить уровень",
    bridgeLead: "Рост проще, когда рядом есть люди с похожими целями и темпом.",
    bridgeText: "На следующем этапе подключайте социальный слой: совместный прогресс и обмен опытом."
  },
  "/friends": {
    headline: "Добавляйте друзей и двигайтесь вместе",
    description: "Сравнивайте прогресс, поддерживайте друг друга и сохраняйте регулярность обучения.",
    actionLabel: "К друзьям",
    bridgeLead: "Личные связи усиливаются, когда есть общее пространство обсуждений.",
    bridgeText: "После этого переходите в сообщество за кейсами, постами и практическими идеями."
  },
  "/community": {
    headline: "Обсуждайте практику и карьерные кейсы в сообществе",
    description: "Публикации и дискуссии помогают быстрее находить рабочие подходы и видеть опыт других.",
    actionLabel: "К сообществу",
    bridgeLead: "Следующая цель после развития навыков - применять их в задачах рынка.",
    bridgeText: "Переходите к вакансиям и соотносите свой прогресс с требованиями работодателей."
  },
  "/vacancies": {
    headline: "Сопоставляйте навыки с актуальными вакансиями",
    description: "Раздел вакансий показывает, какие требования закрыты, а какие темы еще нужно усилить.",
    actionLabel: "К вакансиям",
    bridgeLead: "Рынок - это диалог двух сторон: кандидата и работодателя.",
    bridgeText: "Чтобы видеть вторую сторону процесса, откройте кабинет компании."
  },
  "/company": {
    headline: "Изучайте роль компании в экосистеме платформы",
    description: "Кабинет компании связывает требования рынка с развитием навыков пользователей.",
    actionLabel: "К кабинету компании",
    bridgeLead: "Когда цель ясна, полезно смотреть на ориентиры лучших участников.",
    bridgeText: "Дальше переходите к таблице лидеров, чтобы понимать верхнюю планку прогресса."
  },
  "/leaders": {
    headline: "Сверяйтесь с лидерами и измеряйте динамику",
    description: "Рейтинг показывает текущий темп по платформе и помогает калибровать собственные цели.",
    actionLabel: "К лидерам",
    bridgeLead: "Финальная точка цикла - личный профиль с подтвержденными результатами.",
    bridgeText: "В профиле собирается вся история развития: уровни, прогресс и достижения."
  },
  "/profile": {
    headline: "Управляйте своей траекторией через профиль",
    description: "Профиль объединяет уровни, активность, подтверждения и шаги, которые стоит сделать дальше.",
    actionLabel: "К профилю",
    bridgeLead: "Цикл завершен: теперь можно пересобрать цели и пройти маршрут заново.",
    bridgeText: "Возвращайтесь к началу, обновляйте план и повторяйте цикл уже на более высоком уровне."
  }
}

const navSequence = primaryNavLinks
const navJourneyCards = navSequence.map((link: { to: string | number; label: string }) => {
  const copy = navJourneyCopyByPath[link.to]

  return {
    to: link.to,
    label: link.label,
    headline: copy?.headline ?? `Раздел ${link.label}`,
    description: copy?.description ?? "Откройте раздел, чтобы продолжить развитие на платформе.",
    actionLabel: copy?.actionLabel ?? `Открыть ${link.label.toLowerCase()}`,
    bridgeLead: copy?.bridgeLead ?? "",
    bridgeText: copy?.bridgeText ?? ""
  }
})

interface HeroSparkle {
  id: number
  x: number
  y: number
  size: number
  driftX: number
  driftY: number
  duration: number
  delay: number
  hue: number
  expiresAt: number
}

const heroSparkles = ref<HeroSparkle[]>([])
const MAX_HERO_SPARKLES = 34
const HERO_SPARKLE_INTERVAL_MS = 46

let heroSparkleId = 0
let lastHeroSparkleAt = 0
let homeMouseFrameId = 0
let pendingPointerX = 0
let pendingPointerY = 0

const heroRef = ref<HTMLElement | null>(null)
const heroPointer = ref({ x: 50, y: 50, active: false })

const heroPointerStyle = computed(() => ({
  "--hero-glow-x": `${heroPointer.value.x}%`,
  "--hero-glow-y": `${heroPointer.value.y}%`,
  "--hero-glow-opacity": heroPointer.value.active ? "1" : "0"
}))

const shouldReduceMotion = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

const spawnHeroSparkles = (clientX: number, clientY: number, burst = 1) => {
  if (shouldReduceMotion()) return

  const now = performance.now()
  const nextSparkles = heroSparkles.value.filter((item) => item.expiresAt > now)

  for (let index = 0; index < burst; index += 1) {
    const angle = Math.random() * Math.PI * 2
    const radius = 3 + Math.random() * 18
    const id = ++heroSparkleId
    const duration = 620 + Math.random() * 520
    const delay = Math.random() * 90
    const expiresAt = now + duration + delay + 140

    const sparkle: HeroSparkle = {
      id,
      x: clientX + Math.cos(angle) * radius * 0.46,
      y: clientY + Math.sin(angle) * radius * 0.46,
      size: 4 + Math.random() * 8,
      driftX: (Math.random() - 0.5) * 44,
      driftY: -16 - Math.random() * 42,
      duration,
      delay,
      hue: 196 + Math.random() * 18,
      expiresAt
    }

    nextSparkles.push(sparkle)
  }

  if (nextSparkles.length > MAX_HERO_SPARKLES) {
    nextSparkles.splice(0, nextSparkles.length - MAX_HERO_SPARKLES)
  }

  heroSparkles.value = nextSparkles
}

const heroSparkleStyle = (sparkle: HeroSparkle) => {
  return {
    left: `${sparkle.x}px`,
    top: `${sparkle.y}px`,
    "--sparkle-size": `${sparkle.size}px`,
    "--sparkle-dx": `${sparkle.driftX}px`,
    "--sparkle-dy": `${sparkle.driftY}px`,
    "--sparkle-duration": `${sparkle.duration}ms`,
    "--sparkle-delay": `${sparkle.delay}ms`,
    "--sparkle-hue": `${sparkle.hue}`
  }
}

const updateHeroPointer = (clientX: number, clientY: number) => {
  const heroElement = heroRef.value
  if (!heroElement) {
    heroPointer.value.active = false
    return
  }

  const rect = heroElement.getBoundingClientRect()
  const isInsideHero =
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom

  if (!isInsideHero) {
    heroPointer.value.active = false
    return
  }

  const x = ((clientX - rect.left) / rect.width) * 100
  const y = ((clientY - rect.top) / rect.height) * 100

  heroPointer.value.x = Math.min(100, Math.max(0, x))
  heroPointer.value.y = Math.min(100, Math.max(0, y))
  heroPointer.value.active = true
}

const handleHomeMouseEnter = () => {
  lastHeroSparkleAt = 0
}

const handleHomeMouseMove = (event: MouseEvent) => {
  pendingPointerX = event.clientX
  pendingPointerY = event.clientY

  if (homeMouseFrameId) return

  homeMouseFrameId = window.requestAnimationFrame(() => {
    homeMouseFrameId = 0

    updateHeroPointer(pendingPointerX, pendingPointerY)

    const now = performance.now()
    if (now - lastHeroSparkleAt < HERO_SPARKLE_INTERVAL_MS) return

    const burst = Math.random() > 0.76 ? 2 : 1
    spawnHeroSparkles(pendingPointerX, pendingPointerY, burst)
    lastHeroSparkleAt = now
  })
}

const handleHomeMouseLeave = () => {
  if (homeMouseFrameId) {
    window.cancelAnimationFrame(homeMouseFrameId)
    homeMouseFrameId = 0
  }

  heroPointer.value = { x: 50, y: 50, active: false }
}

const navigate = (path: string | number) => {
  router.push(String(path))
}

onBeforeUnmount(() => {
  if (homeMouseFrameId) {
    window.cancelAnimationFrame(homeMouseFrameId)
  }
})
</script>

<template>
  <div class="home">
    <div class="page-sparkle-layer" aria-hidden="true">
      <span
        v-for="sparkle in heroSparkles"
        :key="sparkle.id"
        class="hero-sparkle"
        :style="heroSparkleStyle(sparkle)"
      />
    </div>
    <section
      ref="heroRef"
      class="hero ambient-host"
      :style="heroPointerStyle"
      @mouseenter="handleHomeMouseEnter"
      @mousemove="handleHomeMouseMove"
      @mouseleave="handleHomeMouseLeave"
    >
      <AmbientMotionLayer mode="hero" edge-fade="wide" intensity="medium" />
      <span class="badge">О проекте Skillo</span>
      <h1>Skillo: платформа роста в <span class="accent">IT</span></h1>
      <p>Единая среда, где обучение, практика, оценка уровня и карьерный трек работают как один процесс.</p>

      <div class="hero-actions">
        <button class="primary" @click="navigate('/roadmaps')">
          Открыть дорожные карты
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
        <button class="secondary" @click="navigate('/community')">Перейти в сообщество</button>
      </div>
    </section>

    <section class="story-grid" aria-label="Визуальная история проекта">
      <article
        v-for="(slide, index) in projectSlides"
        :key="slide.id"
        class="story-card"
        :style="{ '--story-delay': `${index * 120}ms` }"
      >
        <img :src="slide.image" :alt="slide.title" loading="lazy" />
        <div class="story-copy">
          <h3>{{ slide.title }}</h3>
          <p>{{ slide.caption }}</p>
        </div>
      </article>
    </section>

    <section class="text-bridge">
      <p class="text-bridge-lead">Каждое направление связано с карьерной целью, а не просто с темами для изучения</p>
      <p class="text-bridge-sub">Так легче держать фокус и понимать, какой следующий шаг даст максимум пользы.</p>
    </section>

    <section class="values ambient-host">
      <AmbientMotionLayer mode="panel" edge-fade="soft" intensity="low" />
      <div class="values-head">
        <span>Что внутри проекта</span>
        <h2>Полный цикл развития специалиста</h2>
      </div>
      <div class="values-grid">
        <article v-for="item in valueCards" :key="item.title" class="value-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
    </section>

    <section class="about">
      <div class="about-copy ambient-host">
        <AmbientMotionLayer mode="soft" edge-fade="soft" intensity="low" />
        <span class="about-kicker">О платформе</span>
        <h2>Skillo сокращает путь от обучения к реальной работе</h2>
        <p>
          Проект объединяет дорожные карты, задания, интервью-подготовку и подтверждение навыков.
          Вы двигаетесь по прозрачному маршруту и видите результат каждого этапа.
        </p>
        <p>
          Главная идея: меньше хаоса, больше системного прогресса и уверенности в своем уровне.
        </p>
      </div>
      <div class="about-stats">
        <article v-for="item in stats" :key="item.label">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </article>
      </div>
    </section>

    <section class="why ambient-host">
      <AmbientMotionLayer mode="panel" edge-fade="soft" intensity="low" />
      <h2>Почему пользователи выбирают Skillo</h2>
      <div class="why-grid">
        <article v-for="item in whyCards" :key="item.title" class="why-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
    </section>

    <section class="text-bridge text-bridge--second">
      <p class="text-bridge-lead">Прогресс виден по шагам, поэтому проще удерживать темп и не терять мотивацию</p>
      <p class="text-bridge-sub">Даже короткие ежедневные сессии складываются в ощутимый рост навыков.</p>
    </section>

    <section class="nav-journey">
      <div class="nav-journey-head">
        <span>Маршрут по разделам</span>
        <h2>Весь функционал платформы в порядке меню навигации</h2>
        <p>
          Ниже собраны все ключевые разделы Skillo по последовательности из бокового меню.
          Переходите по шагам и используйте платформу как цельную систему роста.
        </p>
      </div>

      <div class="nav-journey-list">
        <template v-for="(item, index) in navJourneyCards" :key="item.to">
          <article class="nav-journey-card ambient-host">
            <AmbientMotionLayer mode="panel" edge-fade="soft" intensity="low" />
            <div class="nav-journey-card-head">
              <span>{{ index + 1 }}. {{ item.label }}</span>
              <small>{{ item.to }}</small>
            </div>
            <h3>{{ item.headline }}</h3>
            <p>{{ item.description }}</p>
            <div class="nav-journey-actions">
              <button class="primary" @click="navigate(String(item.to))">{{ item.actionLabel }}</button>
            </div>
          </article>

          <section v-if="index < navJourneyCards.length - 1" class="nav-journey-bridge">
            <p class="nav-journey-bridge-lead">{{ item.bridgeLead }}</p>
            <p class="nav-journey-bridge-text">{{ item.bridgeText }}</p>
          </section>
        </template>
      </div>
    </section>

    <section class="cta ambient-host">
      <AmbientMotionLayer mode="cta" edge-fade="wide" intensity="medium" />
      <h2>Начните с определения уровня и выберите трек под свою цель</h2>
      <p>Платформа подскажет точку старта и поможет собрать следующий реалистичный шаг.</p>
      <div class="hero-actions">
        <button class="primary" @click="navigate('/skill-levels')">Определить уровень</button>
        <button class="secondary" @click="navigate('/roadmaps')">К дорожным картам</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  --about-accent: #2f9bd8;
  --about-accent-strong: #1f7fba;
  --about-accent-soft: #8fd4ff;
  --about-accent-hover: #41a8e2;
  position: relative;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  width: 100vw;
  margin: calc(-1 * (var(--top-nav-height) + 18px)) calc(50% - 50vw) 0;
  border: none;
  border-radius: 0;
  background:
    radial-gradient(420px 220px at 12% -8%, rgba(109, 152, 255, 0.16), transparent 72%),
    radial-gradient(400px 220px at 92% 0%, rgba(255, 142, 60, 0.15), transparent 70%),
    linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  min-height: 100dvh;
  --hero-block-pad: clamp(26px, 7vh, 64px);
  padding: var(--hero-block-pad) max(16px, calc((100vw - 1120px) / 2));
  padding-top: calc(var(--hero-block-pad) + var(--top-nav-height));
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: inset 0 -1px 0 var(--border);
  transition: box-shadow 0.26s ease, filter 0.26s ease;
}

.hero::before {
  content: "";
  position: absolute;
  inset: -24%;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(
      560px 380px at var(--hero-glow-x, 50%) var(--hero-glow-y, 50%),
      color-mix(in srgb, var(--about-accent) 40%, transparent) 0%,
      color-mix(in srgb, var(--about-accent) 22%, transparent) 28%,
      color-mix(in srgb, var(--about-accent) 10%, transparent) 48%,
      transparent 72%
    ),
    radial-gradient(
      190px 140px at calc(var(--hero-glow-x, 50%) + 8%) calc(var(--hero-glow-y, 50%) - 6%),
      color-mix(in srgb, var(--about-accent-soft) 28%, transparent) 0%,
      transparent 76%
    );
  opacity: var(--hero-glow-opacity, 0);
  filter: saturate(128%);
  transform: scale(0.98);
  transition: opacity 0.22s ease, transform 0.26s ease, filter 0.26s ease;
}

.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(130deg, color-mix(in srgb, var(--about-accent) 14%, transparent) -8%, transparent 48%),
    radial-gradient(600px 300px at 90% 0%, color-mix(in srgb, var(--about-accent) 11%, transparent) 0%, transparent 78%);
  opacity: 0;
  transition: opacity 0.24s ease;
}

.hero:hover {
  box-shadow:
    inset 0 -1px 0 var(--border),
    inset 0 0 0 1px color-mix(in srgb, var(--about-accent) 30%, transparent),
    0 26px 60px color-mix(in srgb, var(--about-accent) 12%, transparent);
  filter: saturate(1.02);
}

.hero:hover::before {
  opacity: 0.78;
  transform: scale(1.03);
  filter: saturate(120%);
}

.hero:hover::after {
  opacity: 0.62;
}

.page-sparkle-layer {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  overflow: hidden;
}

.hero-sparkle {
  --sparkle-size: 8px;
  --sparkle-dx: 0px;
  --sparkle-dy: -24px;
  --sparkle-duration: 880ms;
  --sparkle-delay: 0ms;
  --sparkle-hue: 206;
  position: absolute;
  width: var(--sparkle-size);
  height: var(--sparkle-size);
  transform: translate(-50%, -50%) scale(0.35) rotate(0deg);
  border-radius: 999px;
  background: radial-gradient(
    circle,
    hsla(var(--sparkle-hue), 92%, 72%, 0.86) 0%,
    hsla(var(--sparkle-hue), 86%, 62%, 0.34) 62%,
    transparent 100%
  );
  filter: drop-shadow(0 0 9px hsla(var(--sparkle-hue), 90%, 64%, 0.42));
  opacity: 0;
  animation: hero-sparkle-trail var(--sparkle-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--sparkle-delay);
  will-change: transform, opacity;
}

.hero-sparkle::before,
.hero-sparkle::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--sparkle-size) * 1.8);
  height: 1.5px;
  border-radius: 99px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    hsla(var(--sparkle-hue), 92%, 74%, 0.78) 50%,
    transparent 100%
  );
  transform: translate(-50%, -50%);
}

.hero-sparkle::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

.badge {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  padding: 6px 14px;
  margin-bottom: 14px;
}

.hero h1 {
  margin: 0 0 10px;
  font-size: clamp(32px, 5vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: var(--text);
}

.hero h1 .accent {
  background: linear-gradient(120deg, var(--about-accent-strong) 0%, var(--about-accent) 55%, #66c4ee 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero p {
  margin: 0;
  max-width: 60ch;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.hero-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.hero button {
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 11px;
}

.hero button.primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.story-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 8px;
  display: grid;
  gap: 10px;
  opacity: 0;
  transform: translateY(10px);
  animation: story-in 0.66s ease forwards;
  animation-delay: var(--story-delay, 0ms);
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.story-card::after {
  content: "";
  position: absolute;
  inset: -42% 45% auto -45%;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.24) 0%, transparent 72%);
  opacity: 0;
  transition: opacity 0.24s ease;
  pointer-events: none;
}

.story-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  object-fit: cover;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  animation: story-float 6s ease-in-out infinite;
}

.story-card:hover {
  border-color: var(--soft-border);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.story-card:hover::after {
  opacity: 1;
}

.story-card:nth-child(2) img {
  animation-delay: 0.3s;
}

.story-card:nth-child(3) img {
  animation-delay: 0.6s;
}

.story-copy h3 {
  margin: 0 0 4px;
  color: var(--text);
  font-size: 16px;
  line-height: 1.3;
}

.story-copy p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.text-bridge {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;
}

.text-bridge-lead {
  margin: 0;
  max-width: 34ch;
  font-size: clamp(24px, 3.6vw, 42px);
  line-height: 1.06;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: color-mix(in srgb, var(--text) 82%, var(--about-accent) 18%);
}

.text-bridge-sub {
  margin: 0;
  max-width: 54ch;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.text-bridge--second .text-bridge-lead {
  color: color-mix(in srgb, var(--text) 78%, var(--about-accent) 22%);
}

.values {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 88%, transparent) 0%, var(--surface-soft) 100%);
  padding: 16px 14px;
  display: grid;
  gap: 14px;
}

.values-head {
  display: grid;
  gap: 8px;
  text-align: center;
}

.values-head span {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.09em;
}

.values-head h2 {
  margin: 0;
  color: var(--text);
  font-size: 30px;
  line-height: 1.16;
  letter-spacing: -0.025em;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.value-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 16px;
  display: grid;
  gap: 8px;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.value-card::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--text) 14%, transparent) 0%, transparent 85%);
  opacity: 0.65;
}

.value-card:hover {
  border-color: var(--soft-border);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.value-card h3 {
  margin: 0;
  color: var(--text);
  font-size: 17px;
}

.value-card p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
}

.about {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 12px;
}

.about-copy {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 18px;
  display: grid;
  gap: 8px;
}

.about-kicker {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.about-copy h2 {
  margin: 0;
  color: var(--text);
  font-size: 28px;
  line-height: 1.16;
  letter-spacing: -0.024em;
}

.about-copy p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.about-stats {
  display: grid;
  gap: 10px;
}

.about-stats article {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 5px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.about-stats article:hover {
  border-color: var(--soft-border);
  box-shadow: var(--shadow-sm);
}

.about-stats strong {
  font-size: 24px;
  line-height: 1;
  color: var(--text);
}

.about-stats span {
  color: var(--muted);
  font-size: 13px;
}

.why {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 90%, transparent) 0%, var(--surface-soft) 100%);
  padding: 16px 14px;
  display: grid;
  gap: 12px;
}

.why h2 {
  margin: 0;
  text-align: center;
  color: var(--text);
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.why-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.why-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 7px;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.why-card::before {
  content: "";
  position: absolute;
  inset: auto -28% -58% auto;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 72%);
  opacity: 0;
  transition: opacity 0.24s ease;
  pointer-events: none;
}

.why-card:hover {
  border-color: var(--soft-border);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.why-card:hover::before {
  opacity: 1;
}

.why-card h3 {
  margin: 0;
  color: var(--text);
  font-size: 16px;
}

.why-card p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
}

.nav-journey {
  display: grid;
  gap: 14px;
}

.nav-journey-head {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 18px;
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
}

.nav-journey-head span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.nav-journey-head h2 {
  margin: 0;
  color: var(--text);
  font-size: clamp(27px, 4vw, 38px);
  line-height: 1.14;
  letter-spacing: -0.03em;
  max-width: 30ch;
}

.nav-journey-head p {
  margin: 0;
  max-width: 66ch;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.nav-journey-list {
  display: grid;
  gap: 14px;
}

.nav-journey-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background:
    radial-gradient(360px 210px at 100% 0%, rgba(255, 142, 60, 0.09), transparent 72%),
    linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 16px;
  display: grid;
  gap: 10px;
  transition: border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
}

.nav-journey-card:hover {
  border-color: var(--soft-border);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.nav-journey-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
}

.nav-journey-card-head span {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}

.nav-journey-card-head small {
  font-size: 12px;
  color: var(--muted);
}

.nav-journey-card h3 {
  margin: 0;
  color: var(--text);
  font-size: 26px;
  line-height: 1.16;
  letter-spacing: -0.03em;
  max-width: 34ch;
}

.nav-journey-card p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  max-width: 70ch;
}

.nav-journey-actions {
  margin-top: 2px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.nav-journey-actions button {
  padding: 10px 14px;
  border-radius: 11px;
  font-size: 13px;
}

.nav-journey-actions .primary {
  border: 1px solid color-mix(in srgb, var(--about-accent-strong) 78%, #ffffff 22%) !important;
  background: linear-gradient(135deg, var(--about-accent-strong) 0%, var(--about-accent) 100%) !important;
  color: var(--button-text) !important;
}

.nav-journey-actions .primary:hover {
  border-color: color-mix(in srgb, var(--about-accent-hover) 82%, #ffffff 18%) !important;
  background: linear-gradient(135deg, #2a91ca 0%, var(--about-accent-hover) 100%) !important;
  color: var(--button-text) !important;
}

.nav-journey-bridge {
  display: grid;
  gap: 6px;
  justify-items: center;
  text-align: center;
  padding: 2px 8px;
}

.nav-journey-bridge-lead {
  margin: 0;
  max-width: 34ch;
  font-size: clamp(21px, 3vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.026em;
  font-weight: 700;
  color: color-mix(in srgb, var(--text) 78%, var(--about-accent) 22%);
}

.nav-journey-bridge-text {
  margin: 0;
  max-width: 60ch;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.cta {
  border: 1px solid var(--border);
  border-radius: 16px;
  background:
    radial-gradient(300px 180px at 90% 0%, rgba(255, 142, 60, 0.13), transparent 72%),
    linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 22px 18px;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;
}

.cta h2 {
  margin: 0;
  max-width: 36ch;
  color: var(--text);
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.cta p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  max-width: 56ch;
}

@keyframes story-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-5px) scale(1.01);
  }
}

@keyframes story-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes hero-sparkle-trail {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.32) rotate(0deg);
  }

  15% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--sparkle-dx)), calc(-50% + var(--sparkle-dy))) scale(1.25) rotate(28deg);
  }
}

@media (max-width: 980px) {
  .story-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .values-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .about {
    grid-template-columns: 1fr;
  }

  .nav-journey-card h3 {
    font-size: 23px;
  }
}

@media (max-width: 680px) {
  .story-grid,
  .values-grid,
  .why-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    margin-top: calc(-1 * (var(--top-nav-height) + 10px));
    min-height: 100dvh;
    padding: 20px 16px;
    padding-top: calc(20px + var(--top-nav-height));
  }

  .hero h1 {
    font-size: 34px;
  }

  .values-head h2,
  .why h2,
  .about-copy h2,
  .cta h2 {
    font-size: 24px;
  }

  .hero-actions {
    width: 100%;
  }

  .hero-actions button {
    width: 100%;
  }

  .nav-journey-card {
    padding: 14px;
  }

  .nav-journey-card-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .nav-journey-card h3 {
    font-size: 21px;
  }

  .nav-journey-actions {
    width: 100%;
  }

  .nav-journey-actions button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-sparkle-layer {
    display: none;
  }

  .hero::before,
  .hero::after {
    transition: none !important;
  }

  .story-card,
  .story-card img {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
