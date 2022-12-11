// get completion from openai api
async function getSuggestion(input, url) {
    // to test
    if ((await chrome.storage.local.get("test_fetch")).test_fetch) {
        return "test";
    }

    // const query_promt =
    //     "A user typed the following text into an input field on the website " +
    //     url +
    //     ", complete the users input:\n" +
    //     input +
    //     "...";
    const max_input_length = (
        await chrome.storage.local.get("max_input_length")
    ).max_input_length;
    let query_promt = "";
    if (input.length > max_input_length) {
        query_promt = input.slice(-max_input_length);
        // find first new sentence
        let first_new_sentence = query_promt.search(/\. |\? |\! /);
        // if no new sentence found, find first new line
        if (first_new_sentence == -1) {
            first_new_sentence = query_promt.search(/\n/);
        }
        // if no new line found, find first space
        if (first_new_sentence == -1) {
            first_new_sentence = query_promt.search(/ /);
        }
        // if no space found, use whole string
        if (first_new_sentence == -1) {
            first_new_sentence = query_promt.length;
        }
        // remove first sentence
        query_promt = query_promt.slice(first_new_sentence + 2);
        query_promt = "..." + query_promt;
    } else {
        query_promt = input;
    }

    // get api key from storage
    const openai_api_key = (await chrome.storage.local.get("api_key")).api_key;

    // get max tokens from storage
    const max_tokens = (await chrome.storage.local.get("tokens")).tokens;

    // send request to openai api using fetch
    const response = await (
        await fetch("https://api.openai.com/v1/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + openai_api_key,
            },
            body: JSON.stringify({
                prompt: query_promt,
                max_tokens: 10,
                temperature: 0.5,
                model: "text-davinci-003",
            }),
        })
    ).json();
    // get suggestion from response
    let suggestion = response.choices[0].text;
    // remove new lines appearing at the start of the suggestion
    suggestion = suggestion.replace(/^\n+/, "");

    // remove ... at start of suggestion if end of input is not a space
    if (input[input.length - 1] != " ") {
        suggestion = suggestion.replace(/^\.\.\./, " ");
    }
    return suggestion;
}

// subscribe to messages from the content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.command == "get-suggestion") {
        // get suggestion from server
        getSuggestion(request.input, request.url).then((suggestion) => {
            sendResponse({ suggestion: suggestion });
        });
    }
    return true;
});

chrome.commands.onCommand.addListener(function (command) {
    switch (command) {
        case "show_suggestion":
            // send message to content script of current tab
            chrome.tabs.query(
                { active: true, currentWindow: true },
                function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        command: command,
                        url: tabs[0].url,
                    });
                }
            );
            break;
        default:
            console.log(`Command ${command} not found`);
    }
});
