import React from 'react';

const statusStyles: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  draft: {
    bg: 'hsl(220 9% 92%)',
    color: 'hsl(220 9% 35%)',
    border: 'hsl(220 9% 80%)',
    dot: 'hsl(220 9% 55%)',
    label: 'Draft',
  },
  sent: {
    bg: 'hsl(38 95% 48% / 0.15)',
    color: 'hsl(38 80% 28%)',
    border: 'hsl(38 95% 48% / 0.35)',
    dot: 'hsl(38 95% 48%)',
    label: 'Awaiting Payment',
  },
  paid: {
    bg: 'hsl(152 56% 38% / 0.12)',
    color: 'hsl(152 56% 22%)',
    border: 'hsl(152 56% 38% / 0.35)',
    dot: 'hsl(152 56% 38%)',
    label: 'Paid',
  },
  overdue: {
    bg: 'hsl(0 72% 51% / 0.12)',
    color: 'hsl(0 72% 30%)',
    border: 'hsl(0 72% 51% / 0.35)',
    dot: 'hsl(0 72% 51%)',
    label: 'Overdue',
  },
  partially_paid: {
    bg: 'hsl(210 80% 52% / 0.12)',
    color: 'hsl(210 80% 28%)',
    border: 'hsl(210 80% 52% / 0.35)',
    dot: 'hsl(210 80% 52%)',
    label: 'Partially Paid',
  },
  voided: {
    bg: 'hsl(0 0% 90%)',
    color: 'hsl(0 0% 38%)',
    border: 'hsl(0 0% 78%)',
    dot: 'hsl(0 0% 58%)',
    label: 'Voided',
  },
  approved: {
    bg: 'hsl(210 80% 52% / 0.12)',
    color: 'hsl(210 80% 28%)',
    border: 'hsl(210 80% 52% / 0.35)',
    dot: 'hsl(210 80% 52%)',
    label: 'Approved',
  },
  credited: {
    bg: 'hsl(210 80% 52% / 0.12)',
    color: 'hsl(210 80% 28%)',
    border: 'hsl(210 80% 52% / 0.35)',
    dot: 'hsl(210 80% 52%)',
    label: 'Credited',
  },
  accepted: {
    bg: 'hsl(152 56% 38% / 0.12)',
    color: 'hsl(152 56% 22%)',
    border: 'hsl(152 56% 38% / 0.35)',
    dot: 'hsl(152 56% 38%)',
    label: 'Accepted',
  },
  rejected: {
    bg: 'hsl(0 72% 51% / 0.12)',
    color: 'hsl(0 72% 30%)',
    border: 'hsl(0 72% 51% / 0.35)',
    dot: 'hsl(0 72% 51%)',
    label: 'Rejected',
  },
  converted: {
    bg: 'hsl(210 80% 52% / 0.12)',
    color: 'hsl(210 80% 28%)',
    border: 'hsl(210 80% 52% / 0.35)',
    dot: 'hsl(210 80% 52%)',
    label: 'Converted',
  },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const s = statusStyles[status] || statusStyles.draft;
  const displayLabel = label || s.label;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {displayLabel}
    </span>
  );
}
