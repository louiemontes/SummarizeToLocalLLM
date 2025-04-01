// Main content script for the extension
// This runs in the context of web pages

// Default configuration
let config = {
  llmEndpoint: "http://localhost:1234/v1/chat/completions",
  systemPrompt:
    "You are a helpful assistant analyzing webpage content. Please summarize this information concisely.",
  floatingButtonPosition: "bottom-right",
  maxTokens: 2048,
  temperature: 0.7,
};

// Load configuration from storage
chrome.storage.sync.get("llmConfig", (data) => {
  if (data.llmConfig) {
    config = { ...config, ...data.llmConfig };
  }
  initializeExtension();
});

// Create the floating extract button
function createFloatingButton() {
  const button = document.createElement("button");
  button.textContent = "🤖 Extract & Analyze";
  button.id = "llm-extractor-button";

  // Position the button according to the configuration
  switch (config.floatingButtonPosition) {
    case "top-left":
      button.classList.add("top-left");
      break;
    case "top-right":
      button.classList.add("top-right");
      break;
    case "bottom-left":
      button.classList.add("bottom-left");
      break;
    case "bottom-right":
    default:
      button.classList.add("bottom-right");
      break;
  }

  // Add click handler
  button.addEventListener("click", handleExtractAndAnalyze);

  document.body.appendChild(button);
  return button;
}

// Create modal for displaying results
function createResultModal() {
  const modal = document.createElement("div");
  modal.id = "llm-result-modal";

  const modalContent = document.createElement("div");
  modalContent.id = "llm-modal-content";

  const modalHeader = document.createElement("div");
  modalHeader.id = "llm-modal-header";

  const modalTitle = document.createElement("h3");
  modalTitle.textContent = "LLM Analysis Result";

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.id = "llm-modal-close";
  closeButton.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);

  const contentArea = document.createElement("div");
  contentArea.id = "llm-result-content";

  const copyButton = document.createElement("button");
  copyButton.textContent = "Copy to Clipboard";
  copyButton.id = "llm-copy-button";
  copyButton.addEventListener("click", () => {
    const resultContent = document.getElementById("llm-result-content");
    const text = resultContent.querySelector("div").textContent;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "Copy to Clipboard";
        }, 2000);
      })
      .catch((err) => {
        console.error("Error copying text: ", err);
        copyButton.textContent = "Failed to copy";
        setTimeout(() => {
          copyButton.textContent = "Copy to Clipboard";
        }, 2000);
      });
  });

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(contentArea);
  modalContent.appendChild(copyButton);
  modal.appendChild(modalContent);

  document.body.appendChild(modal);
  return modal;
}

// Extract the main content from the webpage
function extractPageContent() {
  // Priority areas to extract from
  const contentSelectors = [
    "article",
    "main",
    ".content",
    ".article",
    ".post",
    ".main-content",
    "#content",
    "#main-content",
  ];

  let contentElement = null;

  // Try to find content using selectors
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 300) {
      contentElement = element;
      break;
    }
  }

  // If no specific content area found, extract from body
  if (!contentElement) {
    contentElement = document.body;
  }

  // Extract text content
  let text = "";

  // Get title
  const title = document.title;
  text += `Title: ${title}\n\n`;

  // Try to get metadata description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && metaDescription.getAttribute("content")) {
    text += `Description: ${metaDescription.getAttribute("content")}\n\n`;
  }

  // Current URL
  text += `URL: ${window.location.href}\n\n`;

  // Extract main content
  text += `Content:\n${extractTextFromElement(contentElement)}\n`;

  return text;
}

