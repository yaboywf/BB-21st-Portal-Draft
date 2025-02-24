document.getElementById("generate").addEventListener("click", () => {
    const badge = document.getElementById("badge_select").value;
    const assessor = document.getElementById("officer_select").value;
    const description = document.getElementById("description").value;

    if (!badge || !assessor || !description) {
        add_error("Please fill in all required fields.");
        return;
    }

    let badge_option = Array.from(document.getElementById("badges").options).find(opt => opt.value === badge);

    if (!badge_option) {
        add_error("Please select a valid badge.");
        return;
    }

    let option = Array.from(document.getElementById("officers").options).find(opt => opt.value === assessor);

    if (!option) {
        add_error("Please select a valid assessor.");
        return;
    }

    let data = {
        badge: badge,
        assessor: assessor,
        description: description,
        credentials: option.getAttribute("credentials"),
        date: getTodayDate(),
        boys: {}
    };

    const boys = Array.from(document.querySelectorAll("input[type=checkbox]:checked")).map(input => {
        const name = input.getAttribute("data-name");
        const secondary = input.getAttribute("secondary");
        data.boys[name] = secondary;
        return name, secondary;
    });

    if (boys.length === 0) {
        add_error("Please select at least one boy.");
        return;
    }

    fetch(`/results_generation_template`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Source" : "bb21portal"
        },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(data => {        
        if (document.getElementById("parade-iframe")) document.getElementById("parade-iframe").remove();
        let iframe = document.createElement("iframe");
        iframe.style.width = "100%";
        iframe.style.height = "1145px";
        iframe.style.border = "none";
        document.getElementById("results_content").appendChild(iframe);

        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <link rel="icon" type="image/svg+xml" href="static/images/BB logo.webp" />
                    <link rel="stylesheet" href="static/result_generation.css">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>BB 21st Portal</title>
                    <style>
                        @import url("static/result_generation.css");
                    </style>
                </head>
                <body>
                    ${data}
                </body>
            </html>
        `);
        iframeDoc.close();
        iframe.id = "parade-iframe";

        document.getElementById("print").style.display = "block";
        
        document.addEventListener("keydown", function (event) {
            if (event.ctrlKey && event.key === "p") {
                event.preventDefault();
                print_parade_notice();
            }
        });
    })
    .catch(error => {
        add_error(error);
        console.error("Error fetching parade notice:", error)
    });
});

function print_parade_notice() {
    let paradeIframe = document.getElementById("parade-iframe");

    if (paradeIframe && paradeIframe.contentWindow) {
        paradeIframe.contentWindow.focus();
        paradeIframe.contentWindow.print();
    }
}

function getTodayDate() {
    let today = new Date();
    let day = String(today.getDate()).padStart(2, '0'); // Ensures 2 digits
    let month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    let year = today.getFullYear();

    return `${day}/${month}/${year}`;
}

document.getElementById("print").addEventListener("click", print_parade_notice);