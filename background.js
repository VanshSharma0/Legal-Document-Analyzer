// Background script for Legal Document Analyzer

// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
      // First time installation
      showOnboarding();
      initializeDefaultSettings();
    } else if (details.reason === 'update') {
      // Extension update
      checkForMigrations(details.previousVersion);
    }
  });
  
  // Show context menu when right-clicking on pages
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'analyzeLegalDoc',
      title: 'Analyze Legal Document',
      contexts: ['page']
    });
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'analyzeLegalDoc') {
      chrome.tabs.sendMessage(tab.id, { action: 'analyze', options: getDefaultOptions() });
    }
  });
  
  // Set up default settings
  function initializeDefaultSettings() {
    chrome.storage.sync.set({
      highlightImportant: true,
      simplifyLanguage: true,
      flagIssues: true,
      showSummary: true,
      apiKey: '',
      useLocalProcessing: true,
      theme: 'light',
      firstRun: true
    });
  }
  
  // Handle migrations between versions if needed
  function checkForMigrations(previousVersion) {
    // Convert version strings to numbers for comparison
    const oldVersion = previousVersion ? Number(previousVersion.replace(/\./g, '')) : 0;
    const currentVersion = Number(chrome.runtime.getManifest().version.replace(/\./g, ''));
    
    if (oldVersion < 110) {
      // Example migration for versions before 1.1.0
      migrateToNewStorageFormat();
    }
  }
  
  // Migration example
  function migrateToNewStorageFormat() {
    chrome.storage.sync.get(null, data => {
      // Perform migration logic here
      console.log('Migrating from old storage format');
    });
  }
  
  // Show onboarding page
  function showOnboarding() {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
  
  // Get default options for analysis
  function getDefaultOptions() {
    return new Promise(resolve => {
      chrome.storage.sync.get({
        highlightImportant: true,
        simplifyLanguage: true,
        flagIssues: true,
        showSummary: true
      }, options => {
        resolve(options);
      });
    });
  }
  
  // Listen for messages from content scripts or popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getOptions') {
      getDefaultOptions().then(options => {
        sendResponse(options);
      });
      return true; // Keep channel open for async response
    }
    
    return false;
  });   