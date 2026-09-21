import type { AssignmentStatus, IncidentStatus, Priority } from '@rapidlink/shared';

import { Badge } from '@/components/ui/badge';

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tones = { P1: 'red', P2: 'amber', P3: 'blue' } as const;
  return <Badge tone={tones[priority]}>{priority} priority</Badge>;
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const tone = status === 'resolved' ? 'green' : status === 'reported' ? 'amber' : 'blue';
  return <Badge tone={tone}>{status.replace('_', ' ')}</Badge>;
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const tone = status === 'completed' ? 'green' : status === 'on_scene' ? 'red' : 'blue';
  return <Badge tone={tone}>{status.replace('_', ' ')}</Badge>;
}
