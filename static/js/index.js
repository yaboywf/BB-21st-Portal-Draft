setInterval(() => {
    const current_image = document.querySelector(".slider").getAttribute("data-slide");
    document.querySelector(".slider").setAttribute("data-slide", ((current_image % 9) + 1));
}, 4000);

const scrollers = document.querySelectorAll(".scroller");

scrollers.forEach((scroller) => {
    const scrollerInner = scroller.querySelector(".scroller > div");
    const scrollerContent = Array.from(scrollerInner.children);

    scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        duplicatedItem.setAttribute("aria-hidden", true);
        scrollerInner.appendChild(duplicatedItem);
    });
});