let observer_created = false;

function observer() {
    const observer = new MutationObserver(() => {
        createElement();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function createElement() {
    if (!document.getElementById("authenticated")) {
        const element = document.createElement('div');
        element.id = "authenticated";
        element.classList.add("logged_out_modal");

        element.innerHTML = `
            <div>
                <p>Your session has expired. You are now logged out.</p>
                <a href="/login">
                    <button>Okay</button>
                </a>
            </div>
        `;

        document.body.appendChild(element);
    }
}

setInterval(() => {
    fetch("/user_authentication_status", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-Source" : "bb21portal"
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(error => {
                throw new Error(error);
            })
        }
        
        const contentType = response.headers.get("Content-Type");

        if (contentType && contentType.includes("application/json")) {
            return response.json().then(data => {
                if (data.lockdown) {
                    window.location.href = "/423";
                    return;
                }
            });
        } else {
            return response.text().then(data => {
                if (!data.authenticated) {
                    createElement();
                }
        
                if (!observer_created) {
                    observer();
                    observer_created = true;
                }
            });
        }
    })
    .catch(error => {
        add_error(error)
        console.error(error);
    })
}, 30000);

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