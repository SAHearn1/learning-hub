import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssessmentHistory } from '@/components/assessments/AssessmentHistory';
import { ReasoningMoveTracker } from '@/components/assessments/ReasoningMoveTracker';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    studentId: string;
  }>;
}

export default async function StudentAssessmentsPage({ params }: PageProps) {
  const { studentId } = await params;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Student Assessment Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive view of assessment results and thinking development
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning Moves</TabsTrigger>
          <TabsTrigger value="new">New Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnostic</CardTitle>
                <CardDescription>Placement & gap analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-2">3</div>
                <p className="text-sm text-muted-foreground mb-4">Completed</p>
                <Link href={`/assessments/diagnostic?studentId=${studentId}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Start New
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formative</CardTitle>
                <CardDescription>In-session checks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-2">12</div>
                <p className="text-sm text-muted-foreground mb-4">Completed</p>
                <p className="text-xs text-muted-foreground">Integrated in tutoring sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summative</CardTitle>
                <CardDescription>Mastery evaluations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-2">5</div>
                <p className="text-sm text-muted-foreground mb-4">Completed</p>
                <Button variant="outline" size="sm" className="w-full">
                  Start New
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>Latest assessment activity</CardDescription>
            </CardHeader>
            <CardContent>
              <AssessmentHistory studentId={studentId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <AssessmentHistory studentId={studentId} />
        </TabsContent>

        <TabsContent value="reasoning">
          <ReasoningMoveTracker studentId={studentId} showSuggestions={true} />
        </TabsContent>

        <TabsContent value="new" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>🎯 Diagnostic Assessment</CardTitle>
                <CardDescription>
                  Find knowledge gaps and get personalized recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/assessments/diagnostic?studentId=${studentId}`}>
                  <Button className="w-full">Start Diagnostic</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>📝 Summative Assessment</CardTitle>
                <CardDescription>
                  Test your mastery of a topic with comprehensive evaluation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Start Summative
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>💭 Thinking Assessment</CardTitle>
                <CardDescription>
                  Evaluate your reasoning quality and creative thinking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Start Thinking Assessment
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>🎮 Practice Session</CardTitle>
                <CardDescription>
                  Practice problems to strengthen your understanding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Start Practice
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
