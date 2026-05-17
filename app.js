const form = document.getElementById('planner-form');

const recommendations = {
  cloud: {
    sms: {
      title: 'Cloud workflow with SMS relay',
      summary: 'Use a hosted mailbox watcher to filter incoming mail and send a short text message only when the target sender matches.',
    },
    push: {
      title: 'Cloud workflow with push handoff',
      summary: 'Use a hosted mailbox watcher and deliver a high-priority push through your phone automation or notification service.',
    },
  },
  device: {
    sms: {
      title: 'On-device agent with SMS fallback',
      summary: 'Let the phone watch synced mail locally, then trigger a text only for the chosen sender when the device can reliably process the event.',
    },
    push: {
      title: 'On-device agent with priority push',
      summary: 'Keep the entire flow on the phone and raise a focused push notification when mail from the selected sender appears.',
    },
  },
  provider: {
    sms: {
      title: 'Mail provider rule with SMS action',
      summary: 'Use the mail provider to label or route matching messages, then bridge that signal into an SMS alert.',
    },
    push: {
      title: 'Mail provider rule with push action',
      summary: 'Use provider-side filtering and let a notification service handle delivery to the phone.',
    },
  },
};

function readConfig() {
  return Object.fromEntries(new FormData(form).entries());
}

function buildWorkflow(config) {
  const senderRule = `Watch for new email from ${config.sender || 'the selected sender'}.`;
  const keywordRule = config.keyword
    ? `Require the subject or body to include “${config.keyword}” before alerting.`
    : 'No keyword filter is set, so every email from the chosen sender will alert intentionally.';
  const windowRule = {
    always: 'Allow delivery at any time.',
    business: 'Delay or suppress alerts outside business hours.',
    quiet: 'Allow this sender to override quiet hours, but keep all other mail muted.',
  }[config.window];

  const triggerStep = {
    cloud: 'Run the mailbox watcher in a hosted workflow so it keeps working even when the phone is offline.',
    device: 'Run the watcher on the phone using local automation tied to the mail app or synced notifications.',
    provider: 'Let the mail provider apply a rule or label first, then use that event as the notification trigger.',
  }[config.trigger];

  const deliveryStep = config.notification === 'sms'
    ? 'Send a short SMS with the sender, subject, and a link or reminder to open the full email.'
    : 'Send a high-priority push notification with the sender and subject only.';

  const runtimeStep = config.runtime === 'cloud'
    ? 'Store credentials and routing settings in the hosted environment with least-privilege access.'
    : 'Store automation settings on the phone and keep tokens limited to the mailbox and notification service.';

  const platformConstraint = config.platform === 'iphone' && config.trigger === 'device' && config.notification === 'sms'
    ? 'For iPhone, direct on-device SMS is limited, so use a cloud relay if text delivery is mandatory.'
    : null;

  return [senderRule, keywordRule, windowRule, triggerStep, deliveryStep, runtimeStep, platformConstraint].filter(Boolean);
}

function buildSecurity(config) {
  return [
    'Use a dedicated mailbox integration account or scoped API token instead of your main password.',
    `Only inspect messages from ${config.sender || 'the selected sender'} and avoid forwarding the full body unless absolutely required.`,
    config.notification === 'sms'
      ? 'Limit SMS content to the sender and subject so sensitive content does not travel over text.'
      : 'Keep push content minimal and require the phone to unlock before revealing message details.',
    config.runtime === 'cloud'
      ? 'Protect secrets in the hosted workflow and rotate them if the automation changes owners or services.'
      : 'Back up the automation locally and protect the phone with device encryption and biometric unlock.',
  ];
}

function buildValidation(config) {
  return [
    `Send a test email from ${config.sender || 'the selected sender'} and verify that exactly one ${config.notification === 'sms' ? 'text message' : 'push alert'} arrives.`,
    'Send a control email from a different sender and confirm that no alert is delivered.',
    config.keyword
      ? `Send one matching message with “${config.keyword}” and one without it to verify the keyword filter.`
      : 'Confirm that the sender filter alone triggers the alert without false positives.',
    'Temporarily disable the primary notification channel and confirm the fallback behavior still fires.',
  ];
}

function buildFallback(config) {
  const label = {
    push: 'secondary push notification',
    email: 'summary email',
    log: 'failure log',
  }[config.fallback];

  const retry = config.trigger === 'device'
    ? 'If the phone misses a local event, queue the alert and retry when mail sync resumes.'
    : 'Retry failed deliveries with exponential backoff before marking the alert as missed.';

  return [
    `If the primary ${config.notification === 'sms' ? 'SMS' : 'push'} delivery fails, create a ${label}.`,
    retry,
    'Record the time, sender, and delivery result so you can audit missed alerts without storing the full message.',
  ];
}

function renderList(elementId, items, ordered = false) {
  const container = document.getElementById(elementId);
  container.innerHTML = items
    .map(item => ordered ? `<li>${item}</li>` : `<li><span class="check-icon">✓</span><span>${item}</span></li>`)
    .join('');
}

function renderFallback(items) {
  const container = document.getElementById('fallback-plan');
  container.innerHTML = items.map(item => `<p>${item}</p>`).join('');
}

function normalizeConfig(config) {
  const runtime = config.trigger === 'device' ? 'device' : 'cloud';
  document.getElementById('runtime').value = runtime;
  return { ...config, runtime };
}

function renderRecommendation() {
  const finalConfig = normalizeConfig(readConfig());
  const recommendation = recommendations[finalConfig.trigger][finalConfig.notification];
  const platformNote = finalConfig.platform === 'iphone' && finalConfig.trigger === 'device' && finalConfig.notification === 'sms'
    ? ' iPhone usually needs a cloud relay for SMS, so local-only delivery is less reliable.'
    : '';

  document.getElementById('recommendation-title').textContent = recommendation.title;
  document.getElementById('recommendation-summary').textContent = `${recommendation.summary} This setup is optimized for ${finalConfig.platform === 'iphone' ? 'iPhone' : 'Android'} and ${finalConfig.window === 'always' ? 'continuous monitoring' : 'controlled alert windows'}.${platformNote}`;

  renderList('workflow-steps', buildWorkflow(finalConfig), true);
  renderList('security-checklist', buildSecurity(finalConfig));
  renderList('validation-checklist', buildValidation(finalConfig));
  renderFallback(buildFallback(finalConfig));
}

form.addEventListener('input', renderRecommendation);
renderRecommendation();
