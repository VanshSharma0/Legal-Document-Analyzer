document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const analyzeBtn = document.getElementById('analyze-btn');
    const highlightImportant = document.getElementById('highlight-important');
    const simplifyLanguage = document.getElementById('simplify-language');
    const flagIssues = document.getElementById('flag-issues');
    const showSummary = document.getElementById('show-summary');
    const statusMessage = document.getElementById('status-message');
    const loader = document.getElementById('loader');
    const importantCount = document.getElementById('important-count');
    const issuesCount = document.getElementById('issues-count');
    const readabilityScore = document.getElementById('readability-score');
    const summaryContent = document.getElementById('summary-content');
    const helpBtn = document.getElementById('help-btn');
    const settingsBtn = document.getElementById('settings-btn');
  
    // Load saved preferences
    chrome.storage.sync.get({
      highlightImportant: true,
      simplifyLanguage: true,
      flagIssues: true,
      showSummary: true
    }, (items) => {
      highlightImportant.checked = items.highlightImportant;
      simplifyLanguage.checked = items.simplifyLanguage;
      flagIssues.checked = items.flagIssues;
      showSummary.checked = items.showSummary;
    });
  
    // Save preferences when toggled
    function savePreferences() {
      chrome.storage.sync.set({
        highlightImportant: highlightImportant.checked,
        simplifyLanguage: simplifyLanguage.checked,
        flagIssues: flagIssues.checked,
        showSummary: showSummary.checked
      });
    }
  
    highlightImportant.addEventListener('change', savePreferences);
    simplifyLanguage.addEventListener('change', savePreferences);
    flagIssues.addEventListener('change', savePreferences);
    showSummary.addEventListener('change', savePreferences);
  
    // Handle analyze button click
    analyzeBtn.addEventListener('click', () => {
      statusMessage.textContent = 'Analyzing document...';
      loader.style.display = 'block';
      
      // Get current active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'analyze',
          options: {
            highlightImportant: highlightImportant.checked,
            simplifyLanguage: simplifyLanguage.checked,
            flagIssues: flagIssues.checked,
            showSummary: showSummary.checked
          }
        }, response => {
          handleAnalysisResponse(response);
        });
      });
    });
  
    // Handle analysis response
    function handleAnalysisResponse(response) {
      loader.style.display = 'none';
      
      if (!response || response.error) {
        statusMessage.textContent = response?.error || 'Error analyzing document';
        return;
      }
      
      // Update UI with response data
      statusMessage.textContent = 'Analysis complete';
      importantCount.textContent = response.stats.importantClauses || 0;
      issuesCount.textContent = response.stats.potentialIssues || 0;
      
      // Update readability score
      const readability = response.stats.readabilityScore || 0;
      readabilityScore.textContent = readabilityLevelText(readability);
      
      // Update summary
      if (response.summary) {
        summaryContent.innerHTML = response.summary;
      } else {
        summaryContent.textContent = 'No summary available';
      }
    }
  
    // Convert readability score to text
    function readabilityLevelText(score) {
      if (score < 30) return 'Very Complex';
      if (score < 50) return 'Complex';
      if (score < 70) return 'Moderate';
      if (score < 90) return 'Simple';
      return 'Very Simple';
    }
  
    // Handle help button
    helpBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
    });
  
    // Handle settings button
    settingsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });
  });