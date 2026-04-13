import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RayVo'

interface TeamInviteProps {
  role?: string
  companyName?: string
  inviteUrl?: string
}

const TeamInviteEmail = ({
  role = 'staff',
  companyName = SITE_NAME,
  inviteUrl = 'https://rayvo.lovable.app/auth?mode=signup',
}: TeamInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You’ve been invited to join {companyName} on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={card}>
          <Text style={eyebrow}>RAYVO</Text>
          <Heading style={h1}>You’ve been invited to the team</Heading>
          <Text style={lead}>
            Join <strong>{companyName}</strong> on RayVo as a <strong>{role}</strong> and start collaborating right away.
          </Text>

          <Section style={highlightCard}>
            <Text style={highlightLabel}>Your role</Text>
            <Text style={highlightValue}>{role}</Text>
            <Text style={highlightMeta}>Workspace: {companyName}</Text>
          </Section>

          <Section style={buttonWrap}>
            <Button href={inviteUrl} style={button}>Accept invitation</Button>
          </Section>

          <Text style={helperText}>
            This link will take you straight to sign up and join the workspace.
          </Text>
          <Text style={fallbackText}>
            If the button does not work, open this link in your browser:<br />
            <a href={inviteUrl} style={link}>{inviteUrl}</a>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Professional invoicing made simple.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: `You've been invited to join ${SITE_NAME}`,
  displayName: 'Team invitation',
  previewData: {
    role: 'staff',
    companyName: 'Acme Corp',
    inviteUrl: 'https://rayvo.lovable.app/auth?mode=signup&email=invitee%40example.com',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', Arial, sans-serif",
  margin: '0',
  padding: '32px 0',
}
const wrapper = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '0 16px',
}
const card = {
  backgroundColor: '#f7fbfc',
  border: '1px solid #d8e7eb',
  borderRadius: '24px',
  padding: '36px 32px',
}
const eyebrow = {
  margin: '0 0 12px',
  color: 'hsl(192, 75%, 36%)',
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '0.2em',
}
const h1 = {
  margin: '0 0 12px',
  color: 'hsl(200, 30%, 8%)',
  fontSize: '32px',
  lineHeight: '1.15',
  fontWeight: '700' as const,
}
const lead = {
  margin: '0 0 24px',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '15px',
  lineHeight: '1.7',
}
const highlightCard = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  border: '1px solid #d8e7eb',
  padding: '24px',
  margin: '0 0 24px',
}
const highlightLabel = {
  margin: '0 0 8px',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '13px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}
const highlightValue = {
  margin: '0 0 8px',
  color: 'hsl(200, 30%, 8%)',
  fontSize: '28px',
  fontWeight: '700' as const,
  textTransform: 'capitalize' as const,
}
const highlightMeta = {
  margin: '0',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '14px',
}
const buttonWrap = {
  textAlign: 'center' as const,
  margin: '0 0 18px',
}
const button = {
  backgroundColor: 'hsl(192, 75%, 36%)',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600' as const,
  fontSize: '15px',
}
const helperText = {
  margin: '0 0 12px',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '14px',
  lineHeight: '1.6',
}
const fallbackText = {
  margin: '0',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '13px',
  lineHeight: '1.7',
}
const link = {
  color: 'hsl(192, 75%, 36%)',
  wordBreak: 'break-all' as const,
}
const hr = {
  borderColor: '#d8e7eb',
  margin: '24px 0 16px',
}
const footer = {
  margin: '0',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '12px',
  textAlign: 'center' as const,
}
