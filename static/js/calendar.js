const socket = io("/calendar_room", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000
});

socket.on("connect", () => {
    console.log("Connected to calendar room");
})

socket.on("calendar_updated", () => {
    const timestamp = new Date().getTime();
    document.getElementById("calendar").src = `/static/pdf/annual_calendar.pdf?t=${timestamp}#toolbar=0&#zoom=page-width`
})