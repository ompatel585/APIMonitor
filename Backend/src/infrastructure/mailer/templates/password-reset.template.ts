export function passwordResetEmail(token: string): { subject: string; text: string } {
  return {
    subject: 'Reset your APIMonitor password',
    text: `Use this token to reset your password: ${token}\n\nIf you did not request this, ignore this email.`,
  };
}
