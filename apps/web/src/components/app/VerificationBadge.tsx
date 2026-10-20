import type { Enums } from '@hmj/shared';
import { Badge, type Tone } from '@/components/ui/Badge';

const COPY: Record<Enums<'verification_status'>, { label: string; tone: Tone }> = {
  pending: { label: 'Started', tone: 'warning' },
  processing: { label: 'In progress', tone: 'info' },
  needs_review: { label: 'In review', tone: 'info' },
  verified: { label: 'Verified', tone: 'success' },
  failed: { label: "Didn't pass", tone: 'danger' },
  canceled: { label: 'Canceled', tone: 'neutral' },
};

export function VerificationBadge({ status }: { status: Enums<'verification_status'> | null | undefined }) {
  if (!status) return <Badge tone="neutral">Not started</Badge>;
  return <Badge tone={COPY[status].tone}>{COPY[status].label}</Badge>;
}
