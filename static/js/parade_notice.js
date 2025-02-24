document.addEventListener("DOMContentLoaded", function () {
    const date = document.getElementById("date").getAttribute("data-date");

    if (date == "None") {
        document.getElementById("print").remove();
        return;
    }

    fetch(`/parade_notice_template/${date}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-Source" : "bb21portal"
        }
    })
    .then(response => response.text())
    .then(data => {        
        let iframe = document.createElement("iframe");
        iframe.style.width = "100%";
        iframe.style.height = "800px";
        iframe.style.border = "none";
        document.getElementById("parade_content").innerHTML = "";
        document.getElementById("parade_content").appendChild(iframe);

        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <link rel="icon" type="image/svg+xml" href="static/images/BB logo.webp" />
                    <link rel="stylesheet" href="static/parade_notice.css">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>BB 21st Portal</title>
                    <style>
                        @import url("static/parade_notice.css");
                    </style>
                </head>
                <body>
                    ${data}
                </body>
            </html>
        `);
        iframeDoc.close();
        iframe.id = "parade-iframe";
        
        document.addEventListener("keydown", function (event) {
            if (event.ctrlKey && event.key === "p") {
                event.preventDefault();
                print_parade_notice();
            }
        });
    })
    .catch(error => console.error("Error fetching parade notice:", error));
});

function print_parade_notice() {
    let paradeIframe = document.getElementById("parade-iframe");

    if (paradeIframe && paradeIframe.contentWindow) {
        paradeIframe.contentWindow.focus();
        paradeIframe.contentWindow.print();
    }
}

document.getElementById("print").addEventListener("click", print_parade_notice);