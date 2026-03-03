export const primaryNavLinks: any[] = [
  {
    to: "/",
    label: "О проекте",
    iconPaths: ["M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"]
  },
  {
    to: "/roadmaps",
    label: "Дорожные карты",
    iconPaths: ["M4 6h16v12H4zM8 10h8M8 14h5"]
  },
  {
    to: "/daily-tasks",
    label: "Ежедневные задания",
    iconPaths: ["M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"]
  },
  {
    to: "/skill-verification",
    label: "Подтверждение навыков",
    iconPaths: ["M8 3h8M6 7h12M5 11h14M7 15h10M10 19h4", "M12 11v8"]
  },
  {
    to: "/skill-levels",
    label: "Определение уровня",
    iconPaths: ["M4 19h16M7 19V9M12 19V5M17 19v-7"]
  },
  {
    to: "/knowledge-graph",
    label: "Слабые стороны",
    iconPaths: ["M5 19V9l5-4 5 4v10", "M5 13h10", "M12 9v10"]
  },
  {
    to: "/friends",
    label: "Друзья",
    iconPaths: ["M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6"]
  },
  {
    to: "/community",
    label: "Сообщество",
    iconPaths: ["M6 9h12M6 13h8M4 5h16v14H9l-5 3z"]
  },
  {
    to: "/vacancies",
    label: "Вакансии",
    iconPaths: ["M3 7h18v13H3zM8 7V5h8v2M3 12h18"]
  },
  {
    to: "/company",
    label: "Кабинет компании",
    iconPaths: ["M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6"]
  },
  {
    to: "/leaders",
    label: "Лидеры",
    iconPaths: ["M8 4h8v2h3v2a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V6h3zM12 13v4M9 21h6"]
  },
  {
    to: "/profile",
    label: "Профиль",
    iconPaths: ["M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"]
  }
]

export const footerColumns = [
  {
    title: "Платформа",
    links: [
      { label: "О проекте", to: "/" },
      { label: "Дорожные карты", to: "/roadmaps" },
      { label: "Ежедневные задания", to: "/daily-tasks" },
      { label: "Определение уровня", to: "/skill-levels" },
      { label: "Knowledge graph", to: "/knowledge-graph" }
    ]
  },
  {
    title: "Карьера",
    links: [
      { label: "Подтверждение навыков", to: "/skill-verification" },
      { label: "Вакансии", to: "/vacancies" },
      { label: "Лидеры", to: "/leaders" },
      { label: "Профиль", to: "/profile" }
    ]
  },
  {
    title: "Сообщество",
    links: [
      { label: "Публикации", to: "/community" },
      { label: "Друзья", to: "/friends" },
      { label: "Кабинет компании", to: "/company" }
    ]
  }
]
