export type RoadmapLevel = "Beginner" | "Intermediate" | "Advanced"

export interface Roadmap {
  id: string
  title: string
  description: string
  level: RoadmapLevel
  recommended: boolean
}

export type TopicStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "locked"

export interface RoadmapNode {
  id: string
  title: string
  status: TopicStatus
  children?: RoadmapNode[]
}

export interface AssessmentOption {
  id: string
  label: string
  score: number
}

export interface AssessmentQuestion {
  id: string
  text: string
  options: AssessmentOption[]
}

export interface RoadmapAssessment {
  roadmapId: string
  title: string
  questions: AssessmentQuestion[]
}

export const mockRoadmaps: Roadmap[] = [
  {
    id: "ai",
    title: "Искусственный интеллект",
    description: "Полный путь обучения AI-инженерии",
    level: "Intermediate",
    recommended: true
  },
  {
    id: "frontend",
    title: "Фронтенд-разработка",
    description: "Современная разработка пользовательских интерфейсов",
    level: "Beginner",
    recommended: true
  },
  {
    id: "backend",
    title: "Бэкенд-разработка",
    description: "Серверная разработка и API",
    level: "Intermediate",
    recommended: true
  },
  {
    id: "devops",
    title: "DevOps-инженерия",
    description: "CI/CD, Docker, облако",
    level: "Advanced",
    recommended: false
  },
  {
    id: "ux-ui",
    title: "ux-ui",
    description: "Flutter / React Native",
    level: "Beginner",
    recommended: false
  }
]

export const mockUserCollection: string[] = ["ai", "frontend"]

const defaultOptions: AssessmentOption[] = [
  { id: "opt_beginner", label: "Я только начинаю", score: 1 },
  { id: "opt_intermediate", label: "У меня есть практический опыт на реальных задачах", score: 2 },
  { id: "opt_advanced", label: "Я уверенно применяю это в продакшене", score: 3 }
]

