// Global variables
let isProcessing = false;
let documentText = '';
let documentNodes = [];
let documentAnalysis = null;
let summaryPanel = null;

// Legal jargon dictionary (simplified example)
const legalTerms = {
  'hereinafter': 'from now on',
  'whereof': 'of which',
  'thereafter': 'after that',
  'aforementioned': 'previously mentioned',
  'party of the first part': 'the first person named',
  'party of the second part': 'the second person named',
  'notwithstanding': 'despite',
  'prima facie': 'at first sight',
  'inter alia': 'among other things',
  'force majeure': 'unforeseeable circumstances',
  'mutatis mutandis': 'with necessary changes',
  'sui generis': 'unique',
  'bona fide': 'genuine',
  'quid pro quo': 'something for something',
  'pro rata': 'proportionally',
  'ab initio': 'from the beginning',
  'de facto': 'in fact',
  'de jure': 'by law',
  'per se': 'by itself',
  'sine qua non': 'essential condition',
  'res ipsa loquitur': 'the thing speaks for itself',
  'caveat emptor': 'buyer beware',
  'et al': 'and others',
  'in lieu of': 'instead of',
  'in perpetuity': 'forever',
  'forthwith': 'immediately',
  'heretofore': 'until now',
  'wherein': 'in which',
  'whereas': 'considering that',
  'therein': 'in that place',
  'hereby': 'by this',
  'thereto': 'to that',
  'null and void': 'invalid',
  'indemnify': 'protect from loss',
  'liquidated damages': 'predetermined compensation',
  'covenant': 'formal agreement',
  'waiver': 'voluntary giving up of rights',
  'jurisdiction': 'legal authority',
  'tort': 'civil wrong',
  'execute': 'sign or complete',
  'termination': 'ending',
  'pursuant to': 'according to',
  'shall': 'must'
};

// Important clause patterns
const importantPatterns = [
  /termination|cancel|renewal/i,
  /compensation|payment|fee|charge/i,
  /confidential|proprietary|secret/i,
  /liability|damages|indemnification|indemnify/i,
  /intellectual property|copyright|patent|trademark/i,
  /warranty|warranties|guarantees|representations/i,
  /jurisdiction|venue|governing law|arbitration|mediation/i,
  /time (is|shall be) of the essence/i,
  /amendment|modification|alteration/i,
  /assign|assignment|transfer/i,
  /term|duration|period/i,
  /force majeure|act of god/i,
  /entire agreement|integration/i,
  /severability|savings clause/i,
  /non-compete|noncompete|not compete/i,
  /non-disclosure|confidentiality/i,
  /limitation of liability|limit liability/i,
  /conflict of interest/i,
  /breach|default|remedy/i,
  /notice|notification/i
];

// Potential issue patterns
const issuePatterns = [
  {
    pattern: /perpetual|perpetuity|infinite|unlimited|forever/i,
    title: 'Perpetual Obligation',
    description: 'This clause creates an obligation with no time limit.'
  },
  {
    pattern: /waive|waiver|waives|waiving|relinquish/i,
    title: 'Rights Waiver',
    description: 'You may be giving up important rights.'
  },
  {
    pattern: /all\s+rights|exclusive\s+rights|all\s+intellectual\s+property|all\s+IP/i,
    title: 'Broad Rights Transfer',
    description: 'This grants broad or all rights to the other party.'
  },
  {
    pattern: /indemnify|indemnification|hold\s+harmless|defend/i,
    title: 'Indemnification',
    description: 'You may be responsible for legal costs or damages.'
  },
  {
    pattern: /no\s+liability|not\s+be\s+liable|zero\s+liability/i,
    title: 'Liability Limitation',
    description: 'The other party is limiting their responsibility.'
  },
  {
    pattern: /mandatory\s+arbitration|binding\s+arbitration|waive\s+right\s+to\s+sue/i,
    title: 'Mandatory Arbitration',
    description: 'You may be giving up your right to sue in court.'
  },
  {
    pattern: /unilateral|sole\s+discretion|absolute\s+discretion/i,
    title: 'Unilateral Power',
    description: 'The other party can make decisions without your input.'
  },
  {
    pattern: /liquidated\s+damages|penalty/i,
    title: 'Financial Penalty',
    description: 'Specific financial penalties for certain actions.'
  },
  {
    pattern: /auto.renewal|automatic.renewal|automatically\s+renew/i,
    title: 'Auto-Renewal',
    description: 'Contract will automatically renew without action.'
  },
  {
    pattern: /non.compete|noncompete|not\s+to\s+compete/i,
    title: 'Non-Compete',
    description: 'Restrictions on your future business activities.'
  }
];

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyze') {
    if (isProcessing) {
      sendResponse({ error: 'Already processing a document' });
      return true;
    }
    
    analyzeDocument(message.options)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ error: 'Failed to analyze document' });
      });
    
    return true; // Keep channel open for async response
  }
  
  return false;
});

