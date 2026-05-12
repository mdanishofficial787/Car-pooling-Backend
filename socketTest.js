const io = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {

    console.log("Connected");

    socket.emit("driver:location:update", {
        tripId: 101,
        latitude: 33.6844,
        longitude: 73.0479
    });
});


socket.on("trip:location:update", (data) => {
    console.log("Live Update:", data);
});