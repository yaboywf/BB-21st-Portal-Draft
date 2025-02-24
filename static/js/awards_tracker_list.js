const path = window.location.pathname;
let user_id_in_url = false;

if (path === '/awards_tracker') {
    window.location.href = '/awards_tracker/boys_awards';
}

const socket = io("/awards_tracker_room", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000
});

socket.on("connect", () => {
    console.log("Connected to awards_tracker room");
})

function generate_rows(number_of_elements, element_to_append_in, boy, table_headings_ids_list, table_subheadings_ids_list) {
    const new_row = document.createElement("div");
    const name = document.createElement("p");

    new_row.classList = "table_data";

    name.id = boy.id;
    name.textContent = `${boy.rank} ${boy.user_name}`;
    new_row.appendChild(name);
 
    for (let i = 0; i < number_of_elements; i++) {
        const new_data = document.createElement("p");
        new_data.innerHTML = `<input type='checkbox' id='${boy.id}_${table_headings_ids_list[i]}_${table_subheadings_ids_list[i]}'>`;

        if (i === 0 && element_to_append_in !== "elective_table") {
            new_data.querySelector('input').disabled = true;
        }

        if ((i === 1 && element_to_append_in === "spa_table") || (i === 1 && element_to_append_in === "founders_table")) {
            new_data.querySelector('input').disabled = true;
        }

        new_row.appendChild(new_data);
    }

    document.getElementById(element_to_append_in).appendChild(new_row);
}

fetch('/get_all_boys', {
    method: "GET",
    headers: {
        "X-Source": "bb21portal",
        "Content-Type": "application/json"
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
    data.forEach(boy => {
        generate_rows(24, "elective_table", boy, ["9", "10", "11", "11", "12", "12", "13", "13", "14", "14", "15", "15", "16", "16", "17", "17", "18", "18", "19", "19", "20", "20", "21", "21"], ["2", "2", "1", "2", "1", "2", "1", "2", "1", "2", "1", "2", "1", "2", "1", "2", "1", "2", "1", "2", "1", "2", "1", "2"]);
        generate_rows(7, "ipa_table", boy, ["NIL", "1", "9", "10", "6", "8", "7"], ["NIL", "NIL", "1", "1", "2", "1", "1"]);
        generate_rows(5, "spa_table", boy, ["22", "NIL", "4", "8", "7"], ["NIL", "NIL", "NIL", "2", "2"]);
        generate_rows(6, "founders_table", boy, ["23", "NIL", "2", "6", "8", "7"], ["NIL", "NIL", "NIL", "3", "3", "3"]);
        
        get_all_attained_badges();
    });
})

function get_all_attained_badges() {
    fetch('/get_all_attained_badges', {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-Source": "bb21portal"
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().text(error => {
                throw new Error(error);
            })
        }
        
        return response.json();
    })
    .then(data => {
        data.forEach(badge => {
            let level = "0";

            if (badge[3].toLowerCase() === "basic") {
                level = "1";
            } else if (badge[3].toLowerCase() === "advanced") {
                level = "2";
            } else if (badge[3].toLowerCase() === "master") {
                level = "3";
            } else {
                level = "NIL"
            }

            const badge_name = document.getElementById(`${badge[1]}_${badge[2]}_${level}`);

            if (badge_name) {
                badge_name.checked = true;
            }
        })

        awards_tracker_logic();
    })
    .catch(error => {
        add_error(error);
        console.error(error);
    })
}

function awards_tracker_logic() {
    document.querySelectorAll("#elective_table .table_data").forEach(row => {
        let elective_points = 0;
        const user_id = row.querySelector(".table_data > p").id;

        row.querySelectorAll("input:checked").forEach(input => {
            elective_points += parseInt(input.id.split("_")[2]);
        });

        document.querySelector(`#ipa_table input[id='${user_id}_NIL_NIL']`).checked = elective_points >= 1;
        document.querySelector(`#spa_table input[id='${user_id}_NIL_NIL']`).checked = elective_points >= 4;
        document.querySelector(`#founders_table input[id='${user_id}_NIL_NIL']`).checked = elective_points >= 6;
    });

    function check_rows() {
        ["#ipa_table", "#spa_table", "#founders_table"].forEach(tableId => {
            document.querySelectorAll(`${tableId} .table_data`).forEach(row => {
                const total_fields = Array.from(row.getElementsByTagName("input")).length;
                const total_filled_fields = Array.from(row.getElementsByTagName("input")).filter(input => input.checked).length;
    
                if (total_filled_fields === total_fields) {
                    row.querySelector("p").style.backgroundColor = "lightgreen";
                } else {
                    row.querySelector("p").style.backgroundColor = "#f6f6f6";
                }
            });
        });
    }

    check_rows();

    document.querySelectorAll("#ipa_table .table_data p:first-of-type").forEach(row => {
        const user_id = row.id;
        const bgColor = window.getComputedStyle(row).backgroundColor;

        document.querySelector(`#spa_table input[id='${user_id}_22_NIL']`).checked = bgColor === "rgb(144, 238, 144)";
    });

    document.querySelectorAll("#spa_table .table_data p:first-of-type").forEach(row => {
        const user_id = row.id;
        const bgColor = window.getComputedStyle(row).backgroundColor;

        document.querySelector(`#founders_table input[id='${user_id}_23_NIL']`).checked = bgColor === "rgb(144, 238, 144)";
    });

    check_rows();
}

document.body.addEventListener("change", (event) => {
    if (event.target.tagName.toLowerCase() !== "input" || event.target.getAttribute("type") !== "checkbox") {
        return;
    }

    const operation = event.target.checked ? "insertion" : "deletion";

    const checkbox_id = event.target.id;
    const split_id = checkbox_id.split("_");
    if (split_id[1].toLowerCase() === "nil") {
        return;
    }

    let level;

    if (split_id[2] == 1) {
        level = "Basic";
    } else if (split_id[2] == 2) {
        level = "Advanced";
    } else if (split_id[2] == 3) {
        level = "Master";
    } else {
        level = "NIL";
    }

    const data = {
        operation: operation,
        user_id: parseInt(split_id[0]),
        badge_id: parseInt(split_id[1]),
        badge_level: level
    }

    fetch("/update_awards_tracker", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Source": "bb21portal"
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
    .catch(error => {
        console.error(error);
        add_error(error);
    })
});

document.querySelectorAll(".awards_tracker_list section:nth-of-type(2) input").forEach(section => {
    section.addEventListener("change", () => {
        const coordinate = document.getElementById(`${section.id}_list`).getBoundingClientRect().top + window.scrollY - 50;
        window.scrollTo({ top: coordinate, behavior: "smooth" });
    })
})

socket.on("attained_badges_updated", (data) => {
    const checked = data.operation === "insertion" ? true : false

    if (data.badge_level.toLowerCase() === "basic") {
        level = 1;
    } else if (data.badge_level.toLowerCase() === "advanced") {
        level = 2;
    } else if (data.badge_level.toLowerCase() === "master") {
        level = 3;
    } else {
        level = "NIL"
    }

    document.getElementById(`${data.user_id}_${data.badge_id}_${level}`).checked = checked;

    awards_tracker_logic();
})

socket.on("user_deleted"), (data) => {
    location.reload();
}