/**
 * Parental Consent Management Page
 * COPPA-compliant consent workflow for minor students
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  consentStatus: 'PENDING' | 'GRANTED' | 'DENIED' | 'WITHDRAWN' | null;
  dateOfBirth?: string;
}

export default function ParentalConsentPage() {
  const { userId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showConsentForm, setShowConsentForm] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchStudents();
    }
  }, [userId]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/parent/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students.filter((s: Student) => s.isMinor));
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentDecision = async (
    studentId: string,
    decision: 'GRANTED' | 'DENIED'
  ) => {
    try {
      const response = await fetch('/api/compliance/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUserId: studentId,
          consentStatus: decision,
          method: 'Parent Portal',
          notes: `Consent ${decision.toLowerCase()} via parent dashboard`,
        }),
      });

      if (response.ok) {
        // Refresh student list
        await fetchStudents();
        setShowConsentForm(false);
        setSelectedStudent(null);
      } else {
        alert('Failed to update consent. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleWithdrawConsent = async (studentId: string) => {
    if (
      !confirm(
        'Are you sure you want to withdraw consent? This will stop your child from using the platform until consent is granted again.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/compliance/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUserId: studentId,
          consentStatus: 'WITHDRAWN',
          method: 'Parent Portal',
          notes: 'Consent withdrawn by parent',
        }),
      });

      if (response.ok) {
        await fetchStudents();
      } else {
        alert('Failed to withdraw consent. Please try again.');
      }
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      alert('An error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Parental Consent</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900">
            No minor students found in your account. Parental consent is only required for
            students under 13 years old.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Parental Consent</h1>
      <p className="text-gray-600 mb-6">
        Manage consent for your children to use the Learning Hub platform (COPPA Compliance)
      </p>

      <div className="space-y-4">
        {students.map((student) => (
          <div
            key={student.id}
            className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Status:{' '}
                  <span
                    className={`font-medium ${
                      student.consentStatus === 'GRANTED'
                        ? 'text-green-600'
                        : student.consentStatus === 'DENIED'
                        ? 'text-red-600'
                        : student.consentStatus === 'WITHDRAWN'
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {student.consentStatus || 'PENDING'}
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                {student.consentStatus === 'GRANTED' ? (
                  <button
                    onClick={() => handleWithdrawConsent(student.id)}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Withdraw Consent
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowConsentForm(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Review Consent
                    </button>
                  </>
                )}
              </div>
            </div>

            {student.consentStatus === 'PENDING' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ Action required: Please review and grant consent for your child to use the
                  Learning Hub platform.
                </p>
              </div>
            )}

            {student.consentStatus === 'DENIED' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  Your child cannot access the platform without parental consent. You can grant
                  consent at any time.
                </p>
              </div>
            )}

            {student.consentStatus === 'WITHDRAWN' && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800">
                  Consent has been withdrawn. Your child&apos;s access has been suspended. You can
                  re-grant consent at any time.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Consent Form Modal */}
      {showConsentForm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Parental Consent for {selectedStudent.firstName} {selectedStudent.lastName}
              </h2>

              <div className="prose prose-sm max-w-none mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Children&apos;s Online Privacy Protection Act (COPPA) Consent
                </h3>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="font-semibold mb-2">What We Collect:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Name and grade level</li>
                    <li>Learning session transcripts and progress</li>
                    <li>Assessment scores and performance data</li>
                    <li>
                      IEP accommodations (if provided) to personalize learning support
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="font-semibold mb-2">How We Use It:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Personalized AI tutoring and adaptive assessments</li>
                    <li>Progress tracking and reporting to educators/parents</li>
                    <li>
                      Improving our educational platform (with anonymized data)
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="font-semibold mb-2">Data Protection:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      Data is encrypted and stored securely on U.S.-based servers
                    </li>
                    <li>
                      We never sell student data to third parties
                    </li>
                    <li>
                      Session transcripts are retained for 24 months, then deleted
                    </li>
                    <li>
                      You can request data export or deletion at any time
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h4 className="font-semibold mb-2 text-blue-900">
                    Your Rights:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                    <li>Review your child&apos;s data at any time</li>
                    <li>Withdraw consent and request data deletion</li>
                    <li>
                      Refuse collection beyond what&apos;s necessary for the service
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600 mt-4">
                  By granting consent, you agree to the collection, use, and disclosure of your
                  child&apos;s information as described in our{' '}
                  <a href="/privacy-policy" className="text-blue-600 underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleConsentDecision(selectedStudent.id, 'GRANTED')}
                  className="flex-1 px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  I Grant Consent
                </button>
                <button
                  onClick={() => handleConsentDecision(selectedStudent.id, 'DENIED')}
                  className="flex-1 px-6 py-3 text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors font-medium"
                >
                  I Do Not Consent
                </button>
                <button
                  onClick={() => {
                    setShowConsentForm(false);
                    setSelectedStudent(null);
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
