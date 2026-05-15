let selectedTask = '';
let lastValidation = null;
let formData = {
  taskType: '',
  subdomain: '',
  recordType: 'A',
  recordTTL: 300,
  targets: [],
  owner: '',
  projectName: '',
  projectId: '',
  sourceRepository: '',
  controlledBy: 'dns-as-a-pr'
};

const landingScreen = document.getElementById('landing-screen');
const step1Screen = document.getElementById('step1-screen');
const step2Screen = document.getElementById('step2-screen');
const step3Screen = document.getElementById('step3-screen');
const step4Screen = document.getElementById('step4-screen');
const progressBar = document.getElementById('progress-bar');
const stepper = document.getElementById('gcds-stepper');
const taskOptions = document.querySelectorAll('.task-option');
const step1Form = document.getElementById('step1-form');
const step2Form = document.getElementById('step2-form');
const step1BackBtn = document.getElementById('step1-back');
const step2BackBtn = document.getElementById('step2-back');
const step3BackBtn = document.getElementById('step3-back');
const submitRequestBtn = document.getElementById('submit-request');
const submitAnotherBtn = document.getElementById('submit-another');
const submittingModal = document.getElementById('submittingModal');
const reviewWebsite = document.getElementById('review-website');
const reviewRecordType = document.getElementById('review-record-type');
const reviewIp = document.getElementById('review-ip');
const reviewTtl = document.getElementById('review-ttl');
const reviewTeam = document.getElementById('review-team');
const reviewProject = document.getElementById('review-project');
const reviewProjectId = document.getElementById('review-project-id');
const requestReference = document.getElementById('request-reference');
const validationPanel = document.getElementById('validation-panel');
const validationResults = document.getElementById('validation-results');
const pullRequestPanel = document.getElementById('pull-request-panel');
const pullRequestLink = document.getElementById('pull-request-link');
const recordFormTitle = document.getElementById('record-form-title');
const recordFormDescription = document.getElementById('record-form-description');
const yamlPreviewPanel = document.getElementById('yaml-preview-panel');
const yamlPreview = document.getElementById('yaml-preview');
const previewFilePath = document.getElementById('preview-file-path');
const previewBranch = document.getElementById('preview-branch');
const previewTitle = document.getElementById('preview-title');
const step1Error = document.getElementById('step1-error');
const step2Error = document.getElementById('step2-error');

const taskConfigs = {
  'a-record': {
    recordType: 'A',
    title: 'A record details',
    description: 'Create or update an IPv4 address record through an Azure DevOps pull request.'
  },
  'aaaa-record': {
    recordType: 'AAAA',
    title: 'AAAA record details',
    description: 'Create or update an IPv6 address record through an Azure DevOps pull request.'
  },
  'cname-record': {
    recordType: 'CNAME',
    title: 'CNAME record details',
    description: 'Create an alias from this hostname to one canonical DNS name.'
  },
  'txt-record': {
    recordType: 'TXT',
    title: 'TXT record details',
    description: 'Publish a verification, SPF, DKIM, or other text value.'
  },
  'ns-record': {
    recordType: 'NS',
    title: 'NS delegation details',
    description: 'Delegate this subdomain to an existing child DNS zone by submitting its authoritative nameservers.'
  }
};

function onGcdsAction(element, handler) {
  element.addEventListener('gcdsClick', handler);
}

function getFieldValue(id) {
  const element = document.getElementById(id);
  return String(element.value || '').trim();
}

function setFieldValue(id, value) {
  const element = document.getElementById(id);
  element.value = value;
  element.setAttribute('value', value);
}

function setError(container, message) {
  if (!message) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  container.hidden = false;
  container.innerHTML = `<gcds-alert alert-role="danger" heading="There is a problem" hide-close-btn><p>${escapeHtml(message)}</p></gcds-alert>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showScreen(screenName) {
  [landingScreen, step1Screen, step2Screen, step3Screen, step4Screen].forEach((screen) => {
    screen.style.display = 'none';
  });

  progressBar.style.display = screenName === 'landing' ? 'none' : 'block';
  updateProgressBar(screenName);

  const screenMap = {
    landing: landingScreen,
    step1: step1Screen,
    step2: step2Screen,
    step3: step3Screen,
    step4: step4Screen
  };

  if (screenMap[screenName]) {
    screenMap[screenName].style.display = 'block';
    screenMap[screenName].querySelector('gcds-heading')?.focus?.();
  }
}

function updateProgressBar(step) {
  const steps = {
    step1: { number: 1, title: 'Record details' },
    step2: { number: 2, title: 'Requester information' },
    step3: { number: 3, title: 'Review and submit' },
    step4: { number: 4, title: 'Request submitted' }
  };

  const stepInfo = steps[step];
  if (!stepInfo) {
    return;
  }

  stepper.setAttribute('current-step', String(stepInfo.number));
  stepper.textContent = stepInfo.title;
}

function populateReviewScreen() {
  const ttlMap = {
    300: '300 seconds',
    900: '900 seconds',
    3600: '3600 seconds',
    86400: '86400 seconds'
  };

  reviewWebsite.textContent = `${formData.subdomain}.simardeep.xyz`;
  reviewRecordType.textContent = formData.recordType;
  reviewIp.textContent = formData.targets.join(', ');
  reviewTtl.textContent = ttlMap[formData.recordTTL] || `${formData.recordTTL} seconds`;
  reviewTeam.textContent = formData.owner;
  reviewProject.textContent = formData.projectName;
  reviewProjectId.textContent = formData.projectId;
}

function parseTargets(rawValue) {
  if (formData.recordType === 'TXT') {
    const value = rawValue.trim();
    return value ? [value.startsWith('"') ? value : `"${value}"`] : [];
  }

  if (formData.recordType === 'CNAME') {
    const value = rawValue.trim();
    return value ? [value] : [];
  }

  return rawValue
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function renderValidation(validation) {
  validationPanel.style.display = 'block';
  validationPanel.className = validation.ok ? 'validation-panel pass' : 'validation-panel fail';
  validationResults.innerHTML = '';

  const list = document.createElement('ul');
  validation.checks.forEach((check) => {
    const item = document.createElement('li');
    item.textContent = `${check.status.toUpperCase()}: ${check.detail}`;
    list.appendChild(item);
  });

  (validation.warnings || []).forEach((warning) => {
    const item = document.createElement('li');
    item.textContent = `WARNING: ${warning}`;
    list.appendChild(item);
  });

  validationResults.appendChild(list);
}

function renderYamlPreview(validation) {
  yamlPreviewPanel.style.display = 'block';
  previewFilePath.textContent = validation.filePath;
  previewBranch.textContent = validation.branch;
  previewTitle.textContent = validation.title;
  yamlPreview.textContent = validation.yaml;
}

function showValidationError(message) {
  validationPanel.style.display = 'block';
  validationPanel.className = 'validation-panel fail';
  validationResults.textContent = message;
  yamlPreviewPanel.style.display = 'none';
}

function generateRequestPayload() {
  return {
    subdomain: formData.subdomain,
    recordType: formData.recordType,
    recordTTL: formData.recordTTL,
    targets: formData.targets,
    controlledBy: formData.controlledBy,
    owner: formData.owner,
    projectName: formData.projectName,
    projectId: formData.projectId,
    sourceRepository: formData.sourceRepository
  };
}

async function callApi(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Request failed');
  }

  return body;
}

function generateReferenceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getTime()).slice(-6);
  return `DNS-${year}${month}${day}-${time}`;
}

function showSubmittingModal() {
  submittingModal.classList.add('show');
  submittingModal.setAttribute('aria-hidden', 'false');
}

function hideSubmittingModal() {
  submittingModal.classList.remove('show');
  submittingModal.setAttribute('aria-hidden', 'true');
}

function updateInputsForRecordType(recordType) {
  const targetInput = document.getElementById('server-ip');
  targetInput.value = '';
  targetInput.setAttribute('value', '');
  targetInput.setAttribute('rows', '2');

  const config = {
    A: {
      label: 'IPv4 address',
      hint: 'Use one or more IPv4 addresses. Put each value on a new line.',
      rows: '2'
    },
    AAAA: {
      label: 'IPv6 address',
      hint: 'Use one or more IPv6 addresses. Put each value on a new line.',
      rows: '2'
    },
    CNAME: {
      label: 'Canonical DNS name',
      hint: 'Use exactly one fully qualified domain name. Do not enter a URL path.',
      rows: '2'
    },
    TXT: {
      label: 'TXT value',
      hint: 'Use the text value exactly as provided by the service owner. Quotes are added automatically if omitted.',
      rows: '3'
    },
    NS: {
      label: 'Delegated nameservers',
      hint: 'Create the child managed zone first and paste at least two authoritative nameservers, one per line.',
      rows: '4'
    }
  }[recordType];

  targetInput.setAttribute('label', config.label);
  targetInput.setAttribute('hint', config.hint);
  targetInput.setAttribute('rows', config.rows);
}

function validateStep1() {
  const subdomain = getFieldValue('website-name');
  const targets = parseTargets(getFieldValue('server-ip'));
  const ttl = Number(getFieldValue('ttl-select') || 300);

  if (!subdomain) {
    throw new Error('Enter the subdomain for this DNS request.');
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(subdomain)) {
    throw new Error('Subdomain can only contain letters, numbers, and hyphens, and cannot start or end with a hyphen.');
  }

  if (targets.length === 0) {
    throw new Error('Enter at least one DNS target.');
  }

  if (formData.recordType === 'CNAME' && targets.length !== 1) {
    throw new Error('CNAME requests must have exactly one target.');
  }

  if (formData.recordType === 'NS' && targets.length < 2) {
    throw new Error('NS delegation requests require at least two nameservers.');
  }

  formData.subdomain = subdomain.toLowerCase();
  formData.targets = targets;
  formData.recordTTL = ttl;
}

function validateStep2() {
  formData.owner = getFieldValue('team-name');
  formData.projectName = getFieldValue('project-name');
  formData.projectId = getFieldValue('project-id');
  formData.sourceRepository = getFieldValue('source-repo');

  if (!formData.owner) {
    throw new Error('Enter the team or owner responsible for this record.');
  }

  if (!formData.projectName) {
    throw new Error('Enter the project name.');
  }

  if (!formData.projectId) {
    throw new Error('Enter the project ID. This field is required for auditability.');
  }

  if (!formData.sourceRepository) {
    throw new Error('Enter the Azure DevOps source repository URL.');
  }
}

taskOptions.forEach((button) => {
  button.addEventListener('click', () => {
    selectedTask = button.dataset.task;
    const config = taskConfigs[selectedTask];
    formData.recordType = config.recordType;
    formData.taskType = selectedTask;
    recordFormTitle.textContent = config.title;
    recordFormDescription.textContent = config.description;
    updateInputsForRecordType(config.recordType);
    setError(step1Error, '');
    showScreen('step1');
  });
});

step1Form.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    validateStep1();
    setError(step1Error, '');
    showScreen('step2');
  } catch (error) {
    setError(step1Error, error.message);
  }
});

step2Form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    validateStep2();
    setError(step2Error, '');
  } catch (error) {
    setError(step2Error, error.message);
    return;
  }

  populateReviewScreen();
  showScreen('step3');
  submitRequestBtn.disabled = true;
  submitRequestBtn.setAttribute('disabled', '');
  validationPanel.style.display = 'none';
  yamlPreviewPanel.style.display = 'none';

  try {
    const validation = await callApi('/api/validate', generateRequestPayload());
    lastValidation = validation;
    renderValidation(validation);
    renderYamlPreview(validation);
    submitRequestBtn.disabled = !validation.ok;
    if (validation.ok) {
      submitRequestBtn.removeAttribute('disabled');
    }
  } catch (error) {
    lastValidation = null;
    submitRequestBtn.disabled = true;
    submitRequestBtn.setAttribute('disabled', '');
    showValidationError(error.message);
  }
});

onGcdsAction(document.querySelector('[button-id="step1-continue-button"]'), () => step1Form.requestSubmit());
onGcdsAction(document.querySelector('[button-id="step2-continue-button"]'), () => step2Form.requestSubmit());
onGcdsAction(step1BackBtn, () => showScreen('landing'));
onGcdsAction(step2BackBtn, () => showScreen('step1'));
onGcdsAction(step3BackBtn, () => showScreen('step2'));

onGcdsAction(submitRequestBtn, async () => {
  if (!lastValidation?.ok) {
    showValidationError('Wait for automated validation to pass before submitting the request.');
    return;
  }

  try {
    showSubmittingModal();
    const response = await callApi('/api/requests', generateRequestPayload());
    requestReference.textContent = generateReferenceNumber();
    if (response.url) {
      pullRequestLink.href = response.url;
      pullRequestLink.textContent = response.url;
      pullRequestPanel.style.display = 'block';
    }
    hideSubmittingModal();
    showScreen('step4');
  } catch (error) {
    hideSubmittingModal();
    showValidationError(`Error submitting request: ${error.message}`);
    showScreen('step3');
  }
});

onGcdsAction(submitAnotherBtn, () => {
  formData = {
    taskType: '',
    subdomain: '',
    recordType: 'A',
    recordTTL: 300,
    targets: [],
    owner: '',
    projectName: '',
    projectId: '',
    sourceRepository: '',
    controlledBy: 'dns-as-a-pr'
  };
  lastValidation = null;

  ['website-name', 'server-ip', 'team-name', 'project-name', 'project-id', 'source-repo'].forEach((id) => setFieldValue(id, ''));
  setFieldValue('ttl-select', '300');
  validationPanel.style.display = 'none';
  yamlPreviewPanel.style.display = 'none';
  pullRequestPanel.style.display = 'none';
  submitRequestBtn.disabled = false;
  submitRequestBtn.removeAttribute('disabled');
  showScreen('landing');
});

showScreen('landing');
