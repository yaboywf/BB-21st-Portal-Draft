const drop_area = document.querySelector("label");
const file_input = document.getElementById("upload");

drop_area.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];

    if (!file || file.type !== 'application/pdf') {
        add_error('Invalid file type');
    }
});

file_input.addEventListener('change', (event) => {
    drop_area.style.display = 'none';
    document.getElementById("file_name").style.display = "flex";
    document.getElementById("upload_button").style.display = "flex";
    document.querySelector("#file_name p").textContent = event.target.files[0].name;
});

document.querySelector("#file_name i").addEventListener("click", () => {
    drop_area.style.display = "flex";
    document.getElementById("file_name").style.display = "none";
    document.getElementById("upload_button").style.display = "none";
    document.querySelector("#file_name p").textContent = "";
    file_input.value = "";
})

document.getElementById("upload_button").addEventListener("click", () => {
    const file = file_input.files[0];
    
    if (!file) {
        add_error('No file selected');
    }

    let form_data = new FormData();
    form_data.append('file', file);

    fetch('/upload_annual_calendar', {
        method: "POST",
        headers: {
            "X-Source": "bb21portal",
        },
        body: form_data
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

        if (data.uploaded) {
            const timestamp = new Date().getTime();
            document.getElementById("pdf_viewer").src = `/static/pdf/annual_calendar.pdf?t=${timestamp}#toolbar=0&zoom=page-width`;
            document.querySelector("#file_name i").click();
        }
    })
    .catch(error => {
        console.error(error);
        add_error(error);
    })
})