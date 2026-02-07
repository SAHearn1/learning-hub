export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Terms of Use (Draft)</h1>
      <p className="mt-4 text-neutral-700">
        These draft terms describe pilot usage of RootWork by schools, educators, parents, and students. Final legal
        terms will be executed per district contract before production launch.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">Eligibility and account roles</h2>
        <p className="text-neutral-700">
          Accounts are provisioned through school-authorized channels. Student access may require documented parental
          consent based on age, school policy, and applicable law.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">Acceptable use</h2>
        <ul className="list-disc space-y-2 pl-6 text-neutral-700">
          <li>No misuse, tampering, or unauthorized access attempts.</li>
          <li>No uploading unlawful or harmful content to tutoring experiences.</li>
          <li>Educators and admins are responsible for accurate roster and consent management.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">Compliance and records</h2>
        <p className="text-neutral-700">
          RootWork logs key administrative and privacy events to support FERPA/COPPA compliance workflows and audit
          readiness. Contracting institutions remain data controllers for student education records.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">Changes to these terms</h2>
        <p className="text-neutral-700">
          We will provide notice of material changes and maintain version history for school partners and families.
        </p>
      </section>
    </main>
  );
}