// Main analysis function
async function analyzeDocument(options) {
  try {
    isProcessing = true;
    showProcessingOverlay();
    
    // Extract document text
    documentText = extractTextFromPage();
    documentNodes = getTextNodes();
    
    if (!documentText || documentText.length < 100) {
      throw new Error('No valid document text found on this page');
    }
    
    // Perform basic text analysis
    documentAnalysis = await analyzeText(documentText);
    
    // Apply visual enhancements based on options
    if (options.highlightImportant) {
      highlightImportantClauses();
    }
    
    if (options.simplifyLanguage) {
      simplifyLegalLanguage();
    }
    
    if (options.flagIssues) {
      flagPotentialIssues();
    }
    
    if (options.showSummary) {
      showDocumentSummary();
    }
    
    return {
      success: true,
      stats: {
        importantClauses: documentAnalysis.importantClauses.length,
        potentialIssues: documentAnalysis.potentialIssues.length,
        readabilityScore: documentAnalysis.readabilityScore
      },
      summary: generateSummaryHTML()
    };
  } catch (error) {
    console.error('Analysis error:', error);
    return { error: error.message };
  } finally {
    isProcessing = false;
    removeProcessingOverlay();
  }
}

// Extract text from the current page
function extractTextFromPage() {
  // Check if this is a PDF embedded in an iframe
  const pdfEmbeds = document.querySelectorAll('embed[type="application/pdf"], object[type="application/pdf"]');
  if (pdfEmbeds.length > 0) {
    return 'PDF document detected. Please use the extension on the direct PDF URL.';
  }
  
  // For regular HTML content
  const bodyText = document.body.innerText;
  
  // If the text is very short, try to find the main content
  if (bodyText.length < 1000) {
    const mainContent = document.querySelector('main, article, .content, #content, .main');
    if (mainContent) {
      return mainContent.innerText;
    }
  }
  
  return bodyText;
}

// Get all text nodes from the document
function getTextNodes() {
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip empty nodes and nodes with only whitespace
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip nodes in scripts, styles, etc.
        const parent = node.parentElement;
        if (parent && (
          parent.tagName === 'SCRIPT' || 
          parent.tagName === 'STYLE' || 
          parent.tagName === 'NOSCRIPT' || 
          parent.tagName === 'SVG'
        )) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let currentNode;
  while (currentNode = walker.nextNode()) {
    if (currentNode.textContent.trim().length > 10) {
      textNodes.push({
        node: currentNode,
        text: currentNode.textContent,
        parentElement: currentNode.parentElement
      });
    }
  }
  
  return textNodes;
}

// Analyze the extracted text
async function analyzeText(text) {
  // For a real implementation, this function might call an API
  // This is a simplified version for demonstration
  
  // Calculate readability (simplified Flesch-Kincaid)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  const syllables = countSyllables(text);
  
  const asl = words.length / sentences.length; // Average Sentence Length
  const asw = syllables / words.length; // Average Syllables per Word
  
  // Simplified Flesch Reading Ease calculation
  const readabilityScore = 206.835 - (1.015 * asl) - (84.6 * asw);
  const adjustedScore = Math.min(Math.max(readabilityScore, 0), 100);
  
  // Find important clauses
  const importantClauses = [];
  sentences.forEach(sentence => {
    importantPatterns.forEach(pattern => {
      if (pattern.test(sentence) && !importantClauses.includes(sentence)) {
        importantClauses.push(sentence);
      }
    });
  });
  
  // Find potential issues
  const potentialIssues = [];
  sentences.forEach(sentence => {
    issuePatterns.forEach(issue => {
      if (issue.pattern.test(sentence)) {
        potentialIssues.push({
          sentence: sentence,
          title: issue.title,
          description: issue.description
        });
      }
    });
  });
  
  // Identify legal terms to simplify
  const legalJargon = [];
  Object.keys(legalTerms).forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(text)) {
      legalJargon.push({
        term: term,
        simplified: legalTerms[term]
      });
    }
  });
  
  // Generate summary (simplified version)
  const documentType = determineDocumentType(text);
  const keyTopics = extractKeyTopics(text);
  
  return {
    readabilityScore: adjustedScore,
    documentType: documentType,
    keyTopics: keyTopics,
    importantClauses: importantClauses,
    potentialIssues: potentialIssues,
    legalJargon: legalJargon
  };
}

