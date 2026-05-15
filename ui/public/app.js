// Wizard state management
let currentStep = 'landing';
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

// Screen elements
const landingScreen = document.getElementById('landing-screen');
const step1Screen = document.getElementById('step1-screen');
const step2Screen = document.getElementById('step2-screen');
const step3Screen = document.getElementById('step3-screen');
const step4Screen = document.getElementById('step4-screen');
const progressBar = document.getElementById('progress-bar');
const stepNumber = document.getElementById('step-number');
const stepTitle = document.getElementById('step-title');
const stepProgress = document.getElementById('step-progress');

// Task option buttons
const taskOptions = document.querySelectorAll('.task-option');

// Form elements
const step1Form = document.getElementById('step1-form');
const step2Form = document.getElementById('step2-form');

// Navigation buttons
const viewRequestsBtn = document.getElementById('view-requests-btn');
const step1BackBtn = document.getElementById('step1-back');
const step2BackBtn = document.getElementById('step2-back');
const step3BackBtn = document.getElementById('step3-back');
const submitRequestBtn = document.getElementById('submit-request');
const viewRequestStatusBtn = document.getElementById('view-request-status');
const submitAnotherBtn = document.getElementById('submit-another');

// Review elements
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

// Task type configurations
const taskConfigs = {
  'point-website': {
    recordType: 'A',
    title: 'Point your website to a server',
    description: "We'll connect your domain to an IP address",
    icon: 'fas fa-server'
  },
  'redirect-website': {
    recordType: 'CNAME',
    title: 'Redirect to another website',
    description: "We'll forward visitors to a different domain",
    icon: 'fas fa-external-link-alt'
  },
  'email-verification': {
    recordType: 'TXT',
    title: 'Set up email verification',
    description: "We'll add verification codes or SPF records",
    icon: 'fas fa-envelope-open-text'
  },
  'custom-nameservers': {
    recordType: 'NS',
    title: 'Configure custom nameservers',
    description: "We'll delegate DNS to another provider",
    icon: 'fas fa-network-wired'
  }
};

// Utility functions
function showScreen(screenName) {
  // Hide all screens
  [landingScreen, step1Screen, step2Screen, step3Screen, step4Screen].forEach(screen => {
    screen.style.display = 'none';
  });

  // Show progress bar for steps
  if (screenName !== 'landing') {
    progressBar.style.display = 'block';
    updateProgressBar(screenName);
  } else {
    progressBar.style.display = 'none';
  }

  // Show requested screen
  const screenMap = {
    'landing': landingScreen,
    'step1': step1Screen,
    'step2': step2Screen,
    'step3': step3Screen,
    'step4': step4Screen
  };
  
  if (screenMap[screenName]) {
    screenMap[screenName].style.display = 'block';
    currentStep = screenName;
  }
}

function updateProgressBar(step) {
  const steps = {
    'step1': { number: 1, title: 'Website details', total: 4 },
    'step2': { number: 2, title: 'Contact information', total: 4 },
    'step3': { number: 3, title: 'Review request', total: 4 },
    'step4': { number: 4, title: 'Request submitted', total: 4 }
  };

  const stepInfo = steps[step];
  if (stepInfo) {
    stepNumber.textContent = stepInfo.number;
    stepTitle.textContent = stepInfo.title;
    stepProgress.textContent = `Step ${stepInfo.number} of ${stepInfo.total}`;
  }
}

