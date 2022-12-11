browser.storage.sync.get(["api_key"]).then((result) => {
    if (result.api_key) {
        document.getElementById("api_key").value = result.api_key;
    }
});
browser.storage.sync.get(["tokens"]).then((result) => {
    if (result.tokens) {
        document.getElementById("tokens").value = result.tokens;
    }
});
browser.storage.sync.get(["test_fetch"]).then((result) => {
    if (result.test_fetch) {
        document.getElementById("test_fetch").checked = result.test_fetch;
    }
});
browser.storage.sync.get(["max_input_length"]).then((result) => {
    if (result.max_input_length) {
        document.getElementById("max_input_length").value =
            result.max_input_length;
    }
});
browser.storage.sync.get(["model"]).then((result) => {
    if (result.model) {
        document.getElementById("model").value = result.model;
    }
});

document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    let api_key = document.getElementById("api_key").value;
    let tokens = document.getElementById("tokens").value;
    let test_fetch = document.getElementById("test_fetch").checked;
    let max_input_length = document.getElementById("max_input_length").value;
    let model = document.getElementById("model").value;
    browser.storage.sync.set({
        api_key: api_key,
        tokens: parseInt(tokens),
        test_fetch: test_fetch,
        max_input_length: max_input_length,
        model: model,
    });
});

let usage = document.getElementById("usage");
browser.storage.sync.get(["api_key"]).then((result) => {
    if (result.api_key) {
        //date formatted YYYY-MM-DD
        fetch(
            "https://api.openai.com/v1/usage?date=" +
                new Date().toISOString().slice(0, 10),
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + result.api_key,
                },
            }
        ).then((e) => {
            e.json().then((j) => {
                usage.innerHTML = j.current_usage_usd + " $USD";
            });
        });
    }
});