export const mockRoadmapAssessments: Record<string, RoadmapAssessment> = {
  ai: {
    roadmapId: "ai",
    title: "Оценка уровня по AI",
    questions: [
      { id: "ai_math", text: "Как вы оцениваете свои знания математики для ML?", options: defaultOptions },
      { id: "ai_models", text: "Есть ли у вас опыт обучения моделей?", options: defaultOptions },
      { id: "ai_frameworks", text: "Насколько уверенно вы работаете с ML-фреймворками?", options: defaultOptions },
      { id: "ai_data", text: "Насколько уверенно вы подготавливаете и очищаете датасеты?", options: defaultOptions },
      { id: "ai_metrics", text: "Насколько хорошо вы понимаете метрики оценки (precision/recall/F1)?", options: defaultOptions },
      { id: "ai_deploy", text: "Разворачивали ли вы ML/AI-модели в реальных окружениях?", options: defaultOptions }
    ]
  },
  frontend: {
    roadmapId: "frontend",
    title: "Оценка уровня по фронтенду",
    questions: [
      { id: "fe_layout", text: "Насколько уверенно вы работаете с адаптивной версткой?", options: defaultOptions },
      { id: "fe_js", text: "Какой у вас текущий уровень JavaScript?", options: defaultOptions },
      { id: "fe_framework", text: "Есть ли у вас опыт работы с современными UI-фреймворками?", options: defaultOptions },
      { id: "fe_accessibility", text: "Как часто вы применяете лучшие практики доступности (a11y)?", options: defaultOptions },
      { id: "fe_state", text: "Насколько уверенно вы используете паттерны управления состоянием?", options: defaultOptions },
      { id: "fe_perf", text: "Насколько уверенно вы оптимизируете производительность фронтенда?", options: defaultOptions }
    ]
  },
  backend: {
    roadmapId: "backend",
    title: "Оценка уровня по бэкенду",
    questions: [
      { id: "be_api", text: "Насколько уверенно вы проектируете REST API?", options: defaultOptions },
      { id: "be_db", text: "Есть ли у вас опыт работы с SQL/NoSQL базами данных?", options: defaultOptions },
      { id: "be_auth", text: "Как вы оцениваете свой опыт в аутентификации и безопасности?", options: defaultOptions },
      { id: "be_scaling", text: "Насколько уверенно вы масштабируете бэкенд-сервисы?", options: defaultOptions },
      { id: "be_cache", text: "Используете ли вы стратегии кеширования (Redis/CDN/in-memory)?", options: defaultOptions },
      { id: "be_observability", text: "Насколько уверенно вы работаете с логами, метриками и трассировкой?", options: defaultOptions }
    ]
  },
  devops: {
    roadmapId: "devops",
    title: "Оценка уровня по DevOps",
    questions: [
      { id: "devops_ci", text: "Насколько хорошо вы знакомы с CI/CD пайплайнами?", options: defaultOptions },
      { id: "devops_containers", text: "Есть ли у вас опыт работы с Docker/Kubernetes?", options: defaultOptions },
      { id: "devops_cloud", text: "Насколько уверенно вы работаете с облачными провайдерами?", options: defaultOptions },
      { id: "devops_iac", text: "Насколько уверенно вы используете Infrastructure as Code?", options: defaultOptions },
      { id: "devops_monitoring", text: "Настраиваете ли вы мониторинг и алертинг в проектах?", options: defaultOptions },
      { id: "devops_security", text: "Насколько уверенно вы применяете практики DevSecOps?", options: defaultOptions }
    ]
  },
  mobile: {
    roadmapId: "mobile",
    title: "Оценка уровня по мобильной разработке",
    questions: [
      { id: "mobile_ui", text: "Есть ли у вас опыт разработки мобильных интерфейсов?", options: defaultOptions },
      { id: "mobile_state", text: "Насколько уверенно вы управляете состоянием приложения?", options: defaultOptions },
      { id: "mobile_release", text: "Есть ли у вас опыт публикации приложений в сторах?", options: defaultOptions },
      { id: "mobile_arch", text: "Насколько уверенно вы используете архитектурные паттерны мобильной разработки?", options: defaultOptions },
      { id: "mobile_perf", text: "Насколько уверенно вы оптимизируете производительность мобильных приложений?", options: defaultOptions },
      { id: "mobile_testing", text: "Пишете ли вы автоматизированные тесты для мобильных приложений?", options: defaultOptions }
    ]
  }
}

