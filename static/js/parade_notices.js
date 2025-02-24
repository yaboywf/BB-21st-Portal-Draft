const year = document.getElementById("year");
const current_year = new Date().getFullYear();
let officers_list = {};
let boys_list = {};
let total_boys;
let total_officers;
let coy_strength;

const socket = io("/parade_notice_and_attendance", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000
});

socket.on("connect", (data) => {
    console.log("Connected to parade notice and attendance room");
})

document.getElementById("prev_year").addEventListener("click", () => {
    year.textContent = parseInt(year.textContent) - 1;
    filter(parseInt(year.textContent))
})

document.getElementById("next_year").addEventListener("click", () => {
    if ((parseInt(year.textContent) + 1) > current_year) {
        return;
    }
    year.textContent = parseInt(year.textContent) + 1;
    filter(parseInt(year.textContent));
})

function filter(year) {
    document.querySelectorAll("#parade_notice_list button").forEach(button => {
        if (button.textContent.split("-")[0] == year) {
            button.style.display = "block";
        } else {
            button.style.display = "none";
        }
    })
}

document.getElementById("date").value = getLastSaturday();

function getLastSaturday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSaturday = dayOfWeek === 0 ? 6 : dayOfWeek - 6;
    
    today.setDate(today.getDate() - daysToSaturday);
    
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// ---------------- GET PARADE APPOINTMENTS -----------------

fetch("/get_parade_appts", {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        "X-Source": "bb21portal"
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
    document.getElementById("CE").value = data.appt_holders["CE"];
    document.getElementById("CSM").value = data.appt_holders["CSM"];

    officers_list = data.officers;
    boys_list = data.boys;

    Object.values(data.officers).forEach(user => {
        const new_option = document.createElement("option");
        new_option.value = user;

        document.getElementById("officers").appendChild(new_option);
    });

    Object.values(data.boys).forEach(user => {
        const new_option = document.createElement("option");
        new_option.value = user.start;

        document.getElementById("boys").appendChild(new_option);
    });

    total_boys = Object.entries(data.boys).length;
    total_officers = Object.entries(data.officers).length;
    coy_strength = parseInt(total_boys) + parseInt(total_officers)
    document.getElementById("total_boy").textContent = `0 / ${total_boys}`;
    document.getElementById("total_officer").textContent = `0 / ${total_officers}`;
    document.getElementById("total_coy").textContent = `0 / ${coy_strength}`;

    Object.entries(data.boys).forEach(([id, boy]) => {
        const new_row = `
            <label for="boy_${id}">${boy.start}</label>
            <select id="boy_${id}" attendance_taken="0">
                <option value="" selected disabled></option>
                <option value="1">1</option>
                <option value="S">S</option>
                <option value="E">E</option>
                <option value="0">0</option>
            </select>
        `
        document.querySelector(`#sec${boy.secondary}_attendance p`).insertAdjacentHTML("beforebegin", new_row);
    })

    Object.entries(data.officers).forEach(([id, officer]) => {
        const new_row = `
            <label for="officer_${id}">${officer}</label>
            <select id="officer_${id}" attendance_taken="0">
                <option value="" selected disabled></option>
                <option value="1">1</option>
                <option value="S">S</option>
                <option value="E">E</option>
                <option value="0">0</option>
            </select>
        `
        document.querySelector(`#officer_attendance p`).insertAdjacentHTML("beforebegin", new_row);
    })
})
.catch(error => {
    add_error(error);
    console.error(error);
})

// ---------------- GET PARADE NOTICES -----------------

fetch("/get_all_parade_notices", {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        "X-Source": "bb21portal"
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
    data.reverse().forEach(parade => {
        const new_button = document.createElement("button");
        new_button.textContent = parade[1];
        new_button.setAttribute("parade_id", parade[0])
        document.getElementById("parade_notice_list").appendChild(new_button);
    })
})
.catch(error => {
    add_error(error);
    console.error(error);
})

const announcement_template = `
    <input type="text" name="company_announcement" placeholder="Please input this field before adding another announcement" required>
    <i class="fa-solid fa-trash"></i>
`;

