// // Listen for toggle button click
// document.getElementById('toggleButton').addEventListener('click', () => {
//     chrome.runtime.sendMessage({ type: 'toggleCapture' });
//   });
  //     // Listen for messages from background script to update button label
  // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //       if (message.type === 'updateButtonLabel') {
  //           const buttonLabel = message.label;
  //           document.getElementById('toggleButton').textContent = buttonLabel;
  //       }
  //   });
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateDistractingWords') {
      if (!document.hidden) {
        updateUI(message.data);
    }
  }
  });
  
  // Function to update UI elements with distracting words count and list
  function updateUI(distractionAnalysis) {
    // Update distracting words count
    const distractingWordsCountElement = document.getElementById('distracting-words-count');
    distractingWordsCountElement.textContent = `Distracting Words Count: ${distractionAnalysis.count}`;
  
    // Update distracting words list
    const distractingWordsListElement = document.getElementById('distracting-words-list');
    distractingWordsListElement.textContent = distractionAnalysis.list.join(', ');
  }