// Helper function to count syllables (simplified)
function countSyllables(text) {
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  let count = 0;
  
  words.forEach(word => {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return;
    
    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g);
    if (!vowelGroups) {
      count += 1;
      return;
    }
    
    let syllableCount = vowelGroups.length;
    
    // Subtract silent 'e' at the end
    if (word.length > 2 && word.endsWith('e') && !/[aeiouy]e$/.test(word)) {
      syllableCount--;
    }
    
    // Make sure each word has at least one syllable
    count += Math.max(syllableCount, 1);
  });
  
  return count;
}

// Determine document type based on text patterns
function determineDocumentType(text) {
  text = text.toLowerCase();
  
  if (/agreement|contract|between the parties/.test(text)) {
    if (/employment|hire|salary|compensation|job|position/.test(text)) {
      return 'Employment Contract';
    } else if (/lease|rent|tenant|landlord|property/.test(text)) {
      return 'Lease Agreement';
    } else if (/nda|non-disclosure|confidential information/.test(text)) {
      return 'Non-Disclosure Agreement';
    } else if (/purchase|sale|buyer|seller/.test(text)) {
      return 'Purchase Agreement';
    } else if (/service|provider|client/.test(text)) {
      return 'Service Agreement';
    } else {
      return 'General Contract';
    }
  } else if (/terms\s+of\s+(use|service)|conditions|privacy policy/.test(text)) {
    return 'Terms of Service';
  } else if (/policy|policies/.test(text)) {
    return 'Policy Document';
  } else if (/license|licensee|licensor|permission to use/.test(text)) {
    return 'License Agreement';
  }
  
  return 'Legal Document';
}

// Extract key topics from the text
function extractKeyTopics(text) {
  const topics = [];
  
  const topicPatterns = [
    { name: 'Payment Terms', pattern: /payment|fee|compensation|cost|price|rate/i },
    { name: 'Confidentiality', pattern: /confidential|secret|proprietary|non-disclosure/i },
    { name: 'Termination', pattern: /termination|terminate|cancel|end the agreement/i },
    { name: 'Intellectual Property', pattern: /intellectual property|copyright|trademark|patent/i },
    { name: 'Liability', pattern: /liability|responsible|indemnification|indemnify|hold harmless/i },
    { name: 'Dispute Resolution', pattern: /dispute|arbitration|mediation|litigation|court/i },
    { name: 'Warranty', pattern: /warranty|guarantee|assurance|representation/i },
    { name: 'Data Privacy', pattern: /data|privacy|personal information|GDPR|CCPA/i }
  ];
  
  topicPatterns.forEach(topic => {
    if (topic.pattern.test(text)) {
      topics.push(topic.name);
    }
  });
  
  return topics;
}

// Highlight important clauses in the document
function highlightImportantClauses() {
  if (!documentNodes || !documentAnalysis) return;
  
  documentAnalysis.importantClauses.forEach(clause => {
    highlightText(clause, 'lda-important', 'Important Clause');
  });
}

// Add simplified language tooltips
function simplifyLegalLanguage() {
  if (!documentNodes || !documentAnalysis) return;
  
  documentAnalysis.legalJargon.forEach(item => {
    const term = item.term;
    const simplified = item.simplified;
    
    documentNodes.forEach(nodeInfo => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      
      if (regex.test(nodeInfo.text)) {
        const parent = nodeInfo.parentElement;
        const text = nodeInfo.node.textContent;
        
        let newHtml = text.replace(regex, match => {
          return `<span class="lda-tooltip">${match}<span class="lda-tooltip-text">Simplified: "${simplified}"</span></span>`;
        });
        
        // Create a temporary element to hold the new HTML
        const temp = document.createElement('span');
        temp.innerHTML = newHtml;
        
        // Replace the text node with our new content
        parent.replaceChild(temp, nodeInfo.node);
      }
    });
  });
}

