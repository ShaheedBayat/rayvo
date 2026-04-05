import React from 'react';

type StatusKey = 'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid' | 'voided' | 'approved' | 'credited' | 'accepted' | 'rejected' | 'converted';

const statusStyles: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  draft: {
    bg: 'hsl(192 18% 93%)',
    color: 'hsl(200 15% 35%)',
    border: 'hsl(192 18% 82%)',
    dot: 'hsl(200 15% 55%)',
    label: 'Draft',
  },
  sent: {
    bg: 'hsl(38 92% 50% / 0.1)',
    color: 'hsl(38 80% 32%)',
    border: 'hsl(38 92% 50% / 0.25)',
    dot: 'hsl(38 92% 50%)',
    label: 'Awaiting Payment',
  },
  paid: {
    bg: 'hsl(152 56% 42% / 0.1)',
    color: 'hsl(152 56% 25%)',
    border: 'hsl(152 56% 42% / 0.25)',
    dot: 'hsl(152 56% 42%)',
    label: 'Paid',
  },
  overdue: {
    bg: 'hsl(0 72% 51% / 0.1)',
    color: 'hsl(0 72% 35%)',
    border: 'hsl(0 72% 51% / 0.25)',
    dot: 'hsl(0 72% 51%)',
    label: 'Overdue',
  },
  partially_paid: {
    bg: 'hsl(210 80% 52% / 0.1)',
    color: 'hsl(210 80% 35%)',
    border: 'hsl(210 80% 52% / 0.25)',
    dot: 'hsl(210 80% 52%)',
    label: 'Partially Paid',
  },
  voided: {
    bg: 'hsl(0 0% 93%)',
    color: 'hsl(0 0% 45%)',
    border: 'hsl(0 0% 82%)',
    dot: 'hsl(0 0% 65%)',
    label: 'Voided',
  },
  approved: {
    bg: 'hsl(210 80% 52% / 0.1)',
    color: 'hsl(210 80% 35%)',
    border: 'hsl(210 80% 52% / 0.25)',
    dot: 'hsl(210 80% 52%)',
    label: 'Approved',
  },
  credited: {
    bg: 'hsl(210 80% 52% / 0.1)',
    color: 'hsl(210 80% 35%)',
    border: 'hsl(210 80% 52% / 0.25)',
    dot: 'hsl(210 80% 52%)',
    label: 'Credited',
  },
  accepted: {
    bg: 'hsl(152 56% 42% / 0.1)',
    color: 'hsl(152 56% 25%)',
    border: 'hsl(152 56% 42% / 0.25)',
    dot: 'hsl(152 56% 42%)',
    label: 'Accepted',
  },
  rejected: {
    bg: 'hsl(0 72% 51% / 0.1)',
    color: 'hsl(0 72% 35%)',
    border: 'hsl(0 72% 51% / 0.25)',
    dot: 'hsl(0 72% 51%)',
    label: 'Rejected',
  },
  converted: {
    bg: 'hsl(210 80% 52% / 0.1)',
    color: 'hsl(210 80% 35%)',
    border: 'hsl(210 80% 52% / 0.25)',
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
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {displayLabel}
    </span>
  );
}
