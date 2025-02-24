fetch('/get_all_badges', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        "X-Source" : "bb21portal"
    }
})
.then(response => {
    if (!response.ok) {
        throw new Error('Something went wrong. Cannot get badges.');
    }
    return response.json();
})
.then(data => {
    data.badges.forEach(badge => {
        const template = document.getElementById('award_template');
        const clone = template.content.cloneNode(true).querySelector('div');

        clone.setAttribute("badge-id", badge[0]);
        clone.querySelector("h3").textContent = badge[1];
        clone.querySelector("img").src = badge[2];

        const option = document.createElement('option');
        option.value = badge[1];
        document.querySelector('section datalist').appendChild(option);

        if (badge[3] === "NIL") {
            const new_p = document.createElement("p");
            const new_p1 = document.createElement("p");

            new_p.textContent = "---";
            clone.querySelector(":scope > div > div").appendChild(new_p);
            
            new_p1.textContent = "Not Attained";
            new_p1.id = `${badge[0]}_NIL`;
            new_p1.classList.add("not_attained");

            clone.querySelector(":scope > div > div").appendChild(new_p1);
        } else {
            list_of_levels = badge[3].split(',').map(item => item.trim());

            list_of_levels.forEach(level => {
                const new_p = document.createElement("p");
                const new_p1 = document.createElement("p");

                new_p.textContent = level;
                clone.querySelector(":scope > div > div").appendChild(new_p);

                new_p1.textContent = "Not Attained";
                new_p1.id = `${badge[0]}_${level}`;
                new_p1.classList.add("not_attained");

                clone.querySelector(":scope > div > div").appendChild(new_p1);
            })
        }

        document.getElementById("awards_list").appendChild(clone);
    })
})
.catch(error => {
    add_error(error);
    console.error(error);
})

fetch('/get_attained_badges', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        "X-Source" : "bb21portal"
    }
})
.then(response => {
    if (!response.ok) {
        throw new Error('Something went wrong. Cannot get attained badges.');
    }
    return response.json();
})
.then(data => {
    data.attained_badges.forEach(badge => {
        document.getElementById(`${badge[2]}_${badge[3]}`).textContent = "Attained";
        document.getElementById(`${badge[2]}_${badge[3]}`).classList = "attained";
    })
})
.catch(error => {
    add_error(error);
    console.error(error);
})

document.querySelector("input[type='search']").addEventListener("input", () => {
    const awards = document.getElementsByClassName("award");

    Array.from(awards).forEach(award => {
        if (award.querySelector("h3").textContent.toLowerCase().includes(document.querySelector("input[type='search']").value.toLowerCase())) {
            award.style.display = "flex";
        } else {
            award.style.display = "none";
        }
    });
})