const url = "http://localhost:5000";
function injectScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['inject.js'],
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  
    if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.includes("search.brave.com")) {
        if (tab.active && changeInfo.status === "complete") {
            injectScript(tabId);
        }
    }else {
        chrome.storage.local.remove('websiteName', () => {
            console.log('Website data removed from local storage');
        });
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  
  startCapturing();
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.includes("search.brave.com")) {
            injectScript(activeInfo.tabId);
        }else {
            chrome.storage.local.remove('websiteName', () => {
                console.log('Website data removed from local storage');
            });
        }
    });
});
function sendTimeDataToBackend(username, websiteName) {
    const data = {
      username: username,
      websiteName: websiteName,
      timeSpentInSeconds: 1,
      count:Number,
      list:[]
    };
  
    fetch(`${url}/api/v1/updateData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to send time data to backend");
        }
      })
      .catch((error) => {
        console.error("Error sending time data to backend:", error);
      });
  }

  function checkWebsiteCategory(username, websiteName) {
    fetch("distracting_websites.json")
      .then((response) => response.json())
      .then((data) => {
        const category = data.includes(websiteName)
          ? "distracting"
          : "non-distracting";
        sendCategoryToBackend(username, websiteName, category);
      })
      .catch((error) => {
        console.error("Error fetching website category:", error);
      });
  }
  
  function sendCategoryToBackend(username, websiteName, category) {
    const data = {
      username: username,
      websiteName: websiteName,
      category: category,
    };
  
    fetch(`${url}/api/v1/category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to send website category to backend");
        }
        return response.json();
      })
      .then((data) => {
        chrome.storage.local.set({ category: data.category});
      })
      .catch((error) => {
        console.error("Error sending website category to backend:", error);
      });
  }

function updateLoggedInContent() {
    chrome.storage.local.get(
        ["isLoggedIn", "username", "websiteName", "startTime", "category"],
        function (data) {
            const isLoggedIn = data.isLoggedIn;
            if (!isLoggedIn) {
                return;
            }

            const username = data.username;
            const websiteName = data.websiteName;
            const startTime = data.startTime;

            if (!websiteName) {
                return;
            }
            checkWebsiteCategory(username, websiteName);

            const currentTime = Math.round(Date.now() / 1000);
            const timeSpentInSeconds = currentTime - startTime;
            if (timeSpentInSeconds === 4 && data.category === "distracting") {
                showNotification(websiteName, data.category);
              }
            sendTimeDataToBackend(username, websiteName, timeSpentInSeconds);
        });
};
function showNotification(websiteName, category) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Warning: Distraction Alert!',
      message: `You are currently on ${websiteName} which is found to be ${category}.`,
    });
  }

setInterval(updateLoggedInContent, 1000);

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.remove('websiteName', () => {
        console.log('Website data removed from local storage');
    });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.remove('warningsShown', () => {
      console.log('Warning data removed from local storage');
    });
  });


  // new code

  let capturing = false;
let screenshotInterval;
let distractionAnalysis = { count: 0, list: [] };

// let url = 'http://localhost:3000/ocr';