const platoon_programmes = `
    <div>
        <input type="time" name="start_time" required>
        <span>-</span>
        <input type="time" name="end_time" required>
    </div>
    <input type="text" placeholder="Enter Program Name" name="program_name" required>
    <i class="fa-solid fa-trash"></i>
`;

document.getElementById("add_announcement").addEventListener("click", () => {
    const announcements = Array.from(document.getElementById("announcement_container").getElementsByTagName("li")).map(li => li.querySelector("input").value);
    if (announcements.length > 0 && announcements[announcements.length - 1].trim() === "") {
        return;
    }
    const new_li = document.createElement("li");
    new_li.innerHTML = announcement_template;
    document.getElementById("announcement_container").appendChild(new_li);
})

document.getElementById("company_announcement").addEventListener("click", (event) => {
    if (event.target.classList.contains("fa-trash")) {
        event.target.closest("li").remove();
    }
})

document.querySelectorAll(".parade_platoon").forEach(platoon => {
    platoon.addEventListener("click", (event) => {
        if (event.target.tagName.toLowerCase() === "button") {
            const new_div = document.createElement("div");
            new_div.innerHTML = platoon_programmes;
            platoon.insertBefore(new_div, event.target);
        }

        if (event.target.tagName.toLowerCase() === "i") {
            event.target.parentElement.remove();
        }
    })
})

document.querySelectorAll(".platoon_announcement").forEach(platoon => {
    platoon.addEventListener("click", (event) => {
        if (event.target.tagName.toLowerCase() === "button") {
            const announcements = Array.from(event.target.parentElement.querySelector("#announcement_container").getElementsByTagName("li")).map(li => li.querySelector("input").value);          
            if (announcements.length > 0 && announcements[announcements.length - 1].trim() === "") {
                return;
            }
            const new_li = document.createElement("li");
            new_li.innerHTML = announcement_template;
            event.target.parentElement.querySelector("#announcement_container").appendChild(new_li);
        }

        if (event.target.tagName.toLowerCase() === "i") {
            event.target.parentElement.remove();
        }
    })
})

const invalid_input = (field) => {
    field.style.borderColor = "black";
}

document.getElementById("create").addEventListener("click", () => {
    const required_fields = Array.from(document.getElementsByTagName("input")).filter(field => field.required === true);
    let failed = false;

    required_fields.forEach(field => {
        field.removeEventListener("input", invalid_input(field));
        
        if (field.value === "") {
            field.style.borderColor = "red";

            if (!failed) {
                field.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                })

                setTimeout(() => field.focus(), 500);

                add_error(`Empty Required Field at ${field.closest("div").querySelector("h2") !== null ? field.closest("div").querySelector("h2").textContent : field.closest("div").parentElement.querySelector("h2").textContent}`);
                failed = true;
            }
        }

        field.addEventListener("input", () => invalid_input(field));
    })

    if (!failed) {
        data = {
            "sid": socket.id,
            "date": document.getElementById("date").value,
            "venue": document.getElementById("venue").value,
            "reporting_time": document.getElementById("reporting").value,
            "dismissal_time": document.getElementById("dismissal").value,
            "DO": get_user_id(document.getElementById("DO").value, "officers"),
            "DT": get_user_id(document.getElementById("DT").value, "officers"),
            "COS": get_user_id(document.getElementById("COS").value, "boys"),
            "Flag Bearer": get_user_id(document.getElementById("FB").value, "boys"),
            "company_announcements": Array.from(document.querySelectorAll(".ca #announcement_container li")).map(announcement => announcement.querySelector("input").value.trim()),
            "description": document.getElementById("description").value.trim()
        }

        for (let i = 1; i <= 4; i++) {
            data[`sec_${i}_attire`] = document.getElementById(`sec${i}_attire`).value;
            
            data[`sec_${i}_programs`] = Array.from(document.getElementById(`sec${i}_programs`).querySelectorAll(":scope > div"))
            .map(program => {
                const start_time = program.querySelector("input[name='start_time']").value.trim();
                const end_time = program.querySelector("input[name='end_time']").value.trim();
                const program_name = program.querySelector("input[type='text']").value.trim();

                return { start_time, end_time, program_name };
            })
            .filter(value => value !== null);

            data[`sec_${i}_announcements`] = Array.from(document.querySelectorAll(`.sec${i}_announcments #announcement_container li`)).map(announcement => announcement.querySelector("input").value.trim())
        }

        fetch("/create_parade_notice", {
            method: "POST",
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
            add_error(error);
            console.error(error);
        })
    }
})

