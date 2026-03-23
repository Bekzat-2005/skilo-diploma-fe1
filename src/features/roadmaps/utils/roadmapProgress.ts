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

// features/roadmaps/utils/roadmapProgress.ts

export const mapRoadmapTreeWithProgress = (nodes: any[], backendProgress: any[]) => {
  // Алдыңғы тақырыптың біткен-бітпегенін бақылайтын флаг.
  // Ең бірінші тақырып әрқашан ашық болуы үшін true-дан бастаймыз.
  let isPathBlocked = false; 

  const getTopicStatus = (nodeId: string) => {
    // 1. Бэкенд прогресін тексеру
    const bProgress = backendProgress.find((p: any) => p.nodeId === nodeId);
    if (bProgress?.status === 'completed') return 'completed';

    // 2. LocalStorage (жаңа ғана тапсырылған тест) тексеру
    const raw = localStorage.getItem("topic_test_results");
    if (raw) {
      const localResults = JSON.parse(raw);
      if (localResults[nodeId]?.passed) return 'completed';
    }

    return 'not_started';
  };

  const transform = (list: any[]): any[] => {
    return list.map((node) => {
      const currentStatus = getTopicStatus(node.id);
      
      // Егер жол бұғатталған болса, бұл түйін құлыптаулы (locked)
      const locked = isPathBlocked;

      // Егер бұл жапырақ (нақты сабақ) болса және ол бітпеген болса, 
      // келесі келетін барлық тақырыптарды бұғаттаймыз
      const isLesson = !node.children || node.children.length === 0;
      if (isLesson && currentStatus !== 'completed') {
        isPathBlocked = true;
      }

      // Ішкі элементтері болса, оларды да өңдейміз (Рекурсия)
      let children = [];
      if (node.children && node.children.length > 0) {
        children = transform(node.children);
      }

      return {
        ...node,
        status: locked ? 'locked' : currentStatus,
        locked: locked,
        children: children
      };
    });
  };

  return transform(nodes);
};
