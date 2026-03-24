<script setup lang="ts">
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import type { RoadmapNode } from "@/shared/mocks/mockRoadmaps"
import { useTopicProgressStore } from "@/features/roadmaps/store/topicProgress"
import { useDailyTasksStore } from "@/features/daily-tasks/store/dailyTasks"

const props = withDefaults(defineProps<{
  node: RoadmapNode
  depth?: number
}>(), {
  depth: 0
})

const router = useRouter()
const topicProgress = useTopicProgressStore()
const dailyTasks = useDailyTasksStore()
const hasChildren = computed(() => Boolean(props.node.children?.length))
const expanded = ref(props.depth === 0)
const nodeTask = computed(() => {
  if (!props.node?.id || !dailyTasks) return null
  return dailyTasks.getTaskForNode(props.node.id)
})

const toggle = () => {
  if (hasChildren.value) {
    expanded.value = !expanded.value
  }
}

const openTopic = () => {
  if (props.node.status !== "locked" && !hasChildren.value) {
    router.push(`/topics/${props.node.id}`)
  }
}

const completeDailyTask = () => {
  if (!nodeTask.value) return
  router.push("/daily-tasks")
}

const getNodeStatusLabel = (node: RoadmapNode) => {
  if (node.status === "locked") return "Заблокировано"

  if (!node.children?.length) {
    const result = topicProgress.getResult(node.id)
    if (result) return result.passed ? "Пройдено" : "Не пройдено"
  }

  if (node.status === "completed") return "Пройдено"
  if (node.status === "in_progress") return "В процессе"
  if (node.status === "not_started") return "Не начато"

  return ""
}
async function startTopic(nodeId) {
  await roadmapsApi.startNode(nodeId)
}

const getNodeClass = (node: RoadmapNode) => ({
  locked: node.status === "locked",
  completed: node.status === "completed",
  in_progress: node.status === "in_progress"
})
</script>

<template>
  <div class="list-node" :class="`depth-${depth}`">
    <div class="list-row">
      <span v-if="depth > 0" class="list-connector" />

      <div
        class="list-item"
        :class="getNodeClass(node)"
        @click="hasChildren ? toggle() : openTopic()"
      >
        <span class="list-toggle" :class="{ 'list-toggle--leaf': !hasChildren }">
          <template v-if="hasChildren">
            {{ expanded ? "▾" : "▸" }}
          </template>
          <template v-else>
            <span class="list-dot" />
          </template>
        </span>

        <span class="list-name">{{ node.title }}</span>

        <span
          v-if="getNodeStatusLabel(node)"
          class="list-status"
          :class="{
            'list-status--completed': node.status === 'completed',
            'list-status--progress': node.status === 'in_progress',
            'list-status--locked': node.status === 'locked',
          }"
        >
          {{ getNodeStatusLabel(node) }}
        </span>

        <button
          v-if="nodeTask"
          type="button"
          class="daily-task-chip"
          :class="{ 'daily-task-chip--done': nodeTask.completed }"
          :disabled="nodeTask.completed"
          @click.stop="completeDailyTask"
        >
          <span class="daily-task-chip__points">+{{ nodeTask.points }}</span>
          <span>{{ nodeTask.completed ? "Тест выполнен" : "Тест дня" }}</span>
        </button>
      </div>
    </div>

    <div v-if="expanded && hasChildren" class="list-children">
      <RoadmapListNode
        v-for="child in node.children"
        :key="child.id || Math.random()" 
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── Node wrapper ── */
.list-node {
  margin-top: 6px;
  font-family: 'Inter', sans-serif;
}

/* ── Row ── */
.list-row {
  display: flex;
  align-items: center;
}

/* ── Connector line ── */
.list-connector {
  flex-shrink: 0;
  width: 20px;
  height: 1px;
  background: var(--border);
  margin-right: 6px;
}

/* ── Item ── */
.list-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  user-select: none;
}

.list-item:hover {
  border-color: var(--border);
  background: var(--surface-soft);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.06);
}

/* locked */
.list-item.locked {
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}

/* ── Toggle icon ── */
.list-toggle {
  flex-shrink: 0;
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--muted);
  line-height: 1;
}

.list-toggle--leaf {
  /* keep alignment consistent */
}

.list-dot {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 100px;
  background: var(--border);
}

/* ── Name ── */
.list-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  line-height: 1.4;
}

/* ── Status badge ── */
.list-status {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 100px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--muted);
  white-space: nowrap;
}

.list-status--completed {
  background: var(--primary);
  color: #fff;
  border-color: var(--text);
}

.list-status--progress {
  background: var(--surface-soft);
  color: var(--muted);
  border-color: var(--border);
}

.list-status--locked {
  background: var(--surface-soft);
  color: var(--muted);
  border-color: var(--border);
}

.daily-task-chip {
  flex-shrink: 0;
  border: 1px solid var(--primary) !important;
  background: var(--primary) !important;
  color: var(--button-text) !important;
  border-radius: 100px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.daily-task-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.14);
}

.daily-task-chip__points {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 100px;
  padding: 2px 6px;
  line-height: 1;
}

.daily-task-chip--done {
  border-color: rgba(33, 150, 83, 0.35) !important;
  background: rgba(33, 150, 83, 0.18) !important;
  color: #1f8f51 !important;
  cursor: default;
}

/* ── Children ── */
.list-children {
  margin-left: 26px;
  border-left: 1px solid var(--border);
  padding-left: 0;
}

/* ── Depth tinting ── */
.depth-1 .list-item {
  background: var(--surface-soft);
}

.depth-2 .list-item {
  background: var(--surface-soft);
}

/* ── Adaptive ── */
@media (max-width: 640px) {
  .list-name {
    font-size: 13px;
  }

  .list-status {
    font-size: 10px;
    padding: 2px 8px;
    letter-spacing: 0.03em;
  }

  .list-item {
    padding: 9px 12px;
    gap: 8px;
  }

  .list-children {
    margin-left: 16px;
  }

  .list-connector {
    width: 14px;
  }
}
</style>