function get_user_id(name, type) {
    const list = type === "officers" ? officers_list : boys_list;

    if (type === "boys") {
        for (let user in list) {
            if (list[user].start === name) {
                return user;
            }
        }
    } else {
        for (let user in list) {
            if (list[user] === name) {
                return user;
            }
        }
    }
    

    return null;
}

function get_user_name(id, type) {
    const list = type === "officers" ? officers_list : boys_list;
    return list[id]
}

socket.on("parade_notice_created", (data) => {
    console.log(data);
})

socket.on("parade_notice_created_host", (data) => {
    if (data.added) {
        add_error("Parade Notice created successfully", "success");
        document.getElementById("create_button").click();
    }
})

const totalCoyElem = document.getElementById("total_coy");
const totalBoyElem = document.getElementById("total_boy");
const totalOfficerElem = document.getElementById("total_officer");

let totalCoy = parseInt(totalCoyElem.textContent.split(" / ")[0]);
let totalBoy = parseInt(totalBoyElem.textContent.split(" / ")[0]);
let totalOfficer = parseInt(totalOfficerElem.textContent.split(" / ")[0]);

function updateAttendance(target, increment) {
    const span = target.parentElement.querySelector("span");
    span.textContent = parseInt(span.textContent) + increment;
    target.setAttribute("attendance_taken", increment === 1 ? "1" : "0");

    if (target.parentElement.id.includes("sec")) {
        totalBoy += increment;
        totalBoyElem.textContent = `${totalBoy} / ${total_boys}`;
    } else if (target.parentElement.id.includes("officer")) {
        totalOfficer += increment;
        totalOfficerElem.textContent = `${totalOfficer} / ${total_officers}`;
    }

    totalCoy += increment;
    totalCoyElem.textContent = `${totalCoy} / ${coy_strength}`;
}

document.querySelector(".parade_attendance").addEventListener("change", (event) => {
    if (event.target.tagName === "SELECT") {
        const isAttendanceTaken = event.target.getAttribute("attendance_taken") == 1;
        const isAttendancePresent = event.target.value === "1";

        if (isAttendanceTaken && !isAttendancePresent) {
            updateAttendance(event.target, -1);
        } else if (!isAttendanceTaken && isAttendancePresent) {
            updateAttendance(event.target, 1);
        }

        socket.emit("update_attendance", { parade_id: document.querySelector("#parade_notice_list button[data-active='true']").getAttribute("parade_id"), attendance_id: event.target.id, value: event.target.value }, namespace="/parade_notice_and_attendance")
    }
})

