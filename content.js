function changeTextColorOpacity(element, opacityDelta) {
    let currentColor = window.getComputedStyle(element).color;
    // if the color is no rgba color, convert it to rgba
    if (currentColor[3] != "a") {
        // current color is: "rgb(x,x,x)"
        element.style.color =
            "rgba(" +
            currentColor.substring(4, currentColor.length - 1) +
            "," +
            (opacityDelta < 0 ? 1 + opacityDelta : 1) +
            ")";
        return;
    }
    // find last occurence of "," and get the index
    let index = currentColor.lastIndexOf(",");
    let currentOpacity = currentColor.substring(
        index + 1,
        currentColor.length - 1
    );
    let newOpacity = parseFloat(currentOpacity) + opacityDelta;
    if (newOpacity < 0.2) {
        newOpacity = 0.2;
    }
    if (newOpacity > 1) {
        newOpacity = 1;
    }
    element.style.color =
        currentColor.substring(0, index + 1) + newOpacity + ")";
}
let opacityDecreased = false;
function increaseOpacity(element) {
    if (opacityDecreased) {
        changeTextColorOpacity(element, 0.5);
        opacityDecreased = false;
    }
}
function decreaseOpacity(element) {
    if (!opacityDecreased) {
        changeTextColorOpacity(element, -0.5);
        opacityDecreased = true;
    }
}
let active_input = undefined;
function acceptOrDeclineSuggestion(event) {
    // tab to accept suggestion
    if (event.key == "Tab") {
        var input = active_input;
        if (input.getAttribute("data-suggestion") == "true") {
            input.setAttribute("data-suggestion", "false");

            input.style.color = "1";
        }
        // prevent tab from changing focus
        event.preventDefault();

        // set cursor position to end of input field
        // check if input field is a textarea/input or contenteditable div
        if (input.tagName == "TEXTAREA" || input.tagName == "INPUT") {
            active_input.focus();
            input.selectionStart = input.value.length;
            input.selectionEnd = input.value.length;
        } else {
            active_input.focus();
            var range = document.createRange();
            range.selectNodeContents(input);
            range.collapse(false);
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        increaseOpacity(input);
        // remove event listener
        document.activeElement.removeEventListener(
            "keydown",
            acceptOrDeclineSuggestion
        );
        return false;
    } else {
        var input = document.activeElement;

        if (input.getAttribute("data-suggestion") == "true") {
            if (input.tagName == "TEXTAREA" || input.tagName == "INPUT") {
                input.value = input.getAttribute("data-old-input");
            } else {
                input.innerText = input.getAttribute("data-old-input");
                // set cursor position to end of input field
                var range = document.createRange();
                range.selectNodeContents(input);
                range.collapse(false);
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
            input.setAttribute("data-suggestion", "false");
        }
        increaseOpacity(input);
        // remove event listener
        document.activeElement.removeEventListener(
            "keydown",
            acceptOrDeclineSuggestion
        );
    }
}

function addSuggestionControlListeners(input) {
    // register event listeners to accept or decline suggestion
    input.addEventListener("keydown", acceptOrDeclineSuggestion, true);
}

/*
hear for the command "show-suggestion", if the user is currently in an input field with input send the input to the background script, the background script will then answer with an suggestion which will be displayed in the input field by changing the input fields value and styling the input fields texts opacity to 0.8, if the user presses tab the suggestion will be inserted into the input field, if the user presses something else he can continue to type the old input which will be restored to the input fields value
*/
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.command == "show_suggestion") {
        var input = document.activeElement;
        // check if input is an input field, a textarea or an editable div
        if (
            input.nodeName != "INPUT" &&
            input.nodeName != "TEXTAREA" &&
            !input.isContentEditable
        ) {
            return;
        }
        if (input.nodeName == "INPUT" || input.nodeName == "TEXTAREA") {
            if (input.value.length == 0) {
                return;
            }
            if (input.getAttribute("data-suggestion") == "true") {
                // if there is already a suggestion, remove it
                input.value = input.getAttribute("data-old-input");
                input.setAttribute("data-suggestion", "false");
                increaseOpacity(input);
            }
            // url of current tab
            var url = request.url;
            // send input to background script
            chrome.runtime.sendMessage(
                {
                    command: "get-suggestion",
                    input: input.value,
                    url: request.url,
                },
                function (response) {
                    if (response.error != undefined) {
                        alert("OPENAI ERROR: " + response.error.message);
                        return;
                    }
                    // save old input
                    input.setAttribute("data-old-input", input.value);
                    // set new input
                    input.value = input.value + response.suggestion;
                    input.setAttribute("data-suggestion", "true");
                    // set opacity of input field text to 0.8
                    decreaseOpacity(input);

                    // set cursor position to position where old input value ended
                    input.selectionStart =
                        input.value.length - response.suggestion.length;
                    input.selectionEnd = input.value.length;
                    active_input = input;
                    addSuggestionControlListeners(input);
                }
            );
        } else if (input.isContentEditable) {
            if (input.innerText.length == 0) {
                return;
            }
            if (input.getAttribute("data-suggestion") == "true") {
                // if there is already a suggestion, remove it
                input.innerText = input.getAttribute("data-old-input");
                input.setAttribute("data-suggestion", "false");
                increaseOpacity(input);
            }
            // url of current tab
            var url = request.url;
            // send input to background script
            chrome.runtime.sendMessage(
                {
                    command: "get-suggestion",
                    input: input.innerText,
                    url: request.url,
                },
                function (response) {
                    if (response.error != undefined) {
                        alert("OPENAI ERROR: " + response.error.message);
                        return;
                    }
                    // save old input
                    input.setAttribute("data-old-input", input.innerText);
                    // set new input
                    old_text = input.innerText;
                    // if exactly one newline is at the end:
                    if (old_text.match(/\n$/) && !old_text.match(/\n.*\n$/)) {
                        // remove newline
                        old_text = old_text.slice(0, -1);
                        // add space
                        old_text += " ";
                        // add suggestion
                        old_text += response.suggestion;
                        // add newline
                        // old_text += "\n";
                        input.innerText = old_text;
                    } // else if multiple newlines are at the end:
                    else if (old_text.match(/\n.*\n$/)) {
                        // remove last newline
                        old_text = old_text.slice(0, -1);
                        // add suggestion
                        old_text += response.suggestion;
                        // add newline
                        // old_text += "\n";
                        input.innerText = old_text;
                    } // else if no newline is at the end:
                    else {
                        input.innerText = old_text + response.suggestion;
                    }

                    input.setAttribute("data-suggestion", "true");
                    // set opacity of input field text to 0.8
                    decreaseOpacity(input);

                    // set cursor position to select suggestion on contentEditable div "input" to position where old input value ended
                    var range = document.createRange();
                    let startNode = undefined;
                    let endNode = undefined;
                    let startOffset =
                        input.innerText.length - response.suggestion.length;
                    let endOffset = input.innerText.length;

                    // find startNode
                    for (let i = 0; i < input.childNodes.length; i++) {
                        if (
                            startOffset <=
                            input.childNodes[i].textContent.length
                        ) {
                            startNode = input.childNodes[i];
                            break;
                        }
                        startOffset -=
                            input.childNodes[i].textContent.length > 0
                                ? input.childNodes[i].textContent.length
                                : 1;
                    }
                    // find endNode
                    for (let i = 0; i < input.childNodes.length; i++) {
                        if (
                            endOffset <= input.childNodes[i].textContent.length
                        ) {
                            endNode = input.childNodes[i];
                            break;
                        }
                        endOffset -=
                            input.childNodes[i].textContent.length > 0
                                ? input.childNodes[i].textContent.length
                                : 1;
                    }
                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);
                    var selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);

                    active_input = input;
                    addSuggestionControlListeners(input);
                }
            );
        }
    }
});
