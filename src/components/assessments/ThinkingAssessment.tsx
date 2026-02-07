'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { EngagementMode, ReasoningMove } from '@prisma/client';

interface ThinkingAssessmentProps {
  sessionId: string;
  problemContext: string;
  mode?: EngagementMode;
  targetReasoningMoves?: ReasoningMove[];
  onComplete?: (result: any) => void;
}

const MODE_DESCRIPTIONS: Record<EngagementMode, string> = {
  FORWARD: 'Solve the problem step by step, explaining your thinking',
  REVERSE: 'Start with the answer and explain why it makes sense',
  ERROR_ANALYSIS: 'Find and explain the error in this solution',
  MULTIPLE_PATHWAYS: 'Show at least two different ways to solve this',
  PROBLEM_POSING: 'Create your own similar problem and solve it',
};

const MODE_ICONS: Record<EngagementMode, string> = {
  FORWARD: '→',
  REVERSE: '←',
  ERROR_ANALYSIS: 'X',
  MULTIPLE_PATHWAYS: 'M',
  PROBLEM_POSING: '+',
};

export function ThinkingAssessment({
  sessionId,
  problemContext,
  mode = 'FORWARD',
  targetReasoningMoves = [],
  onComplete,
}: ThinkingAssessmentProps) {
  const [selectedMode, setSelectedMode] = useState<EngagementMode>(mode);
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const generatePrompt = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assessments/thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          problemContext,
          engagementMode: selectedMode,
          targetReasoningMoves,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate prompt');
      }

      const data = await res.json();
      setPrompt(data.prompt);
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!response.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/assessments/thinking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentResponse: response,
          problemContext,
          engagementMode: selectedMode,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to evaluate thinking');
      }

      const data = await res.json();
      setEvaluation(data.evaluation);

      if (onComplete) {
        onComplete(data);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResponse('');
    setEvaluation(null);
    setPrompt('');
  };

  if (!prompt && !loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thinking Quality Assessment</CardTitle>
            <CardDescription>
              Show your reasoning and problem-solving process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Select Engagement Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.keys(MODE_DESCRIPTIONS) as EngagementMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMode(m)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedMode === m
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{MODE_ICONS[m]}</span>
                      <span className="font-semibold">{m.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {MODE_DESCRIPTIONS[m]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Problem Context:</h4>
              <p className="text-sm whitespace-pre-wrap">{problemContext}</p>
            </div>

            {targetReasoningMoves.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">🎯 Focus on these thinking moves:</h4>
                <div className="flex flex-wrap gap-2">
                  {targetReasoningMoves.map((move) => (
                    <Badge key={move} variant="secondary">
                      {move.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardContent>
            <Button onClick={generatePrompt} size="lg">
              Start Thinking Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Preparing your thinking challenge...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (evaluation) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thinking Quality Evaluation</CardTitle>
            <CardDescription>
              Analysis of your reasoning and creativity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Thinking Quality Scores */}
            <div>
              <h3 className="font-semibold mb-3">Thinking Quality (1-5 scale)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(evaluation.thinkingQuality).map(([key, value]: [string, any]) => (
                  <div key={key} className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-2xl font-bold text-primary">{value}/5</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creativity Scores */}
            <div>
              <h3 className="font-semibold mb-3">Creativity (1-5 scale)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(evaluation.creativity).map(([key, value]: [string, any]) => (
                  <div key={key} className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{value}/5</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reasoning Moves Used */}
            {evaluation.reasoningMovesUsed.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">🎯 Reasoning Moves Detected</h3>
                <div className="flex flex-wrap gap-2">
                  {evaluation.reasoningMovesUsed.map((move: string) => (
                    <Badge key={move} variant="default">
                      {move.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">💡 Detailed Analysis</h4>
              <p className="text-sm whitespace-pre-wrap">{evaluation.aiAnalysis}</p>
            </div>

            {/* Strengths */}
            {evaluation.strengths.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">✨ Strengths</h4>
                <ul className="space-y-1">
                  {evaluation.strengths.map((strength: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Growth */}
            {evaluation.areasForGrowth.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">🌱 Areas for Growth</h4>
                <ul className="space-y-1">
                  {evaluation.areasForGrowth.map((area: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-yellow-600">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardContent>
            <Button onClick={handleReset} variant="outline">
              Try Another Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {MODE_ICONS[selectedMode]} {selectedMode.replace(/_/g, ' ')}
          </CardTitle>
          <Badge>{selectedMode}</Badge>
        </div>
        <CardDescription>{MODE_DESCRIPTIONS[selectedMode]}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Your Task:</h4>
          <p className="text-sm whitespace-pre-wrap">{prompt}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Problem:</h4>
          <p className="text-sm whitespace-pre-wrap">{problemContext}</p>
        </div>

        <div className="space-y-2">
          <label className="font-semibold">Your Response:</label>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Explain your thinking in detail. Show your reasoning process, question assumptions, and explore different approaches..."
            rows={12}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Aim for a thorough response that shows your complete thinking process
          </p>
        </div>
      </CardContent>

      <CardContent>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={!response.trim() || submitting} size="lg">
            {submitting ? 'Evaluating...' : 'Submit Response'}
          </Button>
          <Button onClick={handleReset} variant="outline">
            Start Over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
