document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const themeSelect = document.getElementById('theme');
    const fontSizeSelect = document.getElementById('fontSize');
    const highContrastToggle = document.getElementById('high-contrast');
    const localProcessingToggle = document.getElementById('local-processing');
    const apiKeyInput = document.getElementById('api-key');
    const apiKeyContainer = document.getElementById('api-key-container');
    const languageSelect = document.getElementById('language');
    const readabilitySelect = document.getElementById('readability');
    const autoAnalyzeToggle = document.getElementById('auto-analyze');
    const contextMenuToggle = document.getElementById('context-menu');
    const usageDataToggle = document.getElementById('usage-data');
    const clearDataBtn = document.getElementById('clear-data');
    const resetBtn = document.getElementById('reset-btn');
    const saveBtn = document.getElementById('save-btn');
    const saveToast = document.getElementById('save-toast');
  
    // Load current settings
    loadSettings();
  
    // Event listeners
    localProcessingToggle.addEventListener('change', () => {
      apiKeyContainer.style.display = localProcessingToggle.checked ? 'none' : 'flex';
    });
  
    clearDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
        chrome.storage.sync.clear(() => {
          loadSettings(); // Reload with defaults
          showToast('All data has been cleared');
        });
      }
    });
  
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all settings to default values?')) {
        initializeDefaultSettings(() => {
          loadSettings();
          showToast('Settings reset to defaults');
        });
      }
    });
  
    saveBtn.addEventListener('click', saveSettings);
  
    // Functions
    function loadSettings() {
      chrome.storage.sync.get({
        // Appearance
        theme: 'light',
        fontSize: 'medium',
        highContrast: false,
        
        // Analysis
        localProcessing: true,
        apiKey: '',
        language: 'en',
        readabilityFormula: 'flesch',
        
        // Advanced
        autoAnalyze: false,
        contextMenu: true,
        usageData: false
      }, (items) => {
        // Apply loaded settings to UI
        themeSelect.value = items.theme;
        fontSizeSelect.value = items.fontSize;
        highContrastToggle.checked = items.highContrast;
        
        localProcessingToggle.checked = items.localProcessing;
        apiKeyInput.value = items.apiKey;
        apiKeyContainer.style.display = items.localProcessing ? 'none' : 'flex';
        languageSelect.value = items.language;
        readabilitySelect.value = items.readabilityFormula;
        
        autoAnalyzeToggle.checked = items.autoAnalyze;
        contextMenuToggle.checked = items.contextMenu;
        usageDataToggle.checked = items.usageData;
        
        // Apply theme to current page
        document.body.classList.toggle('dark-theme', items.theme === 'dark');
        document.body.classList.toggle('high-contrast', items.highContrast);
        document.body.dataset.fontSize = items.fontSize;
      });
    }
  
    function saveSettings() {
      const settings = {
        // Appearance
        theme: themeSelect.value,
        fontSize: fontSizeSelect.value,
        highContrast: highContrastToggle.checked,
        
        // Analysis
        localProcessing: localProcessingToggle.checked,
        apiKey: apiKeyInput.value.trim(),
        language: languageSelect.value,
        readabilityFormula: readabilitySelect.value,
        
        // Advanced
        autoAnalyze: autoAnalyzeToggle.checked,
        contextMenu: contextMenuToggle.checked,
        usageData: usageDataToggle.checked
      };
      
      chrome.storage.sync.set(settings, () => {
        showToast('Settings saved successfully');
        
        // Apply theme to current page
        document.body.classList.toggle('dark-theme', settings.theme === 'dark');
        document.body.classList.toggle('high-contrast', settings.highContrast);
        document.body.dataset.fontSize = settings.fontSize;
        
        // Update context menu setting
        chrome.runtime.sendMessage({ action: 'updateContextMenu', enabled: settings.contextMenu });
      });
    }
  
    function showToast(message) {
      saveToast.textContent = message;
      saveToast.classList.add('show');
      
      setTimeout(() => {
        saveToast.classList.remove('show');
      }, 3000);
    }
  
    function initializeDefaultSettings(callback) {
      chrome.runtime.sendMessage({ action: 'resetSettings' }, () => {
        if (callback) callback();
      });
    }
  });