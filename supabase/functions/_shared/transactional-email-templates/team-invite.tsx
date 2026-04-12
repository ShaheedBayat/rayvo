import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
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
    <Preview>You've been invited to join {companyName} on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Team Invitation</Heading>
        <Text style={text}>
          You've been invited to join <strong>{companyName}</strong> as a <strong>{role}</strong>.
        </Text>
        <Text style={text}>
          Create your account to join the company and go straight into the app.
        </Text>
        <a href={inviteUrl} style={button}>Accept invitation</a>
        <Text style={linkText}>
          Or open this link in your browser:<br />
          <a href={inviteUrl} style={link}>{inviteUrl}</a>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Sent via {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: `You've been invited to join ${SITE_NAME}`,
  displayName: 'Team invitation',
  previewData: { role: 'staff', companyName: 'Acme Corp', inviteUrl: 'https://rayvo.lovable.app/auth?mode=signup&email=invitee%40example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 20px', maxWidth: '500px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  display: 'inline-block',
  margin: '8px 0 0',
  padding: '12px 20px',
  borderRadius: '10px',
  backgroundColor: '#111827',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
}
const linkText = { fontSize: '13px', color: '#666', lineHeight: '1.6', margin: '16px 0 0' }
const link = { color: '#111827', wordBreak: 'break-all' as const }
const hr = { borderColor: '#eee', margin: '30px 0' }
const footer = { fontSize: '12px', color: '#999', marginTop: '30px' }
