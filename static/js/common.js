document.querySelector("header .fa-bars").addEventListener("click", () => {
    if (document.querySelector("header").getAttribute("state") !== "closed") {
        document.querySelector("header > div").style.height = (document.querySelectorAll("header div a").length) * 45 + "px";
        document.querySelector("header").setAttribute("state", "closed");
    } else {
        document.querySelector("header > div").style.height = "0px";
        document.querySelector("header").setAttribute("state", "open");
    }
})

window.onload = () => {
    document.body.style.visibility = "visible";
};

function add_error(message, type="error") {
    let container = document.getElementById("error_container");

    let errorBar = document.createElement("div");
    errorBar.innerHTML = `<p>${message}</p>`;

    if (type === "success") {
        errorBar.classList.add("success");
    }

    container.appendChild(errorBar);

    setTimeout(() => {
        errorBar.style.opacity = "1";
        errorBar.style.transform = "translateY(0)";
    }, 10);

    setTimeout(() => {
        remove_error(errorBar);
    }, 5000);
}

function remove_error(errorBar) {
    errorBar.style.transform = "translateY(-20px)";
    errorBar.style.opacity = "0";
    setTimeout(() => {
        if (errorBar.parentElement) {
            errorBar.parentElement.removeChild(errorBar);
        }
    }, 300);
}

function is_mobile() {
    return window.innerWidth < 800 ? true : false;
}

function maintenance_check() {
    fetch("/get_maintenance_status", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-Source" : "bb21portal"
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(error.error);
            })
        }
        return response.json();
    })
    .then(data => {
        if (data.maintenance) {
            let now = new Date();
            let current_hour = now.getHours();
            let current_minute = now.getMinutes();

            let [maintain_hour, maintain_minute] = data.timing.split(":").map(Number);

            if (current_hour > maintain_hour || (current_hour === maintain_hour && current_minute >= maintain_minute)) {
                window.location.href = "/maintenance";
            } else {
                const maintenance_bar = `
                    <div class="maintenance_bar">
                        <p>To create a better experience, the website will undergo maintenance at ${data.timing} (24-hour military time). Sorry for the inconvenience.</p>
                    </div>
                `;

                const existingBar = document.querySelector(".maintenance_bar");
                if (existingBar) existingBar.remove();

                document.body.insertAdjacentHTML("afterbegin", maintenance_bar);
            }
        }
    })
    .catch(error => {
        add_error(error);
        console.error(error);
    })
}

maintenance_check();

setInterval(() => {
    maintenance_check();
}, 60000);