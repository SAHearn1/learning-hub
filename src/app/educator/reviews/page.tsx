import { HumanInTheLoopDashboard } from '@/components/educator/HumanInTheLoopDashboard';

export default function ReviewsPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="mb-6 text-3xl font-bold">AI Suggestion Reviews</h1>
      <p className="mb-8 text-muted-foreground">
        Review and approve AI-generated suggestions before they become part of student records.
        All suggestions require educator approval to ensure accuracy and appropriateness.
      </p>
      <HumanInTheLoopDashboard />
    </div>
  );
}
