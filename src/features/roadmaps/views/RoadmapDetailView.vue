<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue"
import { useRoute } from "vue-router"
import { roadmapsApi } from "@/features/roadmaps/api/roadmaps.api"

import { useTopicProgressStore } from "@/features/roadmaps/store/topicProgress"
import { mapRoadmapTreeWithProgress } from "@/features/roadmaps/utils/roadmapProgress"
import RoadmapTree from "@/features/roadmaps/components/RoadmapTree.vue"
import RoadmapListNode from "@/features/roadmaps/components/RoadmapListNode.vue"

type RoadmapViewMode = "skill_tree" | "classic_list"
const VIEW_MODE_KEY = "roadmap_view_mode"

const roadmapTreeData = ref<any[]>([])
const route = useRoute()
const topicProgress = useTopicProgressStore()
const roadmapId = route.params.id as string

const roadmap = computed(() => ({
  id: roadmapId,
  title: roadmapId.toUpperCase(),
  description: ""
}))



onMounted(async () => {
  const [tree, progress] = await Promise.all([
    roadmapsApi.getRoadmapTree(),
    roadmapsApi.getRoadmapProgress()
  ])

  roadmapTreeData.value = tree[roadmapId] ?? []

  topicProgress.setProgress(progress)
})
const tree = computed(() => roadmapTreeData.value)

const collectLeafNodes = (nodes: typeof tree.value): typeof tree.value => {
  return nodes.flatMap((node) => {
    if (node.children?.length) {
      return collectLeafNodes(node.children)
    }

    return [node]
  })
}

const listProgress = computed(() => {
  const leaves = collectLeafNodes(tree.value)
  const total = leaves.length
  const completed = leaves.filter((node) => node.status === "completed").length
  const inProgress = leaves.filter((node) => node.status === "in_progress").length
  const percent = total ? Math.round((completed / total) * 100) : 0

  return {
    total,
    completed,
    inProgress,
    percent
  }
})

const getStoredMode = (): RoadmapViewMode => {
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  return stored === "classic_list" ? "classic_list" : "skill_tree"
}

const viewMode = ref<RoadmapViewMode>(getStoredMode())

watch(viewMode, (value) => {
  localStorage.setItem(VIEW_MODE_KEY, value)
})
</script>

<template>
  <div class="page roadmap-page">
    <div v-if="!tree.length" class="empty-state">
    
      <h2>Roadmap не найден</h2>
    </div>

    <div v-else>
      <div class="roadmap-header">
        <h1 class="roadmap-title">{{ roadmap.title }}</h1>
        <p class="roadmap-description">{{ roadmap.description }}</p>
      </div>

      <div class="section-label">Режим отображения</div>
      <div class="view-switcher" role="tablist" aria-label="Режим отображения roadmap">
        <button
          type="button"
          class="btn"
          :class="viewMode === 'skill_tree' ? 'btn--primary' : 'btn--ghost'"
          @click="viewMode = 'skill_tree'"
        >
          Дерево навыков
        </button>
        <button
          type="button"
          class="btn"
          :class="viewMode === 'classic_list' ? 'btn--primary' : 'btn--ghost'"
          @click="viewMode = 'classic_list'"
        >
          Классический список
        </button>
      </div>

      <div v-if="tree.length">
        <RoadmapTree v-if="viewMode === 'skill_tree'" :nodes="tree" />
        <div v-else class="legacy-list-wrap">
          <div class="classic-progress">
            <div class="classic-progress-head">
              <span class="section-label">Прогресс</span>
              <span class="progress-badge">{{ listProgress.percent }}%</span>
            </div>
            <div class="classic-progress-track">
              <span class="classic-progress-fill" :style="{ width: `${listProgress.percent}%` }" />
            </div>
            <p class="classic-progress-meta">
              <span class="badge">{{ listProgress.completed }}/{{ listProgress.total }} завершено</span>
              <span class="badge">{{ listProgress.inProgress }} в процессе</span>
            </p>
          </div>

          <RoadmapListNode v-for="node in tree" :key="node.id" :node="node" />
        </div>
      </div>

      <div v-else class="empty-state">
        Тем пока нет.
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── Base ── */
.roadmap-page {
  max-width: 1280px;
  font-family: 'Inter', sans-serif;
  color: var(--text);
}

/* ── Header ── */
.roadmap-header {
  margin: 24px 0 20px;
}

.roadmap-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0 0 8px;
  line-height: 1.2;
}

.roadmap-description {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}

/* ── Section label ── */
.section-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--text);
}

.btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.18);
}

.btn--ghost {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.btn--ghost:hover {
  background: var(--surface-soft);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.07);
}

/* ── View Switcher ── */
.view-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

/* ── Classic list wrap ── */
.legacy-list-wrap {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 16px;
}

/* ── Classic Progress ── */
.classic-progress {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 14px 16px;
  margin-bottom: 16px;
}

.classic-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-badge {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 2px 10px;
}

.classic-progress-track {
  width: 100%;
  height: 6px;
  border-radius: 100px;
  background: var(--border);
  overflow: hidden;
}

.classic-progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.4s ease;
}

.classic-progress-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 10px 0 0;
}

/* ── Badge / pill ── */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 3px 10px;
}

/* ── Empty State ── */
.empty-state {
  padding: 40px 0;
  color: var(--muted);
  font-size: 15px;
}

/* ── Adaptive ── */
@media (max-width: 640px) {
  .roadmap-title {
    font-size: 22px;
  }

  .roadmap-description {
    font-size: 14px;
  }

  .view-switcher {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .legacy-list-wrap {
    padding: 12px;
    border-radius: 12px;
  }

  .classic-progress {
    padding: 12px;
  }
}
</style>
