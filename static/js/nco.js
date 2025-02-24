const socket = io.connect('/nco_council_room', { query: "username=" + document.getElementById("current_user").getAttribute("username") });

async function get_user_data() {
    await fetch("/get_all_boys", {
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
        if (data.error) {
            throw new Error(data.error);
        }

        data.forEach(user => {
            document.querySelectorAll("select:not(#captain)").forEach(input => {
                const user_option = document.createElement("option");
                user_option.textContent = `${user.rank} ${user.user_name}`;
                user_option.value = user.id;
                input.appendChild(user_option);
            })
        })
    })
    .catch(error => {
        add_error(error);
        console.error(error);
    })

    await fetch("/get_all_appointment_holders", {
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
        if (data.error) {
            throw new Error(data.error);
        }

        data.forEach(role => {
            document.querySelectorAll("select").forEach(input => {
                if (input.getAttribute("database-id") == role.role_id) {
                    if (role.user_id == null) {
                        input.value = "";
                        return;
                    }

                    input.value = role.user_id;
                }
            })
        })
    })
    .catch(error => {
        add_error(error);
        console.error(error);
    })
}

socket.on('connect', function() {
    console.log("Connected to NCO Council room");

    get_user_data();
});

socket.on("user_list1", (users) => {
    document.getElementById("user_list").innerHTML = "";

    users.forEach(user => {
        const user_div = document.createElement("div");
        user_div.textContent = user.charAt(0).toUpperCase();
        user_div.title = user;
        document.getElementById("user_list").appendChild(user_div);
    })
});

socket.emit("get_users1");

document.getElementById("user_list").nextElementSibling.addEventListener("mouseenter", () => {
    const coordinates = document.getElementById("user_list").nextElementSibling.getBoundingClientRect();
    document.getElementById("tooltip").style.display = "block";
    document.getElementById("tooltip").style.left = coordinates.left - 260 + "px";
    document.getElementById("tooltip").style.top = coordinates.top - 30 + "px";
})

document.getElementById("user_list").nextElementSibling.addEventListener("mouseout", () => {
    document.getElementById("tooltip").style.display = "none";
})

socket.on("nco_council_updated", function(data) {
    document.querySelector(`select[database-id='${data.input_id}']`).value = data.input_value || "";
})

document.querySelectorAll("select").forEach(input => {
    input.addEventListener("change", () => {
        socket.emit("update_nco_council", {
            input_id: input.getAttribute("database-id"),
            input_value: input.value = input.value === "" ? null : input.value
        });
    })
})