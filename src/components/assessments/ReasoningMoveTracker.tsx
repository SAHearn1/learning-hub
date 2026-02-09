'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ReasoningMove } from '@prisma/client';

interface ReasoningMoveTrackerProps {
  studentId: string;
  showSuggestions?: boolean;
}

interface MoveProgress {
  move: ReasoningMove;
  usageCount: number;
  promptedUsage: number;
  spontaneousUsage: number;
  proficiencyLevel: number;
  introducedAt: string;
}

interface Profile {
  movesByLevel: {
    mastered: MoveProgress[];
    proficient: MoveProgress[];
    developing: MoveProgress[];
    practicing: MoveProgress[];
    introduced: MoveProgress[];
  };
  statistics: {
    totalMovesIntroduced: number;
    totalUsage: number;
    spontaneousRate: number;
    averageProficiency: number;
  };
}

const PROFICIENCY_COLORS: Record<number, string> = {
  1: 'bg-gray-200 text-gray-700',
  2: 'bg-blue-200 text-blue-700',
  3: 'bg-yellow-200 text-yellow-700',
  4: 'bg-green-200 text-green-700',
  5: 'bg-purple-200 text-purple-700',
};

const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Introduced',
  2: 'Practicing',
  3: 'Developing',
  4: 'Proficient',
  5: 'Mastered',
};

const MOVE_DESCRIPTIONS: Record<string, string> = {
  DECOMPOSE: 'Break into parts',
  IDENTIFY: 'Recognize elements',
  COMPARE: 'Find differences',
  CLASSIFY: 'Group by category',
  SEQUENCE: 'Order logically',
  CAUSE_EFFECT: 'Link causes',
  QUESTION: 'Ask questions',
  CHALLENGE: 'Question assumptions',
  VERIFY: 'Check accuracy',
  JUSTIFY: 'Explain reasoning',
  CRITIQUE: 'Evaluate arguments',
  WEIGH: 'Consider trade-offs',
  HYPOTHESIZE: 'Make predictions',
  CONNECT: 'Link knowledge',
  GENERALIZE: 'Extend patterns',
  SPECIALIZE: 'Apply specifically',
  TRANSFORM: 'Change forms',
  CREATE: 'Generate ideas',
  MONITOR: 'Track understanding',
  ADJUST: 'Modify approach',
  REFLECT: 'Think about thinking',
  PLAN: 'Strategize approach',
};

export function ReasoningMoveTracker({ studentId, showSuggestions = true }: ReasoningMoveTrackerProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/assessments/reasoning-moves?studentId=${studentId}&includeSuggestions=${showSuggestions}`
      );

      if (!response.ok) {
        throw new Error('Failed to load reasoning profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error loading reasoning profile:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId, showSuggestions]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading reasoning profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-muted-foreground">No reasoning moves tracked yet</p>
        </CardContent>
      </Card>
    );
  }

  const allMoves = [
    ...profile.movesByLevel.mastered,
    ...profile.movesByLevel.proficient,
    ...profile.movesByLevel.developing,
    ...profile.movesByLevel.practicing,
    ...profile.movesByLevel.introduced,
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Reasoning Moves Progress</CardTitle>
          <CardDescription>
            Track your development across 22 thinking strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.statistics.totalMovesIntroduced}
              </div>
              <div className="text-sm text-muted-foreground">Moves Introduced</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.statistics.totalUsage}
              </div>
              <div className="text-sm text-muted-foreground">Total Uses</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.statistics.spontaneousRate}%
              </div>
              <div className="text-sm text-muted-foreground">Spontaneous</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.statistics.averageProficiency.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Card */}
      {showSuggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Learn</CardTitle>
            <CardDescription>
              New reasoning moves suggested for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <span className="text-2xl">→</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {MOVE_DESCRIPTIONS[suggestion.move] || suggestion.move}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {suggestion.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Moves by Level */}
      {Object.entries(profile.movesByLevel).map(([level, moves]) => {
        if (moves.length === 0) return null;

        const levelName = level.charAt(0).toUpperCase() + level.slice(1);
        const levelNumber = moves[0]?.proficiencyLevel || 1;

        return (
          <Card key={level}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{levelName}</CardTitle>
                <Badge className={PROFICIENCY_COLORS[levelNumber]}>
                  {PROFICIENCY_LABELS[levelNumber]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {moves.map((move) => {
                  const spontaneousRate =
                    move.usageCount > 0
                      ? (move.spontaneousUsage / move.usageCount) * 100
                      : 0;

                  return (
                    <div key={move.move} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {MOVE_DESCRIPTIONS[move.move] || move.move}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Used {move.usageCount}x
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>Spontaneous</span>
                          <span>{spontaneousRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={spontaneousRate} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
