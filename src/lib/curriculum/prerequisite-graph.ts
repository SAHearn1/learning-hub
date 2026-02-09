export interface TopicDependencyNode {
  id: string;
  name: string;
  prerequisites: Array<{
    id: string;
    name: string;
  }>;
}

export interface PrerequisiteSuggestion {
  topicName: string;
  reason: 'direct_prerequisite' | 'upstream_prerequisite' | 'domain_override';
  distance: number;
}

const DOMAIN_DEPENDENCY_OVERRIDES: Record<string, string[]> = {
  'quadratic equations': ['Factoring', 'Algebraic Operations'],
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toNodeMap(topics: TopicDependencyNode[]): Map<string, TopicDependencyNode> {
  return new Map(topics.map((topic) => [topic.id, topic]));
}

function findStartingTopic(topics: TopicDependencyNode[], failedTopicOrConcept: string): TopicDependencyNode | null {
  const normalizedTarget = normalize(failedTopicOrConcept);

  const exactMatch = topics.find((topic) => normalize(topic.name) === normalizedTarget);
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = topics.find((topic) => {
    const normalizedName = normalize(topic.name);
    return normalizedName.includes(normalizedTarget) || normalizedTarget.includes(normalizedName);
  });

  return partialMatch ?? null;
}

export function suggestPrerequisiteTopics(
  topics: TopicDependencyNode[],
  failedTopicOrConcept: string,
  maxSuggestions = 3,
): PrerequisiteSuggestion[] {
  if (!failedTopicOrConcept.trim()) {
    return [];
  }

  const startingTopic = findStartingTopic(topics, failedTopicOrConcept);

  if (!startingTopic) {
    const domainOverrides = DOMAIN_DEPENDENCY_OVERRIDES[normalize(failedTopicOrConcept)] ?? [];
    return domainOverrides.slice(0, maxSuggestions).map((topicName) => ({
      topicName,
      reason: 'domain_override',
      distance: 1,
    }));
  }

  const byId = toNodeMap(topics);
  const suggestions: PrerequisiteSuggestion[] = [];
  const visited = new Set<string>();
  const queue: Array<{ topicId: string; distance: number }> = [{ topicId: startingTopic.id, distance: 0 }];

  while (queue.length > 0 && suggestions.length < maxSuggestions) {
    const current = queue.shift();
    if (!current || visited.has(current.topicId)) {
      continue;
    }

    visited.add(current.topicId);
    const topic = byId.get(current.topicId);
    if (!topic) {
      continue;
    }

    for (const prerequisite of topic.prerequisites) {
      if (visited.has(prerequisite.id)) {
        continue;
      }

      suggestions.push({
        topicName: prerequisite.name,
        reason: current.distance === 0 ? 'direct_prerequisite' : 'upstream_prerequisite',
        distance: current.distance + 1,
      });

      queue.push({ topicId: prerequisite.id, distance: current.distance + 1 });

      if (suggestions.length >= maxSuggestions) {
        break;
      }
    }
  }

  if (suggestions.length > 0) {
    return suggestions;
  }

  const domainOverrides = DOMAIN_DEPENDENCY_OVERRIDES[normalize(failedTopicOrConcept)] ?? [];
  return domainOverrides.slice(0, maxSuggestions).map((topicName) => ({
    topicName,
    reason: 'domain_override',
    distance: 1,
  }));
}
