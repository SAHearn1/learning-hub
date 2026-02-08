'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useRegulationStore } from '@/stores/regulation-store';

type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale';
type Tool = 'breathing' | 'grounding' | 'reframe' | 'body-scan' | null;

const GROUNDING_STEPS = [
  { count: 5, sense: 'see', prompt: 'Name 5 things you can see right now.' },
  { count: 4, sense: 'touch', prompt: 'Name 4 things you can feel or touch.' },
  { count: 3, sense: 'hear', prompt: 'Name 3 things you can hear.' },
  { count: 2, sense: 'smell', prompt: 'Name 2 things you can smell.' },
  { count: 1, sense: 'taste', prompt: 'Name 1 thing you can taste.' },
];

const REFRAME_PROMPTS = [
  { stuck: 'I can\'t do this.', reframe: 'I can\'t do this yet. I\'m still learning.' },
  { stuck: 'This is too hard.', reframe: 'This is challenging, and that means my brain is growing.' },
  { stuck: 'I keep making mistakes.', reframe: 'Mistakes show me where to focus next.' },
  { stuck: 'I\'m not smart enough.', reframe: 'Being smart isn\'t fixed; every problem I try makes me stronger.' },
  { stuck: 'Everyone else gets it.', reframe: 'Everyone learns at their own pace. Mine is just right for me.' },
  { stuck: 'Why do I even try?', reframe: 'Trying is the only way to grow. I\'m brave for showing up.' },
];

const BODY_SCAN_STEPS = [
  'Close your eyes or soften your gaze. Take a slow breath.',
  'Notice your feet on the floor. Are they warm? Cool? Tingling?',
  'Move up to your legs. Let any tension melt away.',
  'Feel your belly rise and fall with each breath.',
  'Relax your shoulders. Let them drop away from your ears.',
  'Unclench your jaw. Let your face soften.',
  'Take one more deep breath. You are safe and grounded.',
];

export default function RegulatePage() {
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const regulationLevel = useRegulationStore((s) => s.level);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--phase-regulate-color)]">Calm Corner</h1>
        <p className="mt-2 text-neutral-600">
          Tools and exercises to help you feel grounded and ready to learn.
          Use these any time you need a moment.
        </p>

        {/* Regulation status */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-neutral-500">How you&apos;re doing:</span>
          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-neutral-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                regulationLevel > 60
                  ? 'bg-primary-500'
                  : regulationLevel > 40
                    ? 'bg-secondary-500'
                    : 'bg-error-500'
              }`}
              style={{ width: `${regulationLevel}%` }}
            />
          </div>
          <span className="text-xs text-neutral-400">{regulationLevel}%</span>
        </div>
      </div>

      {!activeTool ? (
        <ToolPicker onSelect={setActiveTool} />
      ) : (
        <div>
          <button
            onClick={() => setActiveTool(null)}
            className="mb-6 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to tools
          </button>

          {activeTool === 'breathing' && <BreathingExercise onDone={() => setActiveTool(null)} />}
          {activeTool === 'grounding' && <GroundingExercise onDone={() => setActiveTool(null)} />}
          {activeTool === 'reframe' && <ReframeExercise onDone={() => setActiveTool(null)} />}
          {activeTool === 'body-scan' && <BodyScanExercise onDone={() => setActiveTool(null)} />}
        </div>
      )}
    </main>
  );
}

function ToolPicker({ onSelect }: { onSelect: (tool: Tool) => void }) {
  const tools: { id: Tool; name: string; description: string; icon: React.ReactNode }[] = [
    {
      id: 'breathing',
      name: 'Breathing Exercise',
      description: 'Three calm breaths: inhale 4 seconds, hold 4, exhale 4.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      id: 'grounding',
      name: '5-4-3-2-1 Grounding',
      description: 'Use your senses to bring yourself back to the present moment.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'reframe',
      name: 'Positive Reframe',
      description: 'Turn stuck thinking into growth thinking with guided reframes.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      ),
    },
    {
      id: 'body-scan',
      name: 'Body Scan',
      description: 'A guided check-in from your feet to your head to release tension.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelect(tool.id)}
          className="flex items-start gap-4 rounded-xl border-2 border-neutral-200 bg-white p-5 text-left transition-all hover:border-[var(--phase-regulate-border)] hover:shadow-md"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--phase-regulate-bg)] text-[var(--phase-regulate-color)]">
            {tool.icon}
          </div>
          <div>
            <div className="font-semibold text-neutral-800">{tool.name}</div>
            <p className="mt-1 text-sm text-neutral-600">{tool.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function BreathingExercise({ onDone }: { onDone: () => void }) {
  const [breathingPhase, setBreathingPhase] = useState<BreathingPhase>('idle');
  const [breathCount, setBreathCount] = useState(0);
  const [active, setActive] = useState(false);
  const setRegulationLevel = useRegulationStore((s) => s.setLevel);
  const regulationLevel = useRegulationStore((s) => s.level);

  const startBreathing = useCallback(() => {
    setActive(true);
    setBreathCount(0);
    runCycle(0);
  }, []);

  function runCycle(count: number) {
    if (count >= 3) {
      setActive(false);
      setBreathingPhase('idle');
      setBreathCount(3);
      setRegulationLevel(Math.min(100, regulationLevel + 15));
      return;
    }
    setBreathingPhase('inhale');
    setTimeout(() => {
      setBreathingPhase('hold');
      setTimeout(() => {
        setBreathingPhase('exhale');
        setTimeout(() => {
          setBreathCount(count + 1);
          runCycle(count + 1);
        }, 4000);
      }, 4000);
    }, 4000);
  }

  const phaseLabel =
    breathingPhase === 'inhale' ? 'Breathe in...'
    : breathingPhase === 'hold' ? 'Hold...'
    : breathingPhase === 'exhale' ? 'Breathe out...'
    : '';

  return (
    <div className="flex flex-col items-center space-y-8">
      <h2 className="text-2xl font-bold text-[var(--phase-regulate-color)]">Breathing Exercise</h2>

      <div
        className={`flex h-40 w-40 items-center justify-center rounded-full border-4 border-[var(--phase-regulate-border)] transition-all duration-[4000ms] ease-in-out ${
          breathingPhase === 'inhale' ? 'scale-125 bg-[var(--phase-regulate-color)]/10'
          : breathingPhase === 'hold' ? 'scale-125 bg-[var(--phase-regulate-color)]/20'
          : breathingPhase === 'exhale' ? 'scale-90 bg-[var(--phase-regulate-color)]/5'
          : 'scale-100 bg-[var(--phase-regulate-bg)]'
        }`}
        aria-live="polite"
      >
        <span className="text-lg font-semibold text-[var(--phase-regulate-color)]">
          {active ? phaseLabel : breathCount >= 3 ? 'Done' : 'Ready'}
        </span>
      </div>

      {active && (
        <p className="text-sm text-neutral-500">Breath {Math.min(breathCount + 1, 3)} of 3</p>
      )}

      {breathCount >= 3 ? (
        <div className="space-y-4 text-center">
          <p className="text-lg font-medium text-[var(--phase-regulate-color)]">
            Great job taking those breaths.
          </p>
          <p className="text-sm text-neutral-600">
            Your brain is building new connections right now.
          </p>
          <Button onClick={onDone}>Back to Tools</Button>
        </div>
      ) : !active ? (
        <Button onClick={startBreathing} className="px-8">
          Start Breathing
        </Button>
      ) : null}
    </div>
  );
}

function GroundingExercise({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [inputs, setInputs] = useState<string[]>(GROUNDING_STEPS.map(() => ''));
  const setRegulationLevel = useRegulationStore((s) => s.setLevel);
  const regulationLevel = useRegulationStore((s) => s.level);

  const current = GROUNDING_STEPS[stepIndex];
  const isComplete = stepIndex >= GROUNDING_STEPS.length;

  const handleNext = () => {
    if (stepIndex < GROUNDING_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setStepIndex(GROUNDING_STEPS.length);
      setRegulationLevel(Math.min(100, regulationLevel + 10));
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center space-y-6 text-center">
        <h2 className="text-2xl font-bold text-[var(--phase-regulate-color)]">Grounding Complete</h2>
        <p className="text-neutral-600">
          You used your senses to bring yourself back to the present. That&apos;s a powerful skill.
        </p>
        <Button onClick={onDone}>Back to Tools</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-2xl font-bold text-[var(--phase-regulate-color)]">5-4-3-2-1 Grounding</h2>

      <div className="flex gap-2">
        {GROUNDING_STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 w-8 rounded-full ${
              idx < stepIndex ? 'bg-[var(--phase-regulate-color)]'
              : idx === stepIndex ? 'bg-[var(--phase-regulate-color)]/50'
              : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center">
        <div className="text-4xl font-bold text-[var(--phase-regulate-color)]">{current.count}</div>
        <p className="mt-2 text-lg text-neutral-700">{current.prompt}</p>
        <textarea
          value={inputs[stepIndex]}
          onChange={(e) => {
            const next = [...inputs];
            next[stepIndex] = e.target.value;
            setInputs(next);
          }}
          placeholder={`List ${current.count} thing${current.count > 1 ? 's' : ''} you can ${current.sense}...`}
          rows={3}
          className="mt-4 w-full resize-none rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm placeholder:text-neutral-400 focus:border-[var(--phase-regulate-border)] focus:outline-none focus:ring-2 focus:ring-[var(--phase-regulate-color)]/20"
        />
      </div>

      <Button onClick={handleNext} className="px-8">
        {stepIndex < GROUNDING_STEPS.length - 1 ? 'Next Sense' : 'Finish'}
      </Button>
    </div>
  );
}

function ReframeExercise({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const setRegulationLevel = useRegulationStore((s) => s.setLevel);
  const regulationLevel = useRegulationStore((s) => s.level);

  const current = REFRAME_PROMPTS[index];

  const handleNext = () => {
    setRevealed(false);
    if (index < REFRAME_PROMPTS.length - 1) {
      setIndex(index + 1);
    } else {
      setRegulationLevel(Math.min(100, regulationLevel + 10));
      onDone();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-2xl font-bold text-[var(--phase-regulate-color)]">Positive Reframe</h2>
      <p className="text-sm text-neutral-600">Tap to reveal a growth-minded way of seeing things.</p>

      <div className="w-full max-w-md space-y-4">
        <div className="rounded-xl border-2 border-error-200 bg-error-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-error-400">Stuck thought</div>
          <p className="mt-2 text-lg text-error-700">&ldquo;{current.stuck}&rdquo;</p>
        </div>

        {revealed ? (
          <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary-400">Growth reframe</div>
            <p className="mt-2 text-lg text-primary-700">&ldquo;{current.reframe}&rdquo;</p>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-white p-5 text-center transition-colors hover:border-[var(--phase-regulate-border)] hover:bg-[var(--phase-regulate-bg)]"
          >
            <span className="text-sm font-medium text-neutral-500">Tap to reveal the reframe</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400">
        {index + 1} of {REFRAME_PROMPTS.length}
      </div>

      {revealed && (
        <Button onClick={handleNext} className="px-8">
          {index < REFRAME_PROMPTS.length - 1 ? 'Next Reframe' : 'Finish'}
        </Button>
      )}
    </div>
  );
}

function BodyScanExercise({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const setRegulationLevel = useRegulationStore((s) => s.setLevel);
  const regulationLevel = useRegulationStore((s) => s.level);

  const isComplete = stepIndex >= BODY_SCAN_STEPS.length;

  const handleNext = () => {
    if (stepIndex < BODY_SCAN_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setStepIndex(BODY_SCAN_STEPS.length);
      setRegulationLevel(Math.min(100, regulationLevel + 10));
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center space-y-6 text-center">
        <h2 className="text-2xl font-bold text-[var(--phase-regulate-color)]">Body Scan Complete</h2>
        <p className="text-neutral-600">
          You checked in with your body and let go of tension. Well done.
        </p>
        <Button onClick={onDone}>Back to Tools</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-2xl font-bold text-[var(--phase-regulate-color)]">Body Scan</h2>

      <div className="flex gap-1">
        {BODY_SCAN_STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 w-6 rounded-full ${
              idx <= stepIndex ? 'bg-[var(--phase-regulate-color)]' : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-lg leading-relaxed text-neutral-700">
          {BODY_SCAN_STEPS[stepIndex]}
        </p>
      </div>

      <Button onClick={handleNext} className="px-8">
        {stepIndex < BODY_SCAN_STEPS.length - 1 ? 'Next' : 'Finish'}
      </Button>
    </div>
  );
}
