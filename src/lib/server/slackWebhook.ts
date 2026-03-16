interface SlackWebhookPayload {
  text: string;
}

function resolveAdminSlackWebhookUrl(): string {
  const value =
    process.env.SLACK_ADMIN_WEBHOOK_URL?.trim() ??
    process.env.SLACK_WEBHOOK_URL?.trim() ??
    "";

  if (!value) {
    throw new Error("Slack webhook is not configured. Set SLACK_ADMIN_WEBHOOK_URL or SLACK_WEBHOOK_URL.");
  }

  return value;
}

export async function postSlackWebhookMessage(payload: SlackWebhookPayload): Promise<void> {
  const webhookUrl = resolveAdminSlackWebhookUrl();
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: payload.text }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Slack webhook request failed with status ${response.status}.`);
  }

  const bodyText = (await response.text()).trim();
  if (bodyText && bodyText.toLowerCase() !== "ok") {
    throw new Error(`Slack webhook returned unexpected response: ${bodyText}`);
  }
}