// // Listen for messages from the popup script
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.type === 'toggleCapture') {
//         capturing = !capturing;
//         if (capturing) {
//             startCapturing();
//             chrome.runtime.sendMessage({ type: 'updateButtonLabel', label: 'Stop' });
//         } else {
//             stopCapturing();
//             chrome.runtime.sendMessage({ type: 'updateButtonLabel', label: 'Start' });
//         }
//         // Store the state of capturing in Chrome storage
//         chrome.storage.local.set({ capturing: capturing }, () => {
//             if (chrome.runtime.lastError) {
//                 console.error('Error storing capture state:', chrome.runtime.lastError.message);
//             }
//         });
//     }
// });
//=============
// chrome.tabs.onActivated.addListener((activeInfo) => {
//     startCapturing();
// });
//==========
// Your existing code goes here...

// Listen for tab activation
// chrome.tabs.onActivated.addListener(() => {
//     if (capturing) {
//         console.log("Starting capturing...");
//         startCapturing();
//     } else {
//         console.log("Capturing is already in progress.");
//     }
// });

// Function to start capturing screenshots and performing OCR
function startCapturing() {
    distractionAnalysis = { count: 0, list: [] }; // Reset distraction analysis
    setInterval(captureAndPerformOCR, 10000); // Capture every 5 seconds
    //Reset count and list every minute
    setInterval(() => {
        distractionAnalysis = { count: 0, list: [] };
    }, 60000); // Reset every minute
    // Update button label to "Stop"
    // updateButtonLabel('Stop');
}

// Function to stop capturing screenshots and performing OCR
// function stopCapturing() {
//     clearInterval(screenshotInterval);
//     capturing = false;
//     // Update button label to "Start"
//     updateButtonLabel('Start');
// }

// Function to update the button label in the popup UI
// function updateButtonLabel(label) {
//     chrome.runtime.sendMessage({ type: 'updateButtonLabel', label: label });
// }

// Your other functions (captureScreenshot, performOCR, analyzeAndNotify, showNotification) go here...



    async function captureScreenshot() {
        return new Promise((resolve, reject) => {
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(dataUrl);
                }
            });
        });
    }

    // Function to perform OCR on the captured screenshot
    async function performOCR(imageData) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/ocr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imageData })
            });
            const { text } = await response.json();
            return text;
        } catch (error) {
            throw new Error('Error performing OCR: ' + error.message);
        }
    }

    // Capture screenshot and perform OCR
    async function captureAndPerformOCR() {
        try {
            const screenshotDataUrl = await captureScreenshot();
            const text = await performOCR(screenshotDataUrl);
            analyzeAndNotify(text);
        } catch (error) {
            console.error('Error performing OCR:', error.message);
        }
    }

    // Function to analyze distracting content and send notifications
    // function analyzeAndNotify(text) {
    //     const processedText = removePrepositions(text);
    //     const analysis = analyzeDistractions(processedText);
        
    //     // Update distraction analysis
    //     distractionAnalysis.count += analysis.count;
    //     distractionAnalysis.list.push(...analysis.list);
    //     chrome.storage.local.set({ distractionAnalysis }, () => {
    //         if (chrome.runtime.lastError) {
    //             console.error('Error storing distraction analysis:', chrome.runtime.lastError.message);
    //         }
    //     });
    //     // Send message to update UI
    //     chrome.runtime.sendMessage({ type: 'updateDistractingWords', data: distractionAnalysis });

    //     // Check if count exceeds threshold
    //     if (distractionAnalysis.count == 3  ) {
    //         showNotification('Distracting Words console.log', 'More than 3 distracting words found!');
    //     }
    // }/

  //   function analyzeAndNotify(text) {
  //     const processedText = removePrepositions(text);
  //     const analysis = analyzeDistractions(processedText);
  //     console.log(analysis)
  //     // Update distraction analysis
  //     distractionAnalysis.count += analysis.count;
  //     distractionAnalysis.list.push(...analysis.list);
      
  //     // Save analysis result to a text file
  //     const fileContent = `Distraction Count: ${distractionAnalysis.count}\nDistraction List: ${distractionAnalysis.list.join(', ')}`;
  //     const blob = new Blob([fileContent], { type: 'text/plain' });
  //     const url = URL.createObjectURL(blob);
  
  //     // Create a link element to trigger download
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'distraction_analysis.txt';
  //     a.click();
  
  //     // Send message to update UI
  //     chrome.runtime.sendMessage({ type: 'updateDistractingWords', data: distractionAnalysis });
  
  //     // Check if count exceeds threshold
  //     if (distractionAnalysis.count >= 3) {
  //         showNotification('Distracting Words Found', 'More than 3 distracting words found!');
  //     }
  // }
  function analyzeAndNotify(text) {
    const processedText = removePrepositions(text);
    const analysis = analyzeDistractions(processedText);
    
    // Update distraction analysis
    distractionAnalysis.count += analysis.count;
    distractionAnalysis.list.push(...analysis.list);
    chrome.storage.local.set({ distractionAnalysis }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error storing distraction analysis:', chrome.runtime.lastError.message);
        }
    });
    // Send message to update UI
    chrome.runtime.sendMessage({ type: 'updateDistractingWords', data: distractionAnalysis });

    // Check if count exceeds threshold
    if (distractionAnalysis.count == 3  ) {
        showNotification('Distracting Words console.log', 'More than 3 distracting words found!');
    }
}
  

    // Function to show notification
    function showNotification(title, message) {
        const notificationOptions = {
            type: 'basic',
            iconUrl: 'icon.jpg',
            title: title,
            message: message
        };

        chrome.notifications.create(notificationOptions, () => {
            if (chrome.runtime.lastError) {
                console.error('Error creating notification:', chrome.runtime.lastError.message);
            }
        });
    }


