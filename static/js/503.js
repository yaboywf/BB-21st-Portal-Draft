document.querySelector("header .fa-bars").addEventListener("click", () => {
    if (document.querySelector("header").getAttribute("state") !== "closed") {
        document.querySelector("header").style.height = "270px";
        document.querySelector("header").setAttribute("state", "closed");
    } else {
        document.querySelector("header").style.height = "100px";
        document.querySelector("header").setAttribute("state", "open");
    }
})

window.onload = () => {
    document.body.style.visibility = "visible";
};

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
        if (!data.maintenance) {
            window.location.href = "/";
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