document.querySelector("#parade_notice_list").addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
        if (event.target.getAttribute("data-active") === "true") {
            return;
        }

        document.getElementById("create_button").click();
        event.target.setAttribute("data-active", true);
        const user_type = document.getElementById("user").getAttribute("account-type");

        const parade_id = event.target.getAttribute("parade_id");

        fetch(`/get_parade_details?parade=${encodeURIComponent(parade_id)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Source": "bb21portal"
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
            document.getElementById("create").style.display = "none";
            document.getElementById("date").value = data.parade_date;
            document.getElementById("venue").value = data.venue;
            document.getElementById("reporting").value = data.start_time;
            document.getElementById("dismissal").value = data.end_time;
            document.getElementById("DO").value = (data.duty_officer_rank === "NIL" ? data.duty_officer_honorific : data.duty_officer_rank) + " " + data.duty_officer_name;
            document.getElementById("DT").value = (data.duty_teacher_rank === "NIL" ? data.duty_teacher_honorific : data.duty_teacher_rank) + " " + data.duty_teacher_name;
            document.getElementById("COS").value = data.cos_rank + " " + data.cos_name;
            document.getElementById("FB").value = data.flag_bearer_rank + " " + data.flag_bearer_name;

            data.company_announcements.split("/bb21/").forEach(announcement => {
                const new_li = document.createElement("li");
                new_li.innerHTML = `
                    <input type="text" name="company_announcement" placeholder="Please input this field before adding another announcement" value="${announcement}" required>
                    <i class="fa-solid fa-trash"></i>
                `
                document.getElementById("announcement_container").appendChild(new_li);
            })

            document.getElementById("description").value = data.parade_description;
            document.querySelector(".parade_attendance").style.display = "flex";
            document.getElementById("attendance_heading").style.display = "flex";
            
            let stylesheet = document.styleSheets[0];

            for (let rule of stylesheet.cssRules) {
                if (rule.selectorText === '.parade_notices > section > div:last-of-type::before') {
                    rule.style.setProperty('content', `"Parade Details - ${data.parade_date}"`);  // Make sure the content is wrapped in double quotes for CSS
                }
            }

            for (let i = 1; i <= 4; i++) {
                document.getElementById(`sec${i}_attire`).value = data[`sec${i}_attire`];

                let programs_str = data[`sec${i}_programs`].split('/bb21/');

                programs_str.forEach(program => {
                    let pass = true;

                    if (program === '') {
                        pass = false;
                    }

                    if (pass) {
                        let programs = {};
                        const key_value_pair = program.split(", ");

                        key_value_pair.forEach(pair => {
                            programs[pair.split(": ")[0].replace(/['{}]/g, '')] = (pair.split(": ")[1].replace(/['{}]/g, ''));
                        })

                        const program_html = `
                            <div>
                                <div>
                                    <input type="time" name="start_time" required value="${programs.start_time}">
                                    <span>-</span>
                                    <input type="time" name="end_time" required value="${programs.end_time}">
                                </div>
                                <input type="text" placeholder="Enter Program Name" name="program_name" required value="${programs.program_name}">
                                <i class="fa-solid fa-trash"></i>
                            </div>
                        `

                        document.querySelector(`#sec${i}_programs button`).insertAdjacentHTML("beforebegin", program_html);
                    }
                })

                if (data[`sec${i}_announcements`] !== "") {
                    data[`sec${i}_announcements`].split("/bb21/").forEach(announcement => {
                        const new_li = document.createElement("li");
                        new_li.innerHTML = `
                            <input type="text" name="company_announcement" placeholder="Please input this field before adding another announcement" value="${announcement}" required>
                            <i class="fa-solid fa-trash"></i>
                        `
                        
                        document.querySelector(`.sec${i}_announcements #announcement_container`).appendChild(new_li);
                    })
                }
            }

            if (user_type.toLowerCase() !== "officer" && new Date() > new Date(`${data.parade_date}T${data.start_time}:00`)) {
                document.getElementById("save").style.display = "none";
                document.querySelectorAll("input, textarea, select").forEach(field => {
                    field.setAttribute("disabled", true)
                })
            } else {
                document.getElementById("save").style.display = "block";
            }
        })
        .catch(error => {
            add_error(error);
            console.error(error);
        })

        fetch(`/get_attendance?parade_id=${encodeURIComponent(parade_id)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Source": "bb21portal"
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
            document.querySelectorAll(".parade_attendance > div:not(:last-of-type) span").forEach(span => {
                span.textContent = "0";
            })
        
            document.querySelectorAll(".parade_attendance > div:last-of-type span").forEach(span => {
                span.textContent = "0 / 0";
            })
        
            document.querySelectorAll(".parade_attendance > div:last-of-type select").forEach(select => {
                select.value = "";
            })

            setTimeout(() => {
                data.forEach(user => {
                    const attendance = user.user_id > 9999 ? `boy_${user.user_id}` : `officer_${user.user_id}`;
                    document.getElementById(attendance).value = user.attendance_status;
                    const isAttendancePresent = document.getElementById(attendance).value === "1";
    
                    if (isAttendancePresent) {
                        updateAttendance(document.getElementById(attendance), 1);
                    }
                });
            }, 300)
        })
        .catch(error => {
            add_error(error);
            console.error(error);
        })
    }
})

document.getElementById("create_button").addEventListener("click", () => {
    let stylesheet = document.styleSheets[0];

    for (let rule of stylesheet.cssRules) {
        if (rule.selectorText === '.parade_notices > section > div:last-of-type::before') {
            rule.style.setProperty('content', `"Create Parade Notice"`);
        }
    }

    document.querySelectorAll("#parade_notice_list button[data-active='true']").forEach(button => {
        button.setAttribute("data-active", false);
    })

    document.querySelectorAll(".parade_attendance > div:not(:last-of-type) span").forEach(span => {
        span.textContent = "0";
    })

    document.querySelectorAll(".parade_attendance > div:last-of-type span").forEach(span => {
        span.textContent = "0 / 0";
    })

    document.querySelectorAll(".parade_attendance > div:last-of-type select").forEach(select => {
        select.value = "";
    })

    document.getElementById("date").value = getLastSaturday();
    document.getElementById("venue").value = "School, GMSS";
    document.getElementById("reporting").value = "08:30";
    document.getElementById("dismissal").value = "12:30";
    document.getElementById("DO").value = "";
    document.getElementById("DT").value = "";
    document.getElementById("COS").value = "";
    document.getElementById("FB").value = "";
    document.getElementById("description").value = "";
    document.getElementById("announcement_container").innerHTML = "";
    document.getElementById("attendance_heading").style.display = "none";
    document.querySelector(".parade_attendance").style.display = "none";

    for (let i = 1; i <= 4; i++) {
        document.getElementById(`sec${i}_attire`).value = "";
        document.querySelectorAll(`#sec${i}_programs div`).forEach(div => div.remove());
        document.querySelector(`.sec${i}_announcements ol`).innerHTML = "";
    }

    document.getElementById("create").style.display = "block";
    document.getElementById("save").style.display = "none";
})

