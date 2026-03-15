import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/features/auth/store/auth"

const routes = [
  { path: "/", component: () => import("@/features/home/views/HomeView.vue") },
  {
    path: "/auth",
    component: () => import("@/features/auth/views/AuthEntryView.vue"),
    meta: { layout: "auth", public: true }
  },
  {
    path: "/login",
    component: () => import("@/features/auth/views/LoginView.vue"),
    meta: { layout: "auth", public: true }
  },
  {
    path: "/register",
    component: () => import("@/features/auth/views/RegisterView.vue"),
    meta: { layout: "auth", public: true }
  },
  {
    path: "/onboarding",
    component: () => import("@/features/auth/views/OnboardingView.vue"),
    meta: { layout: "auth" }
  },
  { path: "/leaders", component: () => import("@/features/leaders/views/LeadersView.vue") },
  { path: "/company", component: () => import("@/features/company/views/CompanyCabinetView.vue") },
  { path: "/friends", component: () => import("@/features/friends/views/FriendsView.vue") },
  { path: "/community", component: () => import("@/features/community/views/CommunityHubView.vue") },
  { path: "/vacancies", component: () => import("@/features/vacancies/views/VacanciesView.vue") },
  {
    path: "/vacancies/:id/preparation",
    name: "vacancy-preparation",
    component: () => import("@/features/vacancies/views/VacancyPreparationView.vue"),
  },
  { path: "/profile", component: () => import("@/features/profile/views/ProfileView.vue") },
  {
    path: "/skill-verification",
    name: "skill-verification",
    component: () => import("@/features/skill-verification/views/SkillVerificationView.vue"),
  },
  {
    path: "/skill-levels",
    name: "skill-levels",
    component: () => import("@/features/skill-levels/views/SkillLevelAssessmentView.vue"),
  },
  {
    path: "/knowledge-graph",
    name: "knowledge-graph",
    component: () => import("@/features/knowledge-graph/views/KnowledgeGraphView.vue"),
  },
  {
    path: "/roadmaps",
    name: "roadmaps",
    component: () => import("@/features/roadmaps/views/RoadmapsView.vue"),
  },
  {
    path: "/daily-tasks",
    name: "daily-tasks",
    component: () => import("@/features/daily-tasks/views/DailyTasksView.vue"),
  },
  {
    path: "/roadmaps/:id/assessment",
    name: "roadmap-assessment",
    component: () => import("@/features/roadmaps/views/RoadmapAssessmentView.vue"),
  },
  {
    path: "/roadmaps/:id",
    name: "roadmap-detail",
    component: () => import("@/features/roadmaps/views/RoadmapDetailView.vue"),
  },
  {
    path: "/topics/:id/interview",
    name: "topic-interview",
    component: () => import("@/features/roadmaps/views/TopicInterviewView.vue"),
  },
  {
    path: "/topics/:id",
    name: "topic",
    component: () => import("@/features/roadmaps/views/TopicView.vue"),
  },
  {
    path: "/error/service-unavailable",
    name: "service-unavailable",
    component: () => import("@/features/system/views/ServiceUnavailableView.vue"),
    meta: { layout: "auth", public: true }
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/features/system/views/NotFoundView.vue"),
    meta: { layout: "auth", public: true }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const roleAwareAuthPaths = new Set(["/login", "/register"])
const allowedRoles = new Set(["student", "company"])

router.beforeEach((to) => {
  const auth = useAuthStore()

  // PUBLIC routes
  if (to.meta.public) return true

  // not logged in
  if (!auth.token) {
    return "/login"
  }

  // onboarding check
  if (auth.isFirstLogin && to.path !== "/onboarding") {
    return "/onboarding"
  }

  // if onboarding already done, prevent going back
  if (!auth.isFirstLogin && to.path === "/onboarding") {
    return "/roadmaps"
  }

  return true
})


const isRecoverableRouteLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return (
    /fetch dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /load failed/i.test(message) ||
    /network\s?error/i.test(message)
  )
}

router.onError((error, to) => {
  // If a lazy chunk cannot be loaded (offline/CDN issue), route to a stable fallback page.
  if (!isRecoverableRouteLoadError(error)) return
  if (to.name === "service-unavailable") return

  router.replace({
    name: "service-unavailable",
    query: {
      from: to.fullPath
    }
  })
})

export default router
