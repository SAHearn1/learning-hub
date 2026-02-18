import { describe, expect, it } from 'vitest';
import { suggestPrerequisiteTopics, type TopicDependencyNode } from '@/lib/curriculum/prerequisite-graph';

const topicGraph: TopicDependencyNode[] = [
  {
    id: 'algebraic-operations',
    name: 'Algebraic Operations',
    prerequisites: [],
  },
  {
    id: 'factoring',
    name: 'Factoring',
    prerequisites: [{ id: 'algebraic-operations', name: 'Algebraic Operations' }],
  },
  {
    id: 'quadratic-equations',
    name: 'Quadratic Equations',
    prerequisites: [{ id: 'factoring', name: 'Factoring' }],
  },
];

describe('prerequisite graph recommendations', () => {
  it('returns direct and upstream dependencies for a failed topic', () => {
    const recommendations = suggestPrerequisiteTopics(topicGraph, 'Quadratic Equations', 3);

    expect(recommendations).toEqual([
      {
        topicName: 'Factoring',
        reason: 'direct_prerequisite',
        distance: 1,
      },
      {
        topicName: 'Algebraic Operations',
        reason: 'upstream_prerequisite',
        distance: 2,
      },
    ]);
  });

  it('uses domain override when graph data is unavailable', () => {
    const recommendations = suggestPrerequisiteTopics([], 'Quadratic Equations', 3);

    expect(recommendations.map((entry) => entry.topicName)).toEqual([
      'Factoring',
      'Algebraic Operations',
    ]);
    expect(recommendations.every((entry) => entry.reason === 'domain_override')).toBe(true);
  });
});
