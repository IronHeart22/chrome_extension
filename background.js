// Listen for a message from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_page_data") {
    // Get the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        // Execute the content script in the active tab
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        }, () => {
          // After the script is injected, send a message to it to start scraping
          chrome.tabs.sendMessage(activeTab.id, { action: "scrape_data" }, (response) => {
            if (chrome.runtime.lastError) {
              // Handle potential errors, e.g., if the content script can't be reached
              console.error("Error sending message to content script:", chrome.runtime.lastError.message);
              sendResponse({ error: "Could not connect to the page. Try refreshing." });
            } else {
              // Forward the scraped data back to the popup
              sendResponse(response);
            }
          });
        });
      } else {
        sendResponse({ error: "No active tab found." });
      }
    });
    // Return true to indicate that we will send a response asynchronously
    return true;
  }
});