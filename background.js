// Background script for the extension
// Handles API calls to the LLM server to avoid CORS issues

// Listen for messages from content or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle LLM API requests
  if (request.action === "sendToLLM") {
    sendToLLM(request.data)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });

    return true; // Indicates we will respond asynchronously
  }

  // Handle getting active tab info
  if (request.action === "getActiveTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        sendResponse({ tab: tabs[0] });
      } else {
        sendResponse({ error: "No active tab found" });
      }
    });

    return true; // Indicates we will respond asynchronously
  }
});

// Send data to the LLM server
async function sendToLLM(data) {
  try {
    const response = await fetch(data.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data.requestBody),
    });

    if (!response.ok) {
      throw new Error(`LLM server responded with status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData.choices && responseData.choices.length > 0) {
      return { content: responseData.choices[0].message.content };
    } else {
      throw new Error("Invalid response format from LLM");
    }
  } catch (error) {
    console.error("Error in sendToLLM:", error);
    throw error;
  }
}

// Initialize default configuration on extension install
chrome.runtime.onInstalled.addListener(async () => {
  // Set default configuration
  const defaultConfig = {
    llmEndpoint: "http://localhost:1234/v1/chat/completions",
    systemPrompt:
      "You are a helpful assistant analyzing webpage content. Please summarize this information concisely.",
    floatingButtonPosition: "bottom-right",
    maxTokens: 2048,
    temperature: 0.7,
  };

  // Save to storage
  await chrome.storage.sync.set({ llmConfig: defaultConfig });

  console.log(
    "Web Content to Local LLM extension installed with default configuration"
  );
});
