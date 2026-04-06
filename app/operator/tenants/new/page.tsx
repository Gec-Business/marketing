import OnboardingWizard from '@/components/operator/OnboardingWizard';
import { getBaseQuestions } from '@/lib/ai/onboarding-questions';

export default function NewTenantPage() {
  const baseQuestions = getBaseQuestions();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Onboard New Tenant</h1>
      <OnboardingWizard baseQuestions={baseQuestions} />
    </div>
  );
}
