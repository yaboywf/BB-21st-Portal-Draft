const awards_template = `
    
`

fetch('/static/awards.json')
.then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    return response.json();
})
.then(data => {
    const awards = Object.keys(data);

    awards.forEach(award => {
        const new_p = document.createElement("p");
        new_p.textContent = award;
        document.getElementById("awards_list").appendChild(new_p);

        const new_option = document.createElement("option");
        new_option.value = award;
        document.getElementById("awards_datalist").appendChild(new_option);

        const award_details = document.createElement("div");
        award_details.classList = "award_container";
        award_details.id = award.replace(" ", "_");
        
        let award_details_html = `
            <div>
                <h1>${award}</h1>
                <a href="${data[award].link}" target="_blank">
                    <i class="fa-solid fa-book-open-cover" title="Learn More"></i>
                </a>
            </div>
            <hr>
            <div>
        `

        if (data[award].level) {
            const level_keys = Object.keys(data[award].level);
            level_keys.forEach(level => {
                award_details_html += `
                    <div>
                        <h2>${level}<span title="Suggested Secondary level">${data[award]["level"][level].recommendation}</span></h2>
                        <p>${data[award]["level"][level].description}</p>
                    </div>
                `
            })
        } else {
            award_details_html += `
                <div class="gs2">
                    <h2>Common<span title="Suggested Secondary level">${data[award].recommendation}</span></h2>
                    <p>${data[award].description}</p>
                </div>
            `
        }

        award_details_html += "</div></div>";
        award_details.innerHTML = award_details_html;
    
        document.getElementById("awards_details").appendChild(award_details);
    })
})
.catch(error => {
    add_error(error);
    console.error(error);
});

document.getElementById("search").addEventListener("input", () => {
    const search = document.getElementById("search").value;

    document.querySelectorAll("#awards_list p").forEach(p => {
        if (p.textContent.toLowerCase().includes(search.toLowerCase())) {
            p.style.display = "block";
        } else {
            p.style.display = "none";
        }
    })
})

document.getElementById("awards_list").addEventListener("click", (event) => {
    document.getElementById("awards_list").querySelectorAll("p").forEach(p => {
        p.setAttribute("data-active", false);
    })

    if (event.target.tagName === "P") {
        event.target.setAttribute("data-active", true);
        const coordinate = document.getElementById(event.target.textContent.replace(" ", "_")).getBoundingClientRect().top + window.scrollY - (document.body.offsetWidth > 500 ? 10 : 140);
        window.scrollTo({ top: coordinate, behavior: "smooth" });
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