function removePrepositions(text) {
  // Your logic for removing prepositions from the text
  const prepositionsSet = new Set([ 
      // Articles
      "a", "an", "the",
    
      // Prepositions
      "about", "above", "across", "after", "against", "along", "among", "around", "at", "before", "behind",
      "below", "beneath", "beside", "between", "beyond", "but", "by", "for", "from", "in", "inside", "into",
      "of", "off", "on", "onto", "out", "outside", "over", "past", "since", "through", "throughout", "till", "to",
      "toward", "towards", "under", "underneath", "until", "up", "upon", "with", "within", "without",
    
      // Conjunctions
      "and", "but", "or", "nor", "so", "for", "yet",
    
      // Pronouns
      "I","i", "me", "my", "mine", "you", "your", "yours", "yourself", "he", "him", "his", "himself", "she", "her",
      "hers", "herself", "it", "its", "itself", "we", "us", "our", "ours", "ourselves", "you", "your", "yours",
      "yourselves", "they", "them", "their", "theirs", "themselves", "what", "which", "that", "who", "whom", "whose",
    
      // Verbs (general)
      "be", "to be", "am", "is", "are", "was", "were", "been", "have", "has", "had", "having", "do", "does", "did",
      "doing", "say", "says", "said", "saying",
    
      // Modal Verbs
      "can", "just", "could", "may", "might", "must", "shall", "should", "will", "would",
    
      // Auxiliary Verbs
      "have", "has", "had", "having", "do", "does", "did", "doing", "be", "being", "been",
    
      // Articles and Quantifiers
      "a", "an", "the", "some", "any", "every", "all", "no", "much", "many", "more", "most", "few", "little",
      "less", "least", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
      "hundred", "thousand", "million",
    
      // Question Words
      "who", "what", "when", "where", "why", "how",
    
      // Interjections (example list)
      "oh", "ah", "wow", "ouch", "hey", "hello", "goodbye",
    
      // Negation
      "not", "no", "never", "nobody", "none", "nothing", "nowhere", "nowadays",
    
      // Numbers (written out)
      "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
      "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
    
      // Punctuation (common examples)
      ",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "[", "]", "{", "}",
    
      // Abbreviations and Acronyms (example list)
      "USA", "NATO", "FBI", "ASAP", "FYI", "etc.",
    
      // Foreign Words and Phrases (example list)
      "bon appétit", "c'est la vie",
    
      // Slang and Informal Language (example list)
      "bruh", "lmao", "tbh", "idk", "yolo",
    
      // Dates and Times (example formats)
      "Monday", "July 4, 2024", "2:30 PM",
    
      // Website URLs and Email Addresses (placeholders)
      "https://www-example-com.cdn.ampproject.org/c/www.example.com/", "[email protected]",
    
      // File Names and Paths (example formats)
      "document.txt", "C:/Users/john.doe/Documents",
    
      // Industry-Specific Terms (replace with terms relevant to your domain)
      "your industry term 1",
    
    ]);
    
    // Regular expression for efficient word splitting (handles punctuation and apostrophes)
    const wordRegex = /\b[^,;:()\s\.]+\b/gi;
    
  const filteredWords = [];
  
  // Split text into words using the efficient regex
  for (const word of text.matchAll(wordRegex)) {
      const lowerWord = word[0].toLowerCase();  // Convert to lowercase for case-insensitive comparison
      if (!prepositionsSet.has(lowerWord)) {  // Check if word is not a preposition using Set
      filteredWords.push(word[0]);
      }
  }
    
  return filteredWords.join(" ");
}




function analyzeDistractions(processedText) {
  const distractingKeywords = {
      socialMedia: ["facebook", "instagram", "twitter", "snapchat", "tiktok"],
      gaming: ["fortnite", "minecraft", "call of duty", "league of legends", "candy crush"],
      entertainment: ["youtube", "netflix", "hulu", "spotify", "twitch"],
      news: ["cnn", "bbc", "new york times", "the guardian", "fox news"],
      shopping: ["amazon", "ebay", "alibaba", "walmart", "target"],
      productivityTools: ["google", "microsoft", "trello", "slack", "evernote"],
      educational: ["khan academy", "coursera", "udemy", "edX", "codecademy"]
  };

  const distractingWords = [];
  const lowercaseText = processedText.toLowerCase();

  for (const category in distractingKeywords) {
      const pattern = distractingKeywords[category].join('|');
      const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
      const matches = lowercaseText.matchAll(regex);
      for (const match of matches) {
          distractingWords.push(match[0]);
      }
  }

  return {
      count: distractingWords.length,
      list: distractingWords
  };
}

