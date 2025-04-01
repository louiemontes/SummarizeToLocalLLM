// Popup script for the extension
document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const llmStatusElement = document.getElementById("llm-status");
  const extractButton = document.getElementById("extract-button");
  const settingsForm = document.getElementById("settings-form");
  const systemPromptElement = document.getElementById("system-prompt");
  const saveButton = document.getElementById("save-button");
  const resetButton = document.getElementById("reset-button");
  const temperatureRange = document.getElementById("temperature");
  const temperatureValue = document.getElementById("temperature-value");
  const tabButtons = document.querySelectorAll(".tab-button");

  // Default configuration
  const defaultConfig = {
    llmEndpoint: "http://localhost:1234/v1/chat/completions",
    systemPrompt:
      "You are a helpful assistant analyzing webpage content. Please summarize this information concisely.",
    floatingButtonPosition: "bottom-right",
    maxTokens: 2048,
    temperature: 0.7,
  };

  let currentConfig = { ...defaultConfig };

  // Load configuration from storage
  async function loadConfig() {
    try {
      const result = await chrome.storage.sync.get("llmConfig");
      if (result.llmConfig) {
        currentConfig = { ...defaultConfig, ...result.llmConfig };
        updateFormValues();
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
    }
  }

  // Update form with current configuration values
  function updateFormValues() {
    document.getElementById("llm-endpoint").value = currentConfig.llmEndpoint;
    document.getElementById("button-position").value =
      currentConfig.floatingButtonPosition;
    document.getElementById("max-tokens").value = currentConfig.maxTokens;
    document.getElementById("temperature").value = currentConfig.temperature;
    document.getElementById("temperature-value").textContent =
      currentConfig.temperature;
    document.getElementById("system-prompt").value = currentConfig.systemPrompt;
  }

  // Save configuration to storage
  async function saveConfig() {
    try {
      await chrome.storage.sync.set({ llmConfig: currentConfig });

      // Send message to content script to update config
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs && tabs.length > 0) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          action: "updateConfig",
          config: currentConfig,
        });
      }

      // Show save confirmation
      const saveButton = document.getElementById("save-button");
      const originalText = saveButton.textContent;
      saveButton.textContent = "Saved!";
      saveButton.disabled = true;
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 1500);
    } catch (error) {
      console.error("Error saving configuration:", error);
    }
  }

  // Check LLM connection status
  async function checkLLMStatus() {
    try {
      const response = await fetch(currentConfig.llmEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "local-model",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant.",
            },
            {
              role: "user",
              content: "Ping",
            },
          ],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        llmStatusElement.textContent = "Connected";
        llmStatusElement.classList.add("connected");
        llmStatusElement.classList.remove("disconnected");
        extractButton.disabled = false;
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      console.error("LLM connection error:", error);
      llmStatusElement.textContent = "Disconnected";
      llmStatusElement.classList.add("disconnected");
      llmStatusElement.classList.remove("connected");
      extractButton.disabled = true;
    }
  }

  // Handle tab switching
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all tabs
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-pane")
        .forEach((pane) => pane.classList.remove("active"));

      // Add active class to clicked tab
      button.classList.add("active");
      document
        .getElementById(`${button.dataset.tab}-tab`)
        .classList.add("active");
    });
  });

  // Handle temperature range input
  temperatureRange.addEventListener("input", function () {
    temperatureValue.textContent = this.value;
  });

  // Handle form field changes
  document
    .querySelectorAll("#settings-form input, #settings-form select")
    .forEach((input) => {
      input.addEventListener("change", function () {
        currentConfig[this.name] =
          this.type === "number" ? parseInt(this.value) : this.value;
      });
    });

  // Handle system prompt changes
  systemPromptElement.addEventListener("change", function () {
    currentConfig.systemPrompt = this.value;
  });

  // Handle save button click
  saveButton.addEventListener("click", saveConfig);

  // Handle reset button click
  resetButton.addEventListener("click", function () {
    currentConfig = { ...defaultConfig };
    updateFormValues();
    saveConfig();
  });

  // Handle extract button click
  extractButton.addEventListener("click", async function () {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "extractContent" });
    }
  });

  // Add storage viewing functionality
  const viewStorageButton = document.getElementById("view-storage-button");
  const storageDisplay = document.getElementById("storage-display");

  viewStorageButton.addEventListener("click", function () {
    chrome.storage.sync.get(null, function (items) {
      const jsonString = JSON.stringify(items, null, 2);
      storageDisplay.textContent = jsonString;

      if (storageDisplay.style.display === "block") {
        storageDisplay.style.display = "none";
        viewStorageButton.textContent = "View Storage Data";
      } else {
        storageDisplay.style.display = "block";
        viewStorageButton.textContent = "Hide Storage Data";
      }
    });
  });

  // Initialize
  loadConfig();
  checkLLMStatus();

  // Set up periodic status check
  setInterval(checkLLMStatus, 10000);
});
