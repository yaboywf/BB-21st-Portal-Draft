document.querySelector("header .fa-bars").addEventListener("click", () => {
    if (document.querySelector("header").getAttribute("state") !== "closed") {
        document.querySelector("header").style.height = "270px";
        document.querySelector("header").setAttribute("state", "closed");
    } else {
        document.querySelector("header").style.height = "100px";
        document.querySelector("header").setAttribute("state", "open");
    }
})

if (localStorage.getItem("admin") != "1") {
    window.location.href = "/";
}

window.onload = () => {
    document.body.style.visibility = "visible";
};

document.getElementById("disable_m").addEventListener("change", function () {
    document.getElementById("time").disabled = this.checked;
})

document.getElementById("enable_m").addEventListener("change", function () {
    document.getElementById("time").disabled = !this.checked;
})

if (document.querySelector('input[name="maintenance"]:checked').value == 0) {
    document.getElementById("time").disabled = true;
}

document.getElementById("save").addEventListener("click", () => {
    let data = {
        maintenance: document.querySelector('input[name="maintenance"]:checked').value,
        time: document.getElementById("time").value
    }

    fetch("/update_maintenance_setting", {
        method: "PUT",
        body: JSON.stringify(data),
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
        if (data.updated) {
            location.reload();
        }
    })
    .catch(error => {
        console.error(error);
    })
})

document.querySelectorAll(".lockdown button").forEach(button => {
    button.addEventListener("click", () => {
        let data = {
            lockdown: button.textContent === "Enable Lockdown" ? true : false
        }

        fetch("/update_lockdown_setting", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Source" : "bb21portal"
            },
            body: JSON.stringify(data)
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
            if (data.updated) {
                location.reload();
            }
        })
        .catch(error => {
            console.error(error);
        })
    })
})

document.querySelector("header .fa-bars").addEventListener("click", () => {
    if (document.querySelector("header").getAttribute("state") === "closed") {
        document.querySelector("header > div").style.height = (document.querySelectorAll("header div a").length) * 45 + "px";
        document.querySelector("header").setAttribute("state", "closed");
    } else {
        document.querySelector("header > div").style.height = "0px";
        document.querySelector("header").setAttribute("state", "open");
    }
})

const nav_menu = document.createElement("div");
nav_menu.classList.add("nav_menu");
nav_menu.innerHTML = "<h2>Menu</h2>" + document.querySelector("header > div").innerHTML;
nav_menu.querySelector(".fa-solid").remove();
nav_menu.querySelector("h2").addEventListener("click", () => {
    nav_menu.style.transform = "translateX(105%)";
})
document.body.appendChild(nav_menu);

document.querySelector(".fa-ellipsis-vertical").addEventListener("click", () => {
    nav_menu.style.transform = "translateX(0)";
})