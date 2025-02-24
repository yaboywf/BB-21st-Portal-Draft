document.getElementById('new_password').addEventListener('input', function() {
    var password = this.value;

    if (password === "") {
        document.querySelector('#password_strength span').textContent = "---";
        document.querySelector('#password_strength span').classList = "";
        return;
    }

    var result = zxcvbn(password);
    var timeToCrack = result.crack_times_display.offline_slow_hashing_1e4_per_second;

    document.querySelector('#password_strength span').textContent = timeToCrack;
    document.querySelector('#password_strength span').classList = `password${result.score}`;
});

document.querySelectorAll(".fa-eye").forEach(input => {
    input.addEventListener("click", () => {
        const password = input.previousElementSibling;
        const type = password.getAttribute("type") === "password" ? "text" : "password";
        password.setAttribute("type", type);
        input.classList = type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
    });
})

document.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    let pass = true;

    document.querySelectorAll("input:not(:first-of-type)").forEach(input => {
        if (input.value === "") {
            input.nextElementSibling.nextElementSibling.style.display = "flex";
            pass = false;
        } else {
            input.nextElementSibling.nextElementSibling.style.display = "none";
        }
    })

    if (document.getElementById("new_password").value !== document.getElementById("confirm_password").value) {
        document.getElementById("confirm_password").nextElementSibling.nextElementSibling.nextElementSibling.style.display = "flex";
        pass = false;
    } else {
        document.getElementById("confirm_password").nextElementSibling.nextElementSibling.nextElementSibling.style.display = "none";
    }

    const form_data = new FormData(document.querySelector("form"));

    if (pass) {
        fetch("/change_password", {
            method: "PUT",
            body: form_data,
            headers: {
                "X-Source" : "bb21portal"
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Something went wrong... Cannot change password")
            }

            return response.json()
        })
        .then(data => {
            if (data.updated) {
                document.getElementById("new_user").style.display = "flex";
            }
        })
        .catch(error => {
            add_error(error);
            console.error(error);
        })
    }
})

document.getElementById("new_user").style.display = "none";