// Helper function to extract text from DOM elements
function extractTextFromElement(element) {
  // Skip hidden elements
  if (element.offsetParent === null && element.tagName !== "BODY") {
    return "";
  }

  // Skip common non-content elements
  const skipTags = ["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "NAV", "FOOTER"];
  if (skipTags.includes(element.tagName)) {
    return "";
  }

  // Skip elements that might be navigation, footers, sidebars, etc.
  const skipClasses = [
    "nav",
    "navigation",
    "menu",
    "sidebar",
    "footer",
    "comment",
    "ad",
    "advertisement",
  ];
  if (element.className && typeof element.className === "string") {
    const classNames = element.className.split(" ");
    for (const cls of classNames) {
      if (
        skipClasses.some((skipClass) => cls.toLowerCase().includes(skipClass))
      ) {
        return "";
      }
    }
  }

  // If it's a text node, return its text
  if (element.nodeType === Node.TEXT_NODE) {
    const text = element.textContent.trim();
    return text ? text + " " : "";
  }

  // Handle headings with special formatting
  if (["H1", "H2", "H3", "H4", "H5", "H6"].includes(element.tagName)) {
    const headingLevel = parseInt(element.tagName[1]);
    const prefix = "#".repeat(headingLevel);
    return `\n\n${prefix} ${element.textContent.trim()}\n\n`;
  }

  // Handle paragraphs and line breaks
  if (element.tagName === "P") {
    return `\n${element.textContent.trim()}\n`;
  }

  if (element.tagName === "BR") {
    return "\n";
  }

  if (element.tagName === "LI") {
    return `\n- ${element.textContent.trim()}`;
  }

  // Recursively extract text from child nodes
  let result = "";
  for (const child of element.childNodes) {
    result += extractTextFromElement(child);
  }

  return result;
}

// Send extracted text to the LLM server
async function sendToLLM(extractedText) {
  const requestBody = {
    model: "local-model",
    messages: [
      {
        role: "system",
        content: config.systemPrompt,
      },
      {
        role: "user",
        content: extractedText,
      },
    ],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  };

  try {
    // Send message to background script to make the actual API call
    // This is needed to bypass CORS restrictions
    const response = await chrome.runtime.sendMessage({
      action: "sendToLLM",
      data: {
        endpoint: config.llmEndpoint,
        requestBody: requestBody,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.content;
  } catch (error) {
    console.error("Error sending data to LLM:", error);
    throw error;
  }
}

// Handle the extraction and analysis process
async function handleExtractAndAnalyze() {
  try {
    // Show loading state
    const button = document.getElementById("llm-extractor-button");
    const originalText = button.textContent;
    button.textContent = "Processing...";
    button.disabled = true;

    // Extract content
    const extractedText = extractPageContent();

    // Send to LLM
    const llmResponse = await sendToLLM(extractedText);

    // Display result
    displayResult(llmResponse);

    // Reset button
    button.textContent = originalText;
    button.disabled = false;
  } catch (error) {
    console.error("Error in extract and analyze process:", error);

    // Display error
    displayResult(`Error: ${error.message || error}`);

    // Reset button
    const button = document.getElementById("llm-extractor-button");
    button.textContent = "🤖 Extract & Analyze";
    button.disabled = false;
  }
}

// Display the result in the modal
function displayResult(content) {
  const modal =
    document.getElementById("llm-result-modal") || createResultModal();
  const contentArea = document.getElementById("llm-result-content");

  // Clear previous content
  contentArea.innerHTML = "";

  // Create pre-formatted text area
  const formattedContent = document.createElement("div");
  formattedContent.style.whiteSpace = "pre-wrap";
  formattedContent.textContent = content;

  contentArea.appendChild(formattedContent);

  // Show modal
  modal.classList.add("show");
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateConfig") {
    config = { ...config, ...message.config };
    sendResponse({ status: "Config updated" });
  }

  if (message.action === "extractContent") {
    const extractedText = extractPageContent();
    sendResponse({ content: extractedText });
  }

  return true;
});

// Initialize the extension components
function initializeExtension() {
  // Create the button and modal
  if (!document.getElementById("llm-extractor-button")) {
    createFloatingButton();
  }

  if (!document.getElementById("llm-result-modal")) {
    createResultModal();
  }

  console.log("Web Content to Local LLM extension initialized");
}