document.getElementById("save").addEventListener("click", () => {
    const parade_id = document.querySelector("#parade_notice_list button[data-active='true']").getAttribute("parade_id");
    const user_type = document.getElementById("user").getAttribute("account-type")
    
    if (!parade_id || user_type.toLowerCase() !== "officer") {
        return;
    }

    const required_fields = Array.from(document.getElementsByTagName("input")).filter(field => field.required === true);
    let failed = false;

    required_fields.forEach(field => {
        field.removeEventListener("input", invalid_input(field));
        
        if (field.value === "") {
            field.style.borderColor = "red";

            if (!failed) {
                field.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                })

                setTimeout(() => field.focus(), 500);

                add_error(`Empty Required Field at ${field.closest("div").querySelector("h2") !== null ? field.closest("div").querySelector("h2").textContent : field.closest("div").parentElement.querySelector("h2").textContent}`);
                failed = true;
            }
        }

        field.addEventListener("input", () => invalid_input(field));
    })

    if (!failed) {
        data = {
            "sid": socket.id,
            "parade_id": parade_id,
            "date": document.getElementById("date").value,
            "venue": document.getElementById("venue").value,
            "reporting_time": document.getElementById("reporting").value,
            "dismissal_time": document.getElementById("dismissal").value,
            "DO": get_user_id(document.getElementById("DO").value, "officers"),
            "DT": get_user_id(document.getElementById("DT").value, "officers"),
            "COS": get_user_id(document.getElementById("COS").value, "boys"),
            "Flag Bearer": get_user_id(document.getElementById("FB").value, "boys"),
            "company_announcements": Array.from(document.querySelectorAll(".ca #announcement_container li")).map(announcement => announcement.querySelector("input").value.trim()),
            "description": document.getElementById("description").value.trim()
        }

        for (let i = 1; i <= 4; i++) {
            data[`sec_${i}_attire`] = document.getElementById(`sec${i}_attire`).value;
            
            data[`sec_${i}_programs`] = Array.from(document.getElementById(`sec${i}_programs`).querySelectorAll(":scope > div"))
            .map(program => {
                const start_time = program.querySelector("input[name='start_time']").value.trim();
                const end_time = program.querySelector("input[name='end_time']").value.trim();
                const program_name = program.querySelector("input[type='text']").value.trim();

                return { start_time, end_time, program_name };
            })
            .filter(value => value !== null);

            data[`sec_${i}_announcements`] = Array.from(document.querySelectorAll(`.sec${i}_announcements #announcement_container li`)).map(announcement => announcement.querySelector("input").value.trim())
        }

        fetch("/update_parade_notice", {
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
            add_error(error);
            console.error(error);
        })
    }
})

