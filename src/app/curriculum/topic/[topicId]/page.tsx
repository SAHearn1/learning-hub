import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { SubjectBadge } from '@/components/curriculum/subject-badge';
import { StandardBadge } from '@/components/curriculum/standard-badge';
import { MasteryIndicator } from '@/components/curriculum/mastery-indicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, BookOpen, Target, AlertCircle, Lightbulb, ArrowLeft } from 'lucide-react';

async function getTopicData(topicId: string) {
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: {
      standards: true,
      learningObjectives: true,
      problems: true,
      prerequisites: {
        select: {
          id: true,
          name: true,
          subject: true,
        },
      },
    },
  });

  if (!topic) return null;

  // Try to get user progress if logged in
  const { userId: clerkId } = auth();
  let userProgress = null;

  if (clerkId) {
    const user = await db.user.findUnique({
      where: { clerkUserId: clerkId },
      include: { student: true },
    });

    if (user?.student) {
      // Get progress for standards related to this topic
      const progressEntries = await db.progress.findMany({
        where: {
          studentId: user.student.id,
          standardId: {
            in: topic.standards.map((s) => s.id),
          },
        },
      });

      if (progressEntries.length > 0) {
        const avgMastery =
          progressEntries.reduce((sum, p) => sum + p.masteryLevel, 0) / progressEntries.length;
        const totalAssessments = progressEntries.reduce((sum, p) => sum + p.assessmentCount, 0);
        const lastAssessed = progressEntries.reduce((latest, p) => {
          if (!p.lastAssessedAt) return latest;
          if (!latest) return p.lastAssessedAt;
          return p.lastAssessedAt > latest ? p.lastAssessedAt : latest;
        }, null as Date | null);

        userProgress = {
          masteryLevel: avgMastery,
          assessmentCount: totalAssessments,
          lastAssessedAt: lastAssessed,
        };
      }
    }
  }

  return { topic, userProgress };
}

interface PageProps {
  params: Promise<{ topicId: string }>;
}

export default async function TopicDetailPage({ params }: PageProps) {
  const { topicId } = await params;
  const data = await getTopicData(topicId);

  if (!data) {
    notFound();
  }

  const { topic, userProgress } = data;

  const gradeLevelText =
    topic.gradeLevel.length === 1
      ? `Grade ${topic.gradeLevel[0]}`
      : `Grades ${Math.min(...topic.gradeLevel)}-${Math.max(...topic.gradeLevel)}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Back Button */}
      <Link
        href="/curriculum"
        className="mb-6 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Curriculum
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SubjectBadge subject={topic.subject} />
          <Badge variant="outline">{gradeLevelText}</Badge>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <Clock className="h-4 w-4" />
            <span>{topic.estimatedDuration} min</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-neutral-900">{topic.name}</h1>
        <p className="mt-3 text-lg text-neutral-600">{topic.description}</p>
      </div>

      {/* User Progress Panel */}
      {userProgress && (
        <Card className="mb-8 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle className="text-lg">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <MasteryIndicator masteryLevel={userProgress.masteryLevel} size="lg" />
            <div className="mt-4 flex gap-6 text-sm text-neutral-600">
              <div>
                <span className="font-semibold">{userProgress.assessmentCount}</span> assessments
                completed
              </div>
              {userProgress.lastAssessedAt && (
                <div>
                  Last activity:{' '}
                  <span className="font-semibold">
                    {new Date(userProgress.lastAssessedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={`/learn?topic=${topic.id}`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Start Learning
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/assessments/diagnostic?topic=${topic.id}`}>
            <Target className="mr-2 h-4 w-4" />
            Take Diagnostic
          </Link>
        </Button>
        {userProgress && (
          <Button asChild variant="outline" size="lg">
            <Link href="/progress">View My Progress</Link>
          </Button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Standards */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Standards</CardTitle>
            </CardHeader>
            <CardContent>
              {topic.standards.length === 0 ? (
                <p className="text-sm text-neutral-500">No standards linked yet.</p>
              ) : (
                <div className="space-y-3">
                  {topic.standards.map((standard) => (
                    <div key={standard.id} className="rounded-lg border border-neutral-200 p-3">
                      <StandardBadge
                        code={standard.code}
                        framework={standard.framework}
                        subject={standard.subject}
                        description={standard.description}
                      />
                      <p className="mt-2 text-sm text-neutral-600">{standard.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Objectives</CardTitle>
            </CardHeader>
            <CardContent>
              {topic.learningObjectives.length === 0 ? (
                <p className="text-sm text-neutral-500">No objectives defined yet.</p>
              ) : (
                <div className="space-y-3">
                  {topic.learningObjectives.map((objective) => (
                    <div key={objective.id} className="flex gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div className="h-5 w-5 rounded-full border-2 border-neutral-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-neutral-700">{objective.description}</p>
                        <Badge variant="outline" className="mt-1">
                          {objective.bloomsLevel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prerequisites */}
          {topic.prerequisites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topic.prerequisites.map((prereq) => (
                    <Link
                      key={prereq.id}
                      href={`/curriculum/topic/${prereq.id}`}
                      className="block rounded-lg border border-neutral-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
                    >
                      <div className="flex items-center gap-2">
                        <SubjectBadge subject={prereq.subject} />
                        <span className="text-sm font-medium text-neutral-900">{prereq.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Conceptual Understanding */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Lightbulb className="mr-2 inline h-5 w-5" />
                Key Concepts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-700">{topic.conceptualUnderstanding}</p>
            </CardContent>
          </Card>

          {/* Common Misconceptions */}
          {topic.commonMisconceptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <AlertCircle className="mr-2 inline h-5 w-5" />
                  Common Misconceptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {topic.commonMisconceptions.map((misconception, i) => (
                    <li key={i} className="flex gap-2 text-sm text-neutral-700">
                      <span className="text-secondary-600">•</span>
                      <span>{misconception}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Real-World Connections */}
          {topic.realWorldConnections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Real-World Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {topic.realWorldConnections.map((connection, i) => (
                    <li key={i} className="flex gap-2 text-sm text-neutral-700">
                      <span className="text-primary-600">•</span>
                      <span>{connection}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Practice Problems */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Problems ({topic.problems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {topic.problems.length === 0 ? (
                <p className="text-sm text-neutral-500">No practice problems available yet.</p>
              ) : (
                <div className="space-y-3">
                  {topic.problems.map((problem, index) => (
                    <Link
                      key={problem.id}
                      href={`/curriculum/problem/${problem.id}`}
                      className="block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900">
                          Problem {index + 1}
                        </span>
                        <div className="flex gap-2">
                          <Badge variant="outline">{problem.type}</Badge>
                          <Badge variant="outline">
                            Difficulty {problem.difficulty}/5
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 line-clamp-2">{problem.stem}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
