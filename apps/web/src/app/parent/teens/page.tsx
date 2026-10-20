'use client';
import { UserPlus } from 'lucide-react';
import { GuardianList } from '@/components/app/GuardianList';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/Misc';

export default function Teens() {
  return (
    <div className="space-y-8">
      <PageHeader title="My teens" subtitle="Teens linked to your account. Two parents can each link the same teen." actions={<ButtonLink href="/parent/teens/invite" icon={<UserPlus className="size-4" />} data-testid="invite-teen">Invite a teen</ButtonLink>} />
      <GuardianList empty={<EmptyState icon={<UserPlus className="size-6" />} title="No teens linked yet" action={<ButtonLink href="/parent/teens/invite">Get an invite code</ButtonLink>}>Your teen signs up as a Teen, then enters your code.</EmptyState>} />
    </div>
  );
}
