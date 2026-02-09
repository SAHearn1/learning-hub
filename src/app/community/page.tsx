import { siteConfig } from '@/config/site';

const communityFeatures = [
  {
    title: 'Garden Circles',
    description:
      'Small group discussion spaces where educators share garden-based lesson successes, troubleshoot challenges, and collaborate on cross-school projects.',
    icon: 'circle',
  },
  {
    title: 'Resource Library',
    description:
      'Community-contributed lesson plans, garden activity guides, seasonal planting calendars, and assessment templates aligned to the 5Rs Framework.',
    icon: 'library',
  },
  {
    title: 'Mentor Network',
    description:
      'Connect experienced RootWork educators with those just beginning their journey. Mentors provide implementation support, classroom observation, and coaching.',
    icon: 'mentor',
  },
  {
    title: 'Family Corner',
    description:
      'A safe, moderated space for families to share garden stories, recipes, and tips. Available in multiple languages with content moderation for child safety.',
    icon: 'family',
  },
] as const;

const upcomingEvents = [
  {
    title: 'Spring Garden Planning Workshop',
    date: 'March 2026',
    type: 'Virtual Workshop',
    description: 'Plan your spring garden curriculum with fellow educators. Seed ordering coordination and shared planting calendars.',
  },
  {
    title: 'RootWork Annual Conference',
    date: 'June 2026',
    type: 'In-Person',
    description: 'Two-day conference featuring keynote speakers, hands-on garden workshops, student showcases, and professional development credits.',
  },
  {
    title: 'Harvest Celebration Network',
    date: 'October 2026',
    type: 'Hybrid',
    description: 'Schools across the network share harvest data, student growth portfolios, and celebrate the growing season together.',
  },
] as const;

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Community</h1>
      <p className="mt-3 text-lg text-neutral-700">
        The {siteConfig.name} community connects educators, families, and garden advocates
        who share a commitment to trauma-informed, garden-based education.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-neutral-900">Community Spaces</h2>
        <p className="mt-2 text-sm text-neutral-600">
          All community features are moderated and designed with child safety and trauma-informed
          principles at their core.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {communityFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-neutral-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-neutral-900">Upcoming Events</h2>
        <div className="mt-6 space-y-4">
          {upcomingEvents.map((event) => (
            <div
              key={event.title}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{event.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {event.date} &middot; {event.type}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{event.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Get Involved</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Whether you are an educator implementing the RootWork curriculum, a family member supporting
          a student, or a community partner interested in garden-based education, there is a place for
          you here.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/contact"
            className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Contact us to join
          </a>
          <a
            href="/learn"
            className="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Explore the curriculum
          </a>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-neutral-900">Community Guidelines</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Our community operates on the same principles as our classrooms:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-neutral-700">
          <li className="flex gap-2">
            <span className="font-semibold text-neutral-900">Safety first</span> &mdash; All interactions are moderated. No shaming, blaming, or harmful language.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-neutral-900">Growth mindset</span> &mdash; We celebrate effort and learning, not perfection.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-neutral-900">Confidentiality</span> &mdash; Student information is never shared in community spaces.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-neutral-900">Inclusivity</span> &mdash; Every voice matters. We honor diverse perspectives, cultures, and experiences.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-neutral-900">Child safety</span> &mdash; All content is reviewed for appropriateness. COPPA compliance is maintained throughout.
          </li>
        </ul>
      </section>
    </main>
  );
}
