document.addEventListener('DOMContentLoaded', function () {
    const apiForm = $('#api-form');
    const startGameButton = $('#start-game');
    const loader = $('#loader');

    function showLoader() {
        loader.show();
    }

    function hideLoader() {
        loader.hide();
    }

    apiForm.on('submit', function(event) {
        event.preventDefault();
        const apiKey = $('#api-key').val();
        const playerName = $('#player-name').val();

        if (apiKey && playerName) {
            showLoader();
            validateApiKey(apiKey).then(isValid => {
                hideLoader();
                if (isValid) {
                    $('#cover-page').fadeOut(500, function() {
                        $('#game-page').fadeIn(500, function() {
                            $('#story-outline').fadeIn(500);
                        });
                    });
                } else {
                    $('#error-message').text('無效的API Key，請重新輸入。');
                }
            });
        }
    });

    startGameButton.on('click', function(event) {
        event.preventDefault();
        const apiKey = $('#api-key').val();
        const playerName = $('#player-name').val();

        if (apiKey && playerName) {
            startGame(apiKey, playerName);
            $('#story-outline').fadeOut(0, function() {
                $('#game-content').fadeIn(500);
            });
        }
    });



    function validateApiKey(apiKey) {
        const testPrompt = "測試123";
        return fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + apiKey, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{
                        "text": testPrompt
                    }]
                }],
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_NONE"
                    }
                ],
                "generationConfig": {
                    "stopSequences": [""],
                    "temperature": 0.7, 
                    "maxOutputTokens": 50, 
                    "topP": 0.9,
                    "topK": 40
                }
            })
        })
        .then(response => {
            if (response.ok) {
                return true;
            } else {
                console.error('Validation failed with status:', response.status);
                return false;
            }
        })
        .catch(error => {
            console.error('Error validating API key:', error);
            return false;
        });
    }

    function startGame(apiKey, playerName) {
        fetch('../storyline/story.json')
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Failed to fetch story script');
                }
            })
            .then(data => {
                processStoryScript(data, apiKey, playerName);
            })
            .catch(error => {
                console.error('Error fetching story script:', error);
            });
    }

    function processStoryScript(script, apiKey, playerName) {
        let currentStoryPoint = script.start;
        $('#game-content').show();
        renderStoryPoint(currentStoryPoint);
    
        function renderStoryPoint(storyPoint) {
            $('#story-text').text(storyPoint.text);
            $('#story-image').attr('src', storyPoint.image);
    
            const choicesContainer = $('#choices');
            choicesContainer.empty();
    
            storyPoint.choices.forEach(choice => {
                const button = $('<button></button>');
                button.text(choice.text);
                button.on('click', () => {
                    if (choice.next && script[choice.next] && script[choice.next].choices) {
                        showLoader();
                        fetchStoryFromGemini(script, choice.next, apiKey)
                            .then(responseText => {
                                hideLoader();
                                currentStoryPoint = {
                                    text: responseText,
                                    image: script[choice.next].image,  
                                    choices: script[choice.next].choices
                                };
                                renderStoryPoint(currentStoryPoint);
                            })
                            .catch(error => {
                                hideLoader();
                                console.error('Error fetching story from Gemini API:', error);
                            });
                    } else {
                        choicesContainer.empty();
                        const endButton = $('<button></button>').text('結束遊戲');
                        endButton.on('click', () => {
                            alert('遊戲結束！');
                        });
                        choicesContainer.append(endButton);
                    }
                });
                choicesContainer.append(button);
            });
        }
    }
    
    function fetchStoryFromGemini(script, prompt, apiKey) {
        console.log(script);
        return fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + apiKey, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{
                        "text": "腳本:" + JSON.stringify(script) + "\n" + "選擇:" + prompt + "\n" + "請根據腳本和選擇來執行遊戲，只要顯示文本就好"
                    }]
                }],
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_NONE"
                    }
                ],
                "generationConfig": {
                    "stopSequences": [""],
                    "temperature": 2.0,
                    "maxOutputTokens": 2048,
                    "topP": 0.8,
                    "topK": 10
                }
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch story from Gemini API');
            }
            console.log('Gemini API response:', response);
            return response.json();
        })
        .then(data => {
            console.log('Gemini API Response:', data);
            return data.candidates[0].content.parts[0].text;
        })
        .catch(error => {
            console.error('Error:', error);
            throw error;
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    $(document).ready(function() {
        $('#menu-btn').click(function() {
            $('#menu').toggle();
        });
    
        $('#back-to-cover').click(function() {
            window.location.reload();
        });
    });
});


//序章
document.addEventListener('DOMContentLoaded', function() {
    const gameVisual = document.getElementById('game-visual');
    const prologuePage = document.getElementById('prologue-page');
    const coverPage = document.getElementById('cover-page');
    const prologueImage = document.getElementById('prologue-image');
    const prologueText = document.getElementById('prologue-text');

    let prologueIndex = 0;
    let prologueData = [];

    
    fetch('../storyline/prologue.json')
        .then(response => response.json())
        .then(data => {
            prologueData = data;

            
            function showNextPrologue() {
                if (prologueIndex < prologueData.length) {
                    prologueImage.src = prologueData[prologueIndex].image;
                    prologueText.innerText = prologueData[prologueIndex].text;
                    prologueIndex++;
                } else {
                    prologuePage.style.display = 'none';
                    coverPage.style.display = 'block';
                }
            }

            gameVisual.addEventListener('click', function() {
                gameVisual.style.display = 'none';
                prologuePage.style.display = 'block';
                showNextPrologue();
            });

            prologuePage.addEventListener('click', showNextPrologue);
        })
        .catch(error => {
            console.error('Error fetching prologue data:', error);
        });
});

document.addEventListener('DOMContentLoaded', function() {
    window.alert('點擊任一處，進入遊戲序章');
});