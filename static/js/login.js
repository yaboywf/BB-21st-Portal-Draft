const query = window.location.search;

if (query) {
    window.location.href = '/login';
}

document.getElementById("togglePassword").addEventListener("click", () => {
    const password = document.getElementById("password");
    const type = password.getAttribute("type") === "password" ? "text" : "password";
    password.setAttribute("type", type);
    document.getElementById("togglePassword").classList = type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
});

document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    let can_submit = true;

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === "") {
        document.querySelector("p").style.display = "flex";
        can_submit = false;
    } 
    
    if (password === "") {
        document.querySelector("p:nth-of-type(2)").style.display = "flex";
        can_submit = false;
    }

    if (!can_submit) {
        return;
    }

    const form_data = new FormData(document.querySelector(".login form"));

    fetch("/login/authenticate", {
        method: "POST",
        body: form_data,
        credentials: 'same-origin',
        headers: {
            "X-Source" : "bb21portal"
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Something went wrong... Authentication failed.")
        }

        return response.json()
    })
    .then(data => {
        if (data.error) {
            document.querySelector(".login form p:last-of-type").style.display = "block";
            document.querySelector(".login form p:last-of-type").innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.error}`
            return;
        }

        if (data.status && data.status === "success") {
            window.location.href = data.redirect;
        }
    })
    .catch(error => {
        add_error(error);
        console.error(error);
    })
})

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => {
        input.parentElement.nextElementSibling.style.display = "none";
    })
})