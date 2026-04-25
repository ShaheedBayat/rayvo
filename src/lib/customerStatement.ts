export const normalizeStatementName = (value: string | undefined | null) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const isOverpaymentCreditNote = (creditNote: { notes?: string }) =>
  (creditNote.notes || '').toLowerCase().includes('auto-generated from overpayment');

const getAppliedCreditSourceNumber = (creditNote: { notes?: string }) => {
  const match = (creditNote.notes || '').match(/^applied from credit note\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

export const countsAsStatementCredit = <T extends { creditNoteNumber?: string; credit_note_number?: string; status?: string; notes?: string; companyId?: string; company_id?: string }>(
  creditNote: T,
  allCreditNotes: T[] = []
) => {
  if (creditNote.status === 'draft') return false;
  if (isOverpaymentCreditNote(creditNote)) return false;

  const sourceNumber = getAppliedCreditSourceNumber(creditNote);
  if (!sourceNumber) return true;

  const companyId = creditNote.companyId ?? creditNote.company_id;
  const source = allCreditNotes.find(cn =>
    (cn.creditNoteNumber ?? cn.credit_note_number) === sourceNumber &&
    (cn.companyId ?? cn.company_id) === companyId
  );

  return !source || !isOverpaymentCreditNote(source);
};