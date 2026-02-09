import { siteConfig } from '@/config/site';

const contactChannels = [
  {
    label: 'General Inquiries',
    description: 'Questions about the RootWork curriculum, partnership opportunities, or getting started.',
    email: 'info@rootwork.edu',
  },
  {
    label: 'Technical Support',
    description: 'Help with the RootGuide platform, account access, or troubleshooting.',
    email: 'support@rootwork.edu',
  },
  {
    label: 'Professional Development',
    description: 'Training workshops, credentialing, and educator certification inquiries.',
    email: 'pd@rootwork.edu',
  },
  {
    label: 'Research & Partnerships',
    description: 'University research collaborations, grant partnerships, and program evaluation.',
    email: 'research@rootwork.edu',
  },
] as const;

const faqItems = [
  {
    question: 'How do I get started with the RootWork curriculum?',
    answer:
      'Begin with our professional development training overview. Educators complete a 40-hour foundational training before implementing the curriculum. Contact our PD team to schedule your school or district.',
  },
  {
    question: 'Is RootWork available for individual families?',
    answer:
      'Yes. Our Starter plan provides access to the RootGuide AI tutor and garden-based learning activities for individual students. Visit the pricing page for details.',
  },
  {
    question: 'What grade levels does RootWork support?',
    answer:
      'The curriculum spans K-12 with four grade bands (K-2, 3-5, 6-8, 9-12), each with developmentally appropriate content, activities, and assessment tools.',
  },
  {
    question: 'Do we need a physical garden to use RootWork?',
    answer:
      'While an outdoor garden is ideal, the curriculum can be adapted for indoor container gardens, windowsill growing stations, or even virtual garden simulations. The key is connecting academic content to living systems.',
  },
  {
    question: 'How does RootWork protect student data?',
    answer:
      'We are fully FERPA and COPPA compliant. Student data is encrypted, stored securely, and never sold to third parties. See our privacy policy for details.',
  },
] as const;

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Contact</h1>
      <p className="mt-4 text-lg text-neutral-700">
        We would love to hear from you. Whether you have questions about the curriculum, need
        technical support, or want to explore a partnership, the {siteConfig.organization} team
        is here to help.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-neutral-900">Contact Channels</h2>
        <div className="mt-6 space-y-4">
          {contactChannels.map((channel) => (
            <div
              key={channel.label}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-neutral-900">{channel.label}</h3>
              <p className="mt-1 text-sm text-neutral-600">{channel.description}</p>
              <p className="mt-2 text-sm font-medium text-neutral-800">{channel.email}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Send a Message</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Fill out the form below and we will respond within two business days.
        </p>
        <form className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-neutral-700">
              I am a...
            </label>
            <select
              id="role"
              name="role"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              <option value="">Select your role</option>
              <option value="educator">Educator</option>
              <option value="administrator">School Administrator</option>
              <option value="parent">Parent / Guardian</option>
              <option value="partner">Community Partner</option>
              <option value="researcher">Researcher</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-neutral-700">
              Subject
            </label>
            <select
              id="subject"
              name="subject"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              <option value="">Select a topic</option>
              <option value="general">General Inquiry</option>
              <option value="support">Technical Support</option>
              <option value="pd">Professional Development</option>
              <option value="partnership">Partnership Opportunity</option>
              <option value="research">Research Collaboration</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-neutral-700">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              placeholder="How can we help?"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Send Message
          </button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-neutral-900">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-neutral-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-neutral-900">
                {item.question}
              </summary>
              <p className="px-5 pb-4 text-sm text-neutral-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Organization</h2>
        <p className="mt-2 text-sm text-neutral-700">
          <strong>{siteConfig.organization}</strong>
          <br />
          Founded by {siteConfig.creator}
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          Dedicated to creating healing-centered educational experiences that honor the whole child
          through trauma-informed, garden-based pedagogy and adaptive AI tutoring technology.
        </p>
      </section>
    </main>
  );
}
