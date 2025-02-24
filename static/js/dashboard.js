const new_user = window.localStorage.getItem('new_user');

if (new_user) {
    document.getElementById('new_user').style.display = 'none';
}

document.querySelector('#new_user button:first-of-type').addEventListener('click', () => {
    window.localStorage.setItem('new_user', 'true');
});

document.getElementById('later').addEventListener('click', () => {
    document.getElementById('new_user').style.display = 'none';
});

if (document.querySelectorAll("#pending_tasks li").length === 0) {
    document.getElementById("no_pending_tasks").style.display = "flex";
    document.getElementById("no_pending_tasks_text").style.display = "flex";
    document.querySelector("#pending_tasks ol").remove();
} else {
    document.getElementById("no_pending_tasks").style.display = "none";
    document.getElementById("no_pending_tasks_text").style.display = "none";
}

if (document.querySelector(".fa-gear")) {
    localStorage.setItem("admin", "1");
}