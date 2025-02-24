const path = window.location.pathname;
let user_id_in_url = false;

if (path.split('/').length === 4) {
    if (!is_mobile()) {
        window.location.href = '/user_management/graduated_boys';
    }

    user_id_in_url = true;
}

const socket = io("/graduated_boys_room", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000
});

let selected_user;

socket.on("connect", () => {
    console.log("Connected to graduated boys room");
})

fetch("/get_all_graduated", {
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
        const new_p = document.createElement("p");
        new_p.setAttribute("id", user.id);
        new_p.textContent = `${user.rank} ${user.user_name}`;

        document.getElementById("users_list").appendChild(new_p);   
    })
})
.catch(error => {
    add_error(error);
    console.error(error);
})

document.getElementById("new_user").style.display = "none";

document.getElementById("search").addEventListener("input", () => {
    const search = document.getElementById("search").value;

    document.querySelectorAll("#users_list p").forEach(p => {
        if (p.textContent.toLowerCase().includes(search.toLowerCase())) {
            p.style.display = "block";
        } else {
            p.style.display = "none";
        }
    })
})

if (!user_id_in_url) {
    document.getElementById("users_list").addEventListener("click", (event) => {
        if (event.target.tagName.toLowerCase() === "p") {
            const user = event.target.getAttribute("id");

            document.querySelectorAll("#users_list p[data-active='true']").forEach(p => {
                p.setAttribute("data-active", false);
            })

            event.target.setAttribute("data-active", "true");
            selected_user = user;

            if (!user) {
                add_error("Selected User ID not found");
                return;
            }

            if (is_mobile()) {
                window.location.href = `/user_management/graduated_boys/${selected_user}`;
                return;
            }

            fetch(`/get_one_user_details?user_id=${user}&user_name=${encodeURIComponent(event.target.textContent)}`, {
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

                document.querySelector(".user_management_current > div:last-of-type h2").textContent = "User - " + (data.rank == "NIL" ? data.honorifics : data.rank) + " " + data.user_name;
                document.getElementById("user_name").value = data.user_name;
                document.getElementById("abb_name").value = data.abbreviated_name;
                document.getElementById("nominal_roll").value = (data.attendance_appearence || data.attendance_appearance).toLowerCase();
                document.getElementById("account_type").value = data.account_type.toLowerCase();

                const selectElement = document.getElementById("rank");
                let validRankFound = false;

                for (let option of selectElement.options) {
                    if (option.value === data.rank) {
                        selectElement.value = data.rank;
                        validRankFound = true;
                        break;
                    }
                }

                if (!validRankFound) {
                    selectElement.value = "NIL";
                }

                document.getElementById("member_id").value = data.member_id == "NIL" ? "" : data.member_id;
                document.getElementById("graduated").value = data.graduated == "0" ? "no" : "yes";

                for (let i = 1; i <= 5; i++) {
                    try {
                        document.getElementById(`sec${i}_class`).value = data[`sec${i}_class`];
                        document.getElementById(`sec${i}_rank`).value = data[`sec${i}_rank`] = data[`sec${i}_rank`] === "NIL" ? "" : data[`sec${i}_rank`];
                    } catch (error) {
                        continue
                    }
                }
            })
            .catch(error => {
                add_error(error);
                console.error(error);
            })
        }
    })
}

document.getElementById("save").addEventListener("click", () => {
    let data = {}    

    data["id"] = selected_user ? selected_user : path.split("/")[3];
    data["graduated"] = document.getElementById("graduated").value;
    data["name_display"] = document.getElementById(selected_user)?.textContent || document.querySelector("h2")?.textContent?.split(" - ")[1]

    fetch(`/update_graduated`, {
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
    .catch(error => {
        add_error(error);
        console.error(error);
    })
})

socket.on("user_updated", (data) => {
    if (data.graduated === "no") {
        document.getElementById(data.id).remove();

        document.querySelectorAll("form input").forEach(input => {
            input.value = "";
        })

        document.querySelector("h2").textContent = "Please select a user"
        document.getElementById("nominal_roll").value = "yes";
        document.getElementById("account_type").value = "boy";
        document.getElementById("rank").value = "REC";
        document.getElementById("level").value = "1";
        
        for (let i = 1; i <= 5; i++) {
            try {
                document.getElementById(`sec${i}_class`).value = "";
                document.getElementById(`sec${i}_rank`).value = "";
            } catch (error) {
                continue
            }
        }

        document.getElementById("graduated").value = "yes";

        if (is_mobile()) {
            window.location.href = "/user_management/graduated_boys";
        }
    }
})

socket.on("user_graduated", (data) => {
    if (data.graduated === "yes") {
        const new_user = document.createElement("p");
        new_user.textContent = `${data.rank} ${data.user_name}`;
        new_user.setAttribute("id", data.id);
        document.getElementById("users_list").appendChild(new_user);
    }
})

document.getElementById("delete").addEventListener("click", () => {
    document.getElementById("new_user").style.display = "flex";

    document.querySelector("#new_user button:first-of-type").addEventListener("click", () => {
        fetch(`/delete_user?user_id=${selected_user ? selected_user : path.split("/")[3]}&sid=${socket.id}`, {
            method: "DELETE",
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
        .catch(error => {
            add_error(error);
            console.error(error);
        })
    }) 
})

document.querySelector("#new_user button:last-of-type").addEventListener("click", () => {
    document.getElementById("new_user").style.display = "none";
})

socket.on("user_deleted", (data) => {
    try {
        document.getElementById(data.user_id).remove();
    } catch (error) {}
    
    selected_user = null;

    if (is_mobile()) {
        window.location.href = `/user_management/graduated_boys`;
    }
})

socket.on("user_deleted_host", () => {
    document.getElementById("new_user").style.display = "none";
})