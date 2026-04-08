import type { RoadmapNode, TopicStatus } from "@/shared/mocks/mockRoadmaps"
import type { TopicResult } from "@/features/roadmaps/store/topicProgress"

const resolveParentStatus = (children: RoadmapNode[]): TopicStatus => {
  if (children.every((child) => child.status === "completed")) {
    return "completed"
  }

  if (children.some((child) => child.status === "completed" || child.status === "in_progress")) {
    return "in_progress"
  }

  return "not_started"
}

const mapListWithProgress = (
  nodes: RoadmapNode[],
  isParentUnlocked: boolean,
  getResult: (topicId: string) => TopicResult | null
): RoadmapNode[] => {
  let previousNodeCompleted = true

  return nodes.map((node) => {
    const isUnlocked = isParentUnlocked && previousNodeCompleted

    if (node.children?.length) {
      const children = mapListWithProgress(node.children, isUnlocked, getResult)

      const status: TopicStatus = isUnlocked ? resolveParentStatus(children) : "locked"
      previousNodeCompleted = status === "completed"

      return {
        ...node,
        status,
        children
      }
    }

    let status: TopicStatus = "locked"

    if (isUnlocked) {
      const result = getResult(node.id)

      if (!result) {
        status = node.status === "locked" ? "not_started" : node.status
      } else {
        status = result.passed ? "completed" : "in_progress"
      }
    }

    previousNodeCompleted = status === "completed"

    return {
      ...node,
      status
    }
  })
}

export const mapRoadmapTreeWithProgress = (nodes: any[], isParentUnlocked = true) => {
  if (!nodes || !Array.isArray(nodes)) return [];

  // Бірінші тақырып әрдайым ашық болуы үшін бастапқы мәнді true жасаймыз
  let isPreviousCompleted = true; 

  return nodes.map((node) => {
    let currentStatus = node.status || 'locked';

    // ЕГЕР ата-анасы ашық болса ЖӘНЕ алдыңғы тақырып біткен болса, БІРАҚ бұл тақырып 'locked' болып тұрса:
    if (isParentUnlocked && isPreviousCompleted && currentStatus === 'locked') {
      currentStatus = 'not_started';
    }

    // Келесі тақырыпты ашу үшін осының статусын тексереміз
    isPreviousCompleted = currentStatus === 'completed';

    const isLocked = currentStatus === 'locked';

    return {
      ...node,
      status: currentStatus,
      locked: isLocked,
      // Ішкі тақырыптарды (children) өңдегенде, осы ата-ананың құлыпталмағанын (isLocked емес екенін) береміз
      children: node.children && node.children.length > 0 
        ? mapRoadmapTreeWithProgress(node.children, !isLocked) 
        : []
    };
  });
};