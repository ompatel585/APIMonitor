export function channelVerificationEmail(token: string): { subject: string; text: string } {
  return {
    subject: 'Verify your APIMonitor notification channel',
    text: `Use this token to verify this email as an APIMonitor alert destination: ${token}\n\nIf you did not request this, ignore this email.`,
  };
}
