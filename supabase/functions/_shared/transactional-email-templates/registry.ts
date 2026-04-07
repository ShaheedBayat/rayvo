/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as invoiceEmail } from './invoice-email.tsx'
import { template as teamInvite } from './team-invite.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'invoice-email': invoiceEmail,
  'team-invite': teamInvite,
}