// Flag potential issues in the document
function flagPotentialIssues() {
  if (!documentNodes || !documentAnalysis) return;
  
  documentAnalysis.potentialIssues.forEach(issue => {
    highlightText(issue.sentence, 'lda-issue', `${issue.title}: ${issue.description}`);
  });
}

// Helper function to highlight text in the document
function highlightText(text, className, tooltipText) {
  documentNodes.forEach(nodeInfo => {
    const nodeText = nodeInfo.text;
    
    if (nodeText.includes(text)) {
      const parent = nodeInfo.parentElement;
      const originalText = nodeInfo.node.textContent;
      
      // Create highlighted version
      let newHtml = originalText.replace(
        text, 
        `<span class="${className} lda-tooltip">${text}<span class="lda-tooltip-text">${tooltipText}</span></span>`
      );
      
      // Create a temporary element to hold the new HTML
      const temp = document.createElement('span');
      temp.innerHTML = newHtml;
      
      // Replace the text node with our new content
      parent.replaceChild(temp, nodeInfo.node);
      
      // Update our node reference as it's been replaced
      nodeInfo.node = temp;
    }
  });
}

// Show document summary panel
function showDocumentSummary() {
  if (!documentAnalysis) return;
  
  // Remove existing panel if present
  if (summaryPanel) {
    document.body.removeChild(summaryPanel);
  }
  
  // Create summary panel
  summaryPanel = document.createElement('div');
  summaryPanel.className = 'lda-summary-panel';
  summaryPanel.innerHTML = generateSummaryHTML();
  
  // Add close button functionality
  document.body.appendChild(summaryPanel);
  
  const closeBtn = summaryPanel.querySelector('.lda-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(summaryPanel);
      summaryPanel = null;
    });
  }
}

// Generate HTML for the summary
function generateSummaryHTML() {
  if (!documentAnalysis) return '';
  
  const readabilityPercentage = Math.round(documentAnalysis.readabilityScore);
  
  let html = `
    <div class="lda-panel-header">
      <div class="lda-panel-title">Document Analysis</div>
      <button class="lda-close-btn">×</button>
    </div>
    
    <div class="lda-section">
      <div class="lda-section-title">Document Type</div>
      <div>${documentAnalysis.documentType}</div>
    </div>
    
    <div class="lda-section">
      <div class="lda-section-title">Readability</div>
      <div class="lda-readability-meter">
        <div class="lda-readability-fill" style="width: ${readabilityPercentage}%"></div>
      </div>
      <div>${readabilityLevelText(documentAnalysis.readabilityScore)}</div>
    </div>
    
    <div class="lda-section">
      <div class="lda-section-title">Key Topics</div>
      <div>
  `;
  
  documentAnalysis.keyTopics.forEach(topic => {
    html += `<span class="lda-tag">${topic}</span> `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  if (documentAnalysis.potentialIssues.length > 0) {
    html += `
      <div class="lda-section">
        <div class="lda-section-title">Potential Issues (${documentAnalysis.potentialIssues.length})</div>
    `;
    
    documentAnalysis.potentialIssues.slice(0, 5).forEach(issue => {
      html += `
        <div class="lda-issue-item">
          <div class="lda-issue-title">${issue.title}</div>
          <div class="lda-issue-desc">${issue.description}</div>
        </div>
      `;
    });
    
    if (documentAnalysis.potentialIssues.length > 5) {
      html += `<div>+ ${documentAnalysis.potentialIssues.length - 5} more issues</div>`;
    }
    
    html += `</div>`;
  }
  
  html += `
    <div class="lda-section">
      <div class="lda-section-title">Important Clauses</div>
      <div>${documentAnalysis.importantClauses.length} important clauses identified</div>
    </div>
  `;
  
  return html;
}

// Convert readability score to text
function readabilityLevelText(score) {
  if (score < 30) return 'Very Complex';
  if (score < 50) return 'Complex';
  if (score < 70) return 'Moderate';
  if (score < 90) return 'Simple';
  return 'Very Simple';
}

// Show processing overlay
function showProcessingOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'lda-overlay';
  overlay.id = 'lda-processing-overlay';
  
  overlay.innerHTML = `
    <div class="lda-processing">
      <div>Analyzing legal document...</div>
      <div class="loader" style="margin: 10px auto;"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

// Remove processing overlay
function removeProcessingOverlay() {
  const overlay = document.getElementById('lda-processing-overlay');
  if (overlay) {
    document.body.removeChild(overlay);
  }
}