const path = window.location.pathname;
let user_id_in_url = false;

if (path === '/user_management') {
    window.location.href = '/user_management/current_users';
}

if (path.split('/').length === 4) {
    if (!is_mobile()) {
        window.location.href = '/user_management/current_users';
    }

    user_id_in_url = true;
}

const socket = io("/current_users_room", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000
});

let selected_user;

socket.on("connect", () => {
    console.log("Connected to current users room");
})

function change_account_type() {
    if (document.getElementById("account_type").value === "boy") {
        document.getElementById("boy").style.display = "grid";
        document.getElementById("primer").style.display = "none";
        document.getElementById("officer").style.display = "none";

        document.querySelectorAll("#boy input, #boy select").forEach(field => {
            field.setAttribute('required', 'true');
        })

        document.querySelectorAll("#primer input, #primer select, #officer input, #officer select").forEach(field => {
            field.setAttribute('required', 'false');
        })
    } else if (document.getElementById("account_type").value === "primer") {
        document.getElementById("boy").style.display = "none";
        document.getElementById("primer").style.display = "grid";
        document.getElementById("officer").style.display = "none";

        document.querySelectorAll("#primer input, #primer select").forEach(field => {
            field.setAttribute('required', 'true');
        })

        document.querySelectorAll("#boy input, #boy select, #officer input, #officer select").forEach(field => {
            field.setAttribute('required', 'false');
        })
    } else {
        document.getElementById("boy").style.display = "none";
        document.getElementById("primer").style.display = "none";
        document.getElementById("officer").style.display = "grid";

        document.querySelectorAll("#officer input, #officer select").forEach(field => {
            field.setAttribute('required', 'true');
        })

        document.querySelectorAll("#primer input, #primer select, #boy input, #boy select").forEach(field => {
            field.setAttribute('required', 'false');
        })
    }
}

document.getElementById("account_type").addEventListener("change", () => {
    change_account_type();
})

document.getElementById("boy1").style.display = "none";
document.getElementById("primer").style.display = "none";
document.getElementById("officer").style.display = "none";

document.querySelectorAll("#boy input, #boy select").forEach(field => {
    field.setAttribute('required', 'true');
})

fetch("/get_all_usernames", {
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
    const account_type = document.getElementById("account_type_user").getAttribute("account-type");

    if (account_type.toLowerCase() === "officer") {
        data.officers.forEach(user => {
            const new_p = document.createElement("p");
            const start = user.rank === "NIL" ? user.honorifics : user.rank;

            new_p.setAttribute("id", user.id);
            new_p.textContent = `${start} ${user.user_name}`;

            document.getElementById("users_list").appendChild(new_p);
        })
    }

    if (account_type.toLowerCase() !== "boy") {
        data.primers.forEach(user => {
            const new_p = document.createElement("p");

            new_p.setAttribute("id", user.id);
            new_p.textContent = `${user.rank} ${user.user_name}`;

            document.getElementById("users_list").appendChild(new_p);
        })
    }

    data.boys.forEach(user => {
        if (user.graduated == "0") {
            const new_p = document.createElement("p");
            new_p.setAttribute("id", user.id);
            new_p.textContent = `${user.rank} ${user.user_name}`;

            document.getElementById("users_list").appendChild(new_p);
        }
    })
})
.catch(error => {
    add_error(error);
    console.error(error);
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

            if (is_mobile()) {
                window.location.href = `/user_management/current_users/${selected_user}`;
                return;
            }

            if (!user) {
                add_error("Selected User ID not found");
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

                let start = data.rank;

                if (data.rank == "NIL" && data.account_type.toLowerCase() === "officer") {
                    start = data.honorifics;
                }

                document.querySelector(".user_management_current > div:last-of-type h2").textContent = "User - " + start + " " + data.user_name;
                document.getElementById("user_name").value = data.user_name;
                document.getElementById("abb_name").value = data.abbreviated_name;
                document.getElementById("password").style.display = "none";
                document.getElementById("password").previousElementSibling.style.display = "none";
                document.getElementById("nominal_roll").value = (data.attendance_appearence || data.attendance_appearance).toLowerCase();
                document.getElementById("account_type").value = data.account_type.toLowerCase();
                document.getElementById("account_type").setAttribute("disabled", true);
                change_account_type();

                let rank;

                if (data.account_type.toLowerCase() === "officer") {
                    rank = "rank2"
                } else if (data.account_type === "Primer") {
                    rank = "rank1"
                } else {
                    rank = "rank"
                }

                const selectElement = document.getElementById(rank);
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

                if (data.account_type.toLowerCase() === "officer") {
                    document.getElementById("boy1").style.display = "none";
                    document.getElementById("honorifics").value = data.honorifics.toUpperCase();
                    document.getElementById("class").value = data.class.toLowerCase();
                    document.getElementById("credential1").value = data.credentials;
                } else if (data.account_type.toLowerCase() === "primer") {
                    document.getElementById("boy1").style.display = "none";
                    document.getElementById("credential").value = data.credentials;
                } else if (data.account_type.toLowerCase() === "boy") {
                    document.getElementById("boy1").style.display = "grid";

                    document.querySelectorAll("#boy1 input, #boy1 select").forEach(field => {
                        field.setAttribute('required', 'true');
                    })

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
                }

                document.getElementById("create").style.display = "none";
                document.getElementById("save").style.display = "block";
                document.getElementById("delete").style.display = "block";
            })
            .catch(error => {
                add_error(error);
                console.error(error);
            })
        }
    })
}

