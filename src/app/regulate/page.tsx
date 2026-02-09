const breathingExercises = [
  {
    name: 'Flower Breathing',
    instruction: 'Breathe in slowly through your nose, like smelling a flower. Breathe out gently through your mouth, like blowing petals.',
    duration: '1 minute',
    bestFor: 'Transition times, general calming',
  },
  {
    name: 'Box Breathing',
    instruction: 'Breathe in for 4 counts. Hold for 4 counts. Breathe out for 4 counts. Hold for 4 counts. Repeat.',
    duration: '2 minutes',
    bestFor: 'Anxiety, test preparation, focus',
  },
  {
    name: 'Balloon Breathing',
    instruction: 'Place your hands on your belly. Breathe in deeply and feel your belly expand like a balloon. Breathe out and feel it deflate.',
    duration: '1-2 minutes',
    bestFor: 'Younger students, body awareness',
  },
  {
    name: '5-4-3-2-1 Grounding',
    instruction: 'Name 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, and 1 thing you taste.',
    duration: '2-3 minutes',
    bestFor: 'Dissociation, overwhelm, panic',
  },
] as const;

const gardenVisualizations = [
  {
    name: 'Planting Seeds',
    description:
      'Close your eyes. Imagine you are in the garden. Feel the warm soil in your hands. Place a seed gently into the earth. Cover it with soil. Water it slowly. This seed is a new thought, a new possibility. Watch it begin to grow.',
  },
  {
    name: 'Strong Roots',
    description:
      'Stand tall like a tree. Feel your feet on the ground. Imagine roots growing down from your feet, deep into the earth. These roots are strong and steady. No wind can knock you over. You are grounded. You are safe.',
  },
  {
    name: 'Garden Rain',
    description:
      'Imagine a gentle rain falling on the garden. Each drop washes away one worry. Feel the rain on your face. It is cool and refreshing. The garden is being nourished. You are being nourished too. Let the rain wash everything clean.',
  },
] as const;

const regulationStrategies = [
  {
    category: 'When energy is too HIGH',
    description: 'Feeling restless, agitated, or overwhelmed',
    strategies: [
      'Heavy work: Push against a wall, carry something heavy, squeeze a stress ball',
      'Slow deep breathing: Extend the exhale longer than the inhale',
      'Cold water: Splash on face or hold an ice cube',
      'Progressive muscle relaxation: Tense and release each muscle group',
      'Garden walk: Slow, deliberate steps with attention to each footfall',
    ],
  },
  {
    category: 'When energy is too LOW',
    description: 'Feeling flat, foggy, or disconnected',
    strategies: [
      'Movement: Stretch, walk, do jumping jacks or garden yoga',
      'Cold water sip or crunchy snack',
      'Smell something strong: Mint, rosemary, or citrus',
      'Change position: Stand up, sit differently, go outside',
      'Engage senses: Touch different textures, listen to nature sounds',
    ],
  },
  {
    category: 'When feeling STUCK',
    description: 'Feeling frustrated with a problem or unable to start',
    strategies: [
      'Take a garden break: Step outside for 2 minutes',
      'Talk to a garden buddy about something unrelated to the task',
      'Draw the problem instead of writing about it',
      'Start with the easiest part first',
      'Ask for a hint, not the answer: "Can you help me get started?"',
    ],
  },
] as const;

export default function RegulatePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Calm Corner</h1>
      <p className="mt-3 text-lg text-neutral-700">
        Everyone needs a moment to reset sometimes. The Calm Corner provides
        regulation tools and grounding exercises to help you return to your
        window of tolerance and feel ready to learn.
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        These strategies come from the Regulate phase of the 5Rs Framework. Using them is a
        sign of strength, not weakness. Even the strongest plants need water and shade.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-neutral-900">Breathing Exercises</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Breathing is the fastest way to shift your nervous system. Try one of these exercises
          when you need to calm down or re-energize.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {breathingExercises.map((exercise) => (
            <div
              key={exercise.name}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-neutral-900">{exercise.name}</h3>
              <p className="mt-2 text-sm text-neutral-600">{exercise.instruction}</p>
              <div className="mt-3 flex gap-4 text-xs text-neutral-500">
                <span>Duration: {exercise.duration}</span>
                <span>Best for: {exercise.bestFor}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-neutral-900">Garden Visualizations</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Close your eyes and follow along with one of these guided visualizations.
          Let the garden bring you peace.
        </p>
        <div className="mt-6 space-y-4">
          {gardenVisualizations.map((viz) => (
            <div
              key={viz.name}
              className="rounded-xl border border-neutral-200 bg-gradient-to-r from-green-50 to-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-neutral-900">{viz.name}</h3>
              <p className="mt-2 text-sm italic text-neutral-700">{viz.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-neutral-900">Regulation Strategies</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Different feelings need different strategies. Find what works best for you.
        </p>
        <div className="mt-6 space-y-6">
          {regulationStrategies.map((group) => (
            <div
              key={group.category}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-neutral-900">{group.category}</h3>
              <p className="mt-1 text-sm text-neutral-500">{group.description}</p>
              <ul className="mt-3 space-y-1.5">
                {group.strategies.map((strategy) => (
                  <li key={strategy} className="text-sm text-neutral-700">
                    &bull; {strategy}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Check In With Yourself</h2>
        <p className="mt-2 text-sm text-neutral-600">
          How are you feeling right now? Take a moment to notice without judging.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {['Blooming', 'Growing', 'Steady', 'Wilting', 'Stormy'].map((feeling) => (
            <span
              key={feeling}
              className="inline-flex cursor-default items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {feeling}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          Whatever you are feeling is okay. There are no wrong answers in the garden.
          If you are struggling, reach out to a trusted adult or use the strategies above.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-neutral-900">For Educators</h2>
        <p className="mt-2 text-sm text-neutral-600">
          The Calm Corner is designed as a self-serve regulation space that students can access
          independently or with educator guidance. Key implementation notes:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-neutral-700">
          <li>&bull; Visiting the Calm Corner should never be used as punishment</li>
          <li>&bull; Students should be taught these strategies explicitly before being expected to use them independently</li>
          <li>&bull; The physical classroom calm corner should mirror these digital tools with sensory materials, visual timers, and comfortable seating</li>
          <li>&bull; Track regulation strategy use for patterns, not as a behavioral metric</li>
          <li>&bull; Model using regulation strategies yourself to normalize the practice</li>
        </ul>
      </section>
    </main>
  );
}
