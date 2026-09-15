export function emailVerificationEmail(token: string): { subject: string; text: string } {
  return {
    subject: 'Verify your APIMonitor email',
    text: `Use this token to verify your email: ${token}`,
  };
}
