export type AlertTriggeredEmailInput = {
  monitorName: string;
  trigger: string;
  summary: string;
};

export function alertTriggeredEmail(input: AlertTriggeredEmailInput): { subject: string; text: string } {
  return {
    subject: `[APIMonitor] ${input.monitorName}: ${input.trigger}`,
    text: `${input.summary}\n\nThis is an automated alert from APIMonitor.`,
  };
}