if (!user_id_in_url) {
    document.getElementById("create_new").addEventListener("click", () => {
        if (is_mobile()) {
            window.location.href = "/user_management/current_users/create_new_account";
            return;
        }

        document.querySelector(".user_management_current > div:last-of-type h2").textContent = "Create New Account";

        document.getElementById("password").style.display = "block";
        document.getElementById("password").previousElementSibling.style.display = "block";

        ["abb_name", "user_name", "password", "credential", "credential1"].forEach(input => {
            document.getElementById(input).value = "";
        })

        document.getElementById("account_type").value = "boy";
        document.getElementById("account_type").removeAttribute("disabled");
        document.getElementById("nominal_roll").value = "yes";
        document.getElementById("boy").style.display = "grid";
        document.getElementById("boy1").style.display = "none";
        document.getElementById("primer").style.display = "none";
        document.getElementById("officer").style.display = "none";
        document.getElementById("rank").value = "REC";
        document.getElementById("level").value = "1";

        document.getElementById("rank1").value = "CLT";
        document.getElementById("rank2").value = "NIL";
        document.getElementById("honorifics").value = "MR";
        document.getElementById("class").value = "val";

        document.querySelectorAll("#users_list p").forEach(p => {
            p.removeAttribute("data-active");
        })

        document.getElementById("create").style.display = "block";
        document.getElementById("save").style.display = "none";
        document.getElementById("delete").style.display = "none";
    })

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
}