export const mockRoadmapTrees: Record<string, RoadmapNode[]> = {
  ai: [
    {
      id: "ai-foundations",
      title: "Основы AI",
      status: "completed",
      children: [
        {
          id: "ai-history-track",
          title: "Исторический контекст",
          status: "completed",
          children: [
            {
              id: "history-of-ai",
              title: "История AI",
              status: "completed"
            },
            {
              id: "data-preprocessing",
              title: "Предобработка данных",
              status: "in_progress"
            }
          ]
        },
        {
          id: "ai-ml-track",
          title: "Основы машинного обучения",
          status: "in_progress",
          children: [
            {
              id: "ml-intro",
              title: "Введение в машинное обучение",
              status: "in_progress"
            },
            {
              id: "model-evaluation",
              title: "Оценка моделей",
              status: "not_started"
            }
          ]
        }
      ]
    },
    {
      id: "ai-deep-learning",
      title: "Глубокое обучение",
      status: "not_started",
      children: [
        {
          id: "ai-nn-track",
          title: "Основы нейронных сетей",
          status: "not_started",
          children: [
            {
              id: "neural-networks",
              title: "Нейронные сети",
              status: "not_started"
            },
            {
              id: "optimization-basics",
              title: "Основы оптимизации",
              status: "locked"
            }
          ]
        },
        {
          id: "ai-cnn-track",
          title: "Путь компьютерного зрения",
          status: "locked",
          children: [
            {
              id: "cnn",
              title: "CNN",
              status: "locked"
            },
            {
              id: "transformers-basics",
              title: "Основы трансформеров",
              status: "locked"
            }
          ]
        }
      ]
    }
  ],

  frontend: [
    {
      id: "fe-layout-foundation",
      title: "Основы HTML и CSS",
      status: "completed",
      children: [
        {
          id: "fe-flex-layout",
          title: "Одномерная верстка",
          status: "completed",
          children: [
            { id: "flexbox", title: "Флексбокс", status: "completed" },
            { id: "responsive-design", title: "Адаптивный дизайн", status: "in_progress" }
          ]
        },
        {
          id: "fe-grid-layout",
          title: "Двумерная верстка",
          status: "in_progress",
          children: [
            { id: "grid", title: "CSS Grid", status: "in_progress" },
            { id: "css-architecture", title: "Архитектура CSS", status: "not_started" }
          ]
        }
      ]
    },
    {
      id: "fe-vue-foundation",
      title: "Vue 3",
      status: "not_started",
      children: [
        {
          id: "fe-comp-api",
          title: "Компонентная архитектура",
          status: "not_started",
          children: [
            { id: "composition-api", title: "Composition API", status: "not_started" },
            { id: "vue-lifecycle", title: "Жизненный цикл Vue", status: "locked" }
          ]
        },
        {
          id: "fe-state-layer",
          title: "Слой состояния",
          status: "locked",
          children: [
            { id: "pinia", title: "Управление состоянием (Pinia)", status: "locked" },
            { id: "vue-router-basics", title: "Основы Vue Router", status: "locked" }
          ]
        }
      ]
    }
  ],

  backend: [
    {
      id: "be-node-path",
      title: "Node.js",
      status: "not_started",
      children: [
        {
          id: "be-api-layer",
          title: "Слой API",
          status: "not_started",
          children: [
            { id: "express", title: "Express", status: "not_started" },
            { id: "rest-design", title: "Проектирование REST API", status: "locked" }
          ]
        },
        {
          id: "be-security-layer",
          title: "Слой безопасности",
          status: "locked",
          children: [
            { id: "auth", title: "Аутентификация", status: "locked" },
            { id: "role-based-access", title: "Ролевой доступ", status: "locked" }
          ]
        },
        {
          id: "be-data-layer",
          title: "Слой данных",
          status: "locked",
          children: [
            { id: "database-indexing", title: "Индексация баз данных", status: "locked" }
          ]
        }
      ]
    }
  ],

  devops: [
    {
      id: "devops-containers",
      title: "Контейнеры",
      status: "not_started",
      children: [
        {
          id: "devops-docker-path",
          title: "Основы Docker",
          status: "not_started",
          children: [
            { id: "docker-basics", title: "Базовый Docker", status: "not_started" },
            { id: "docker-networking", title: "Сетевое взаимодействие в Docker", status: "locked" }
          ]
        },
        {
          id: "devops-cicd-path",
          title: "Путь автоматизации",
          status: "locked",
          children: [
            { id: "cicd-pipelines", title: "CI/CD пайплайны", status: "locked" },
            { id: "monitoring-basics", title: "Основы мониторинга", status: "locked" }
          ]
        }
      ]
    }
  ],

  mobile: [
    {
      id: "mobile-core",
      title: "Основы мобильной разработки",
      status: "not_started",
      children: [
        {
          id: "mobile-flutter-track",
          title: "Путь Flutter",
          status: "not_started",
          children: [
            {
              id: "flutter",
              title: "Flutter",
              status: "not_started"
            },
            {
              id: "dart-basics",
              title: "Основы Dart",
              status: "locked"
            },
            {
              id: "state-management-mobile",
              title: "Управление состоянием",
              status: "locked"
            },
            {
              id: "app-deployment",
              title: "Публикация приложения",
              status: "locked"
            }
          ]
        }
      ]
    }
  ]
}