socket.on("attendance_updated", (data) => {
    if (document.querySelector("#parade_notice_list button[data-active='true']").getAttribute("parade_id") == data.parade_id) {
        document.getElementById(data.attendance_id).value = data.value;
        const isAttendancePresent = data.value === "1";

        if (isAttendancePresent) {
            updateAttendance(document.getElementById(data.attendance_id), 1);
        }
    }
})

socket.on("parade_notice_updated", (data) => {
    if (document.querySelector("#parade_notice_list button[data-active='true']") && data.parade_id === document.querySelector("#parade_notice_list button[data-active='true']").getAttribute("parade_id")) {
        document.getElementById("create_button").click();
        document.getElementById("date").value = data.date;
        document.getElementById("venue").value = data.venue;
        document.getElementById("reporting").value = data.reporting_time;
        document.getElementById("dismissal").value = data.dismissal_time;
        document.getElementById("DO").value = get_user_name(data.DO, "officers");
        document.getElementById("DT").value = get_user_name(data.DT, "officers");
        document.getElementById("COS").value = get_user_name(data.COS, "boys")
        document.getElementById("FB").value = get_user_name(data.flag_bearer, "boys");

        data.company_announcements.forEach(announcement => {
            const new_li = document.createElement("li");
            new_li.innerHTML = `
                <input type="text" name="company_announcement" placeholder="Please input this field before adding another announcement" value="${announcement}" required>
                <i class="fa-solid fa-trash"></i>
            `
            document.getElementById("announcement_container").appendChild(new_li);
        })

        document.getElementById("description").value = data.parade_description;
        document.querySelector(".parade_attendance").style.display = "flex";
        document.getElementById("attendance_heading").style.display = "flex";
        
        let stylesheet = document.styleSheets[0];

        for (let rule of stylesheet.cssRules) {
            if (rule.selectorText === '.parade_notices > section > div:last-of-type::before') {
                rule.style.setProperty('content', `"Parade Details - ${data.date}"`);  // Make sure the content is wrapped in double quotes for CSS
            }
        }

        for (let i = 1; i <= 4; i++) {
            document.getElementById(`sec${i}_attire`).value = data[`sec_${i}_attire`];

            let programs_str = data[`sec_${i}_programs`];

            programs_str.forEach(program => {
                const program_html = `
                    <div>
                        <div>
                            <input type="time" name="start_time" required value="${program.start_time}">
                            <span>-</span>
                            <input type="time" name="end_time" required value="${program.end_time}">
                        </div>
                        <input type="text" placeholder="Enter Program Name" name="program_name" required value="${program.program_name}">
                        <i class="fa-solid fa-trash"></i>
                    </div>
                `

                document.querySelector(`#sec${i}_programs button`).insertAdjacentHTML("beforebegin", program_html);
            })

            if (data[`sec_${i}_announcements`].length !== 0) {
                data[`sec_${i}_announcements`].forEach(announcement => {
                    const new_li = document.createElement("li");
                    new_li.innerHTML = `
                        <input type="text" name="company_announcement" placeholder="Please input this field before adding another announcement" value="${announcement}" required>
                        <i class="fa-solid fa-trash"></i>
                    `
                    
                    document.querySelector(`.sec${i}_announcements #announcement_container`).appendChild(new_li);
                })
            }

            document.querySelector(`#parade_notice_list button[parade_id='${data.parade_id}']`).click();
        }
    }
})

const go_to_top_btn = document.getElementById("gototop"); 

window.onscroll = function() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        go_to_top_btn.style.display = "flex";
    } else {
        go_to_top_btn.style.display = "none";
    }
};

go_to_top_btn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
})