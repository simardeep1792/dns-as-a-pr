let selectedTask = '';
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
const stepNumber = document.getElementById('step-number');
const stepTitle = document.getElementById('step-title');
const stepProgress = document.getElementById('step-progress');
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

const taskConfigs = {
  'a-record': {
    recordType: 'A',
    title: 'A record details',
    description: 'Create or update an IPv4 address record through an Azure DevOps pull request.'
  },
  'cname-record': {
    recordType: 'CNAME',
    title: 'CNAME record details',
    description: 'Create an alias from this hostname to one canonical DNS name.'
  },
  'txt-record': {
    recordType: 'TXT',
    title: 'TXT record details',
    description: 'Publish a verification, SPF, or other text value.'
  },
  'ns-record': {
    recordType: 'NS',
    title: 'NS delegation details',
    description: 'Delegate this subdomain to an existing managed zone by submitting its nameservers.'
  }
};

function showScreen(screenName) {
  [landingScreen, step1Screen, step2Screen, step3Screen, step4Screen].forEach((screen) => {
    screen.style.display = 'none';
  });

  progressBar.style.display = screenName === 'landing' ? 'none' : 'flex';
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
  }
}

function updateProgressBar(step) {
  const steps = {
    step1: { number: 1, title: 'Record details', total: 4 },
    step2: { number: 2, title: 'Requester information', total: 4 },
    step3: { number: 3, title: 'Review and submit', total: 4 },
    step4: { number: 4, title: 'Request submitted', total: 4 }
  };

  const stepInfo = steps[step];
  if (!stepInfo) {
    return;
  }

  stepNumber.textContent = stepInfo.number;
  stepTitle.textContent = stepInfo.title;
  stepProgress.textContent = `Step ${stepInfo.number} of ${stepInfo.total}`;
}

function populateReviewScreen() {
  const ttlMap = {
    300: '300 seconds',
    900: '900 seconds',
    3600: '3600 seconds',
    86400: '86400 seconds'
  };

  reviewWebsite.textContent = `${formData.subdomain}.simardeep.xyz`;
  reviewIp.textContent = formData.targets.join(', ');
  reviewTtl.textContent = ttlMap[formData.recordTTL] || `${formData.recordTTL} seconds`;
  reviewTeam.textContent = formData.owner || '';
  reviewProject.textContent = formData.projectName || '';
  reviewProjectId.textContent = formData.projectId || 'N/A';
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

function showFormError(message) {
  validationPanel.style.display = 'block';
  validationPanel.className = 'validation-panel fail';
  validationResults.textContent = message;
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
  const targetLabel = document.getElementById('target-label');
  const targetInput = document.getElementById('server-ip');
  const targetHelp = document.getElementById('target-help');
  targetInput.value = '';
  targetInput.rows = 2;

  switch (recordType) {
    case 'A':
      targetLabel.textContent = 'IPv4 address';
      targetInput.placeholder = '203.0.113.10';
      targetHelp.textContent = 'Use one or more IPv4 addresses. Put each value on a new line.';
      break;
    case 'CNAME':
      targetLabel.textContent = 'Canonical DNS name';
      targetInput.placeholder = 'example.service.cloudprovider.ca';
      targetHelp.textContent = 'Use exactly one fully qualified domain name. Do not enter a URL path.';
      break;
    case 'TXT':
      targetLabel.textContent = 'TXT value';
      targetInput.placeholder = 'v=spf1 include:_spf.example.ca ~all';
      targetHelp.textContent = 'Use the text value exactly as provided by the service owner.';
      break;
    case 'NS':
      targetLabel.textContent = 'Delegated nameservers';
      targetInput.placeholder = 'ns-cloud-b1.googledomains.com\nns-cloud-b2.googledomains.com\nns-cloud-b3.googledomains.com\nns-cloud-b4.googledomains.com';
      targetInput.rows = 4;
      targetHelp.textContent = 'Create the managed zone first and paste at least two registrar setup nameservers, one per line.';
      break;
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
    showScreen('step1');
  });
});

step1Form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!step1Form.reportValidity()) {
    return;
  }

  formData.subdomain = document.getElementById('website-name').value.trim();
  formData.targets = parseTargets(document.getElementById('server-ip').value);
  formData.recordTTL = parseInt(document.getElementById('ttl-select').value, 10);
  showScreen('step2');
});

step2Form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!step2Form.reportValidity()) {
    return;
  }

  formData.owner = document.getElementById('team-name').value.trim();
  formData.projectName = document.getElementById('project-name').value.trim();
  formData.projectId = document.getElementById('project-id').value.trim() || `PROJ-${Date.now()}`;
  formData.sourceRepository = document.getElementById('source-repo').value.trim() || 'https://dev.azure.com/EDIP-PIDE/dns-as-a-pr/_git/dns-as-a-pr';

  populateReviewScreen();
  showScreen('step3');

  try {
    const validation = await callApi('/api/validate', generateRequestPayload());
    renderValidation(validation);
    submitRequestBtn.disabled = !validation.ok;
  } catch (error) {
    submitRequestBtn.disabled = true;
    showFormError(error.message);
  }
});

step1BackBtn.addEventListener('click', () => showScreen('landing'));
step2BackBtn.addEventListener('click', () => showScreen('step1'));
step3BackBtn.addEventListener('click', () => showScreen('step2'));

submitRequestBtn.addEventListener('click', async () => {
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
    alert(`Error submitting request: ${error.message}`);
  }
});

submitAnotherBtn.addEventListener('click', () => {
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

  step1Form.reset();
  step2Form.reset();
  document.getElementById('ttl-select').value = '300';
  validationPanel.style.display = 'none';
  pullRequestPanel.style.display = 'none';
  submitRequestBtn.disabled = false;
  showScreen('landing');
});

document.getElementById('website-name').addEventListener('input', (event) => {
  const value = event.target.value;
  const isValid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(value);
  event.target.setCustomValidity(value && !isValid ? 'Subdomain can only contain letters, numbers, and hyphens' : '');
});

document.getElementById('server-ip').addEventListener('input', (event) => {
  const value = event.target.value;
  const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const fqdnPattern = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(\.(?!-)[A-Za-z0-9-]{1,63})+\.?$/;
  const targets = parseTargets(value);
  let message = '';

  if (formData.recordType === 'A' && targets.some((target) => !ipPattern.test(target))) {
    message = 'Please enter valid IPv4 addresses only';
  }
  if ((formData.recordType === 'CNAME' || formData.recordType === 'NS') && targets.some((target) => !fqdnPattern.test(target))) {
    message = 'Please enter valid fully qualified domain names only';
  }
  if (formData.recordType === 'CNAME' && targets.length > 1) {
    message = 'CNAME requests can have only one target';
  }
  if (formData.recordType === 'NS' && value && targets.length < 2) {
    message = 'NS delegation requests require at least two nameservers';
  }

  event.target.setCustomValidity(message);
});

showScreen('landing');