function populateReviewScreen() {
  // Website details
  reviewWebsite.textContent = `${formData.subdomain}.simardeep.xyz`;
  reviewIp.textContent = formData.targets.join(', ');
  
  // Format TTL for display
  const ttlMap = {
    300: '5 minutes',
    900: '15 minutes',
    3600: '1 hour',
    86400: '24 hours'
  };
  reviewTtl.textContent = ttlMap[formData.recordTTL] || `${formData.recordTTL} seconds`;
  
  // Contact information
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
  validationPanel.className = validation.ok ? 'alert alert-success' : 'alert alert-danger';
  validationResults.innerHTML = '';

  const list = document.createElement('ul');
  list.className = 'mb-0 ps-3';

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
  validationPanel.className = 'alert alert-danger';
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

// Event listeners

// Task option selection
taskOptions.forEach(button => {
  button.addEventListener('click', () => {
    selectedTask = button.dataset.task;
    const config = taskConfigs[selectedTask];
    
    // Update form data with task-specific defaults
    formData.recordType = config.recordType;
    formData.taskType = selectedTask;
    
    // Update step 1 screen with task-specific content
    const step1Icon = step1Screen.querySelector('.fa-2x');
    const step1Title = step1Screen.querySelector('.h4');
    const step1Description = step1Screen.querySelector('.text-muted');
    
    step1Icon.className = `${config.icon} text-primary fa-2x mb-2`;
    step1Title.textContent = config.title;
    step1Description.textContent = config.description;
    
    // Update input fields based on record type
    updateInputsForRecordType(config.recordType);
    
    showScreen('step1');
  });
});

function updateInputsForRecordType(recordType) {
  const targetLabel = document.getElementById('target-label');
  const targetInput = document.getElementById('server-ip');
  const targetHelp = document.getElementById('target-help');
  targetInput.value = '';
  targetInput.removeAttribute('pattern');
  targetInput.rows = 2;
  
  switch (recordType) {
    case 'A':
      targetLabel.textContent = "What's your server's IP address?";
      targetInput.placeholder = "192.168.1.100";
      targetHelp.textContent = "Use one or more IPv4 addresses. Put each address on a new line if there are multiple targets.";
      break;
    case 'CNAME':
      targetLabel.textContent = "What domain should this redirect to?";
      targetInput.placeholder = "example.com";
      targetHelp.textContent = "Use exactly one fully qualified domain name. Do not enter a URL path.";
      break;
    case 'TXT':
      targetLabel.textContent = "What text value do you want to set?";
      targetInput.placeholder = "v=spf1 include:_spf.google.com ~all";
      targetHelp.textContent = "Text record for verification, SPF, or other purposes";
      break;
    case 'NS':
      targetLabel.textContent = "What nameservers should handle this subdomain?";
      targetInput.placeholder = "ns-cloud-b1.googledomains.com\nns-cloud-b2.googledomains.com\nns-cloud-b3.googledomains.com\nns-cloud-b4.googledomains.com";
      targetInput.rows = 4;
      targetHelp.textContent = "Create the managed zone first, then paste at least two registrar setup nameservers, one per line.";
      break;
  }
}

// Step 1 form submission
step1Form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Collect form data
  formData.subdomain = document.getElementById('website-name').value.trim();
  const targetValue = document.getElementById('server-ip').value;
  formData.targets = parseTargets(targetValue);
  formData.recordTTL = parseInt(document.getElementById('ttl-select').value);
  
  showScreen('step2');
});

// Step 2 form submission  
step2Form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Collect form data
  formData.owner = document.getElementById('team-name').value.trim();
  formData.projectName = document.getElementById('project-name').value.trim();
  formData.projectId = document.getElementById('project-id').value.trim() || 'PROJ-' + Date.now();
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

// Navigation buttons
step1BackBtn.addEventListener('click', () => showScreen('landing'));
step2BackBtn.addEventListener('click', () => showScreen('step1'));
step3BackBtn.addEventListener('click', () => showScreen('step2'));

// Submit request
submitRequestBtn.addEventListener('click', async () => {
  try {
    // Show loading modal
    const modal = new bootstrap.Modal(document.getElementById('submittingModal'));
    modal.show();
    
    // Generate payload and submit
    const payload = generateRequestPayload();
    const response = await callApi('/api/requests', payload);
    
    // Generate reference number
    const reference = generateReferenceNumber();
    requestReference.textContent = reference;
    if (response.url) {
      pullRequestLink.href = response.url;
      pullRequestLink.textContent = response.url;
      pullRequestPanel.style.display = 'block';
    }
    
    // Hide modal and show success screen
    modal.hide();
    showScreen('step4');
    
  } catch (error) {
    // Hide modal and show error
    const modal = bootstrap.Modal.getInstance(document.getElementById('submittingModal'));
    if (modal) modal.hide();
    
    alert(`Error submitting request: ${error.message}`);
  }
});

// Final navigation
submitAnotherBtn.addEventListener('click', () => {
  // Reset form data
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
  
  // Clear forms
  step1Form.reset();
  step2Form.reset();
  document.getElementById('ttl-select').value = '300';
  
  showScreen('landing');
});

viewRequestStatusBtn.addEventListener('click', () => {
  // In a real implementation, this would navigate to a status page
  alert('Request status tracking would be implemented here.');
});

viewRequestsBtn.addEventListener('click', () => {
  // In a real implementation, this would show a list of user's requests
  alert('Request history would be implemented here.');
});

// Form validation enhancements
document.getElementById('website-name').addEventListener('input', (e) => {
  const value = e.target.value;
  const isValid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(value);
  
  if (value && !isValid) {
    e.target.setCustomValidity('Subdomain can only contain letters, numbers, and hyphens');
  } else {
    e.target.setCustomValidity('');
  }
});

document.getElementById('server-ip').addEventListener('input', (e) => {
  const value = e.target.value;
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

  e.target.setCustomValidity(message);
});

// Initialize the application
showScreen('landing');