document.getElementById("create").addEventListener("click", () => {
    const fields = ["user_name", "abb_name", "password", "nominal_roll", "account_type"];
    let final_fields = [];

    if (account_type.value === "boy") {
        final_fields = [...fields, "rank", "level"];
    } else if (account_type.value === "primer") {
        final_fields = [...fields, "rank1", "credential"];
    } else {
        final_fields = [...fields, "rank2", "honorifics", "class", "credential1"];
    }

    let can_submit = true;
    let data = {}

    final_fields.forEach(field => {
        if (document.getElementById(field).value === "" && can_submit) {
            add_error(`Fields are required. Please fill in all fields and try again.`);
            can_submit = false;
            data = {};
            return;
        } else {
            data[field] = document.getElementById(field).value
        }
    })

    if (can_submit) {
        fetch("/create_new_user", {
            method: "POST",
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
    }
})

socket.on("new_user_created", (data) => {
    const new_user = document.createElement("p");
    new_user.textContent = `${data.start} ${data.user_name}`;
    new_user.setAttribute("id", data.id);

    if (data.account_type.toLowerCase() !== "boy") {
        const elements = Array.from(document.getElementById("users_list").children);
        const target = elements.find(el => ["rec", "lcp", "sgt", "ssg", "wo"].some(keyword => el.textContent.toLowerCase().includes(keyword)))

        document.getElementById("users_list").insertBefore(new_user, target);
    } else {
        document.getElementById("users_list").appendChild(new_user);
    }

    if (is_mobile()) {
        window.location.href = `/user_management/current_users`;
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

socket.on("user_deleted", (data) => {
    try {
        document.getElementById(data.user_id).remove();
    } catch (error) {}

    selected_user = null;

    if (is_mobile()) {
        window.location.href = `/user_management/current_users`;
    }
})

socket.on("user_deleted_host", () => {
    document.getElementById("new_user").style.display = "none";
})

document.getElementById("new_user").style.display = "none";

document.querySelector("#new_user button:last-of-type").addEventListener("click", () => {
    document.getElementById("new_user").style.display = "none";
})

document.getElementById("save").addEventListener("click", () => {
    const fields = ["user_name", "abb_name", "nominal_roll", "account_type"];
    let final_fields = [];

    if (account_type.value === "boy") {
        final_fields = [...fields, "rank", "level", "member_id", "graduated", "sec1_class", "sec1_rank", "sec2_class", "sec2_rank", "sec3_class", "sec3_rank", "sec4_class", "sec4_rank", "sec5_class"];
    } else if (account_type.value === "primer") {
        final_fields = [...fields, "rank1", "credential"];
    } else {
        final_fields = [...fields, "rank2", "honorifics", "class", "credential1"];
    }

    let can_submit = true;
    let data = {}

    final_fields.forEach(field => {
        data[field] = document.getElementById(field).value === "" ? "NIL" : document.getElementById(field).value;
    })

    data["id"] = selected_user ? selected_user : path.split("/")[3];

    if (can_submit) {
        fetch(`/update_user`, {
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
    }
})

socket.on("user_updated", (data) => {
    let rank;

    if (data.account_type.toLowerCase() === "boy") {
        rank = data.rank;
    } else if (data.account_type.toLowerCase() === "officer") {
        rank = data.rank2;
    } else {
        rank = data.rank1;
    }

    document.getElementById(data.id).textContent = `${rank === "NIL" && data.account_type.toLowerCase() === "officer" ? data.honorifics : rank} ${data.user_name}`

    if (data.account_type.toLowerCase() === "boy" && data.graduated === "yes") {
        document.getElementById(data.id).remove();
        if (!is_mobile()) {
            document.getElementById("create_new").click();
        } else {
            window.location.href = "/user_management/current_users";
        }
        
        return;
    }

    if (document.getElementById(data.id).getAttribute("data-active") === "true") {
        Object.entries(data).forEach(([key, value]) => {
            if (key === "id" || (key === "member_id" && value === "NIL")) {
                return;
            }

            if (key.includes("_rank") && value === "NIL") {
                value = "";
            }

            document.getElementById(key).value = value;
        });        
    }
})

socket.on("user_ungraduated", (data) => {
    const new_user = document.createElement("p");
    new_user.textContent = data.name_display;
    new_user.setAttribute("id", data.id);
    document.getElementById("users_list").appendChild(new_user);
})

if (user_id_in_url && path.split('/')[3] !== "create_new_account") {
    document.getElementById("password").style.display = "none";
    document.getElementById("password").previousElementSibling.style.display = "none";
    document.getElementById("delete").style.display = "block";
    document.getElementById("save").style.display = "block";
    document.getElementById("create").style.display = "none";

    if (document.getElementById("user").getAttribute("data-account-type") === "boy") {
        document.getElementById("boy1").style.display = "grid";
    } else if (document.getElementById("user").getAttribute("data-account-type") === "primer") {
        document.getElementById("primer").style.display = "grid";
        document.getElementById("boy").style.display = "none";
    } else if (document.getElementById("user").getAttribute("data-account-type") === "officer") {
        document.getElementById("officer").style.display = "grid";
        document.getElementById("boy").style.display = "none";
    }
} else if (user_id_in_url && path.split('/')[3] === "create_new_account") {
    document.getElementById("create").style.display = "block";
    document.getElementById("delete").style.display = "none";
    document.getElementById("save").style.display = "none";
}