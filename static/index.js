document.addEventListener("DOMContentLoaded", () => {
    
    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => { 
        console.log("SUCCESS! SOCKET IS CONNECTED.");
    });

    // Hide/disable some elements by default
    document.querySelector(".create-room").style.display = "none";
    document.querySelector("#room-created").style.display = "none";
    document.querySelector("#not-welcome").style.display = "none";
    document.querySelector("#room-exists").style.display = "none";
    document.querySelector("#submit-chat").disabled = true;

    // Check if user is new or not
    if (!localStorage.getItem("user")) {
        document.querySelector(".modal").style.display = "block";
        document.querySelector("#blink").style.animationPlayState = "paused";
        let username;

        document.querySelector("#new-user").onsubmit = () => {
            username = document.querySelector("#username").value;

            // Create AJAX request, check username with server
            const request = new XMLHttpRequest();
            request.open("POST", "/login");

            // When request completes
            request.onload = () => {

                // Extract JSON
                const data = JSON.parse(request.responseText);

                // Check if username is accepted
                if (data.success) {
                    localStorage.setItem("user", username);
                    document.querySelector(".modal").style.display = "none";
                    document.querySelector("#welcome").innerHTML = `O hai, <u>${username}</u>!`;
                    document.querySelector("#blink").style.animationPlayState = "running";

                    // Have new user join #general room by default
                    localStorage.setItem("lastRoom", "general");
                    document.querySelector("select>optgroup>option[value='general']").selected;
                    socket.emit("join room", {"room": "general", "user": username});

                    // Stop form from submitting
                    return false;
                } else {
                    document.querySelector("#not-welcome").style.display = "block";
                    setTimeout(() => {
                        document.querySelector("#not-welcome").style.display = "none";
                    }, 2000);
                }
            }

            // Add data to send with request
            const data = new FormData();
            data.append("username", username);

            // Send request
            request.send(data);
            return false;      
        }
    } else {
        // Join user's lastRoom
        document.querySelector("#welcome").innerHTML = `O hai, <u>${localStorage.getItem("user")}</u>!`;
        const lastRoom = localStorage.getItem("lastRoom");
        document.querySelector(`select>optgroup>option[value=${lastRoom}]`).selected = true;
        socket.emit("join room", {"room": lastRoom, "user": localStorage.getItem("user")});
    }
    
    // Enable submit button when input box has content
    document.querySelector('#chat-message').onkeyup = () => {
        // Check if message only has spaces
        let message = document.querySelector('#chat-message').value;
        message = message.trim();

        if (message.length > 0)
            document.querySelector('#submit-chat').disabled = false;
        else
            document.querySelector('#submit-chat').disabled = true;
    };

    // When user types a message in chat box
    document.querySelector("#new-message").onsubmit = () => {

        // Template for chat box messages
        const template = Handlebars.compile(document.querySelector("#message").innerHTML);

        // Get message timestamp
        const date = new Date();
        const timestamp = date.getHours() + ":" + date.getMinutes();
        // Store message
        const message = document.querySelector("#chat-message").value;
        // Store username
        const username = localStorage.getItem("user");

        // Add message to DOM
        const content = template({"timestamp":timestamp, "message":message, "username":username});
        document.querySelector("#chat-box").innerHTML += content;
        // Clear input field and disable button again
        document.querySelector('#chat-message').value = '';
        document.querySelector('#submit-chat').disabled = true;

        // Stop form from submitting
        return false;
    };
    
    // Show room creation div when button is clicked
    document.querySelector("#add-room").onclick = () => {
        if (document.querySelector(".create-room").style.display == "none") {            
            document.querySelector("#add-room").value = "-";            
            document.querySelector(".create-room").style.display = "block";
        } else {
            document.querySelector("#add-room").value = "+";
            document.querySelector(".create-room").style.display = "none";
        }
    }

   // When user creates new room
   document.querySelector("#create-room").onsubmit = () => {
        const room = (document.querySelector("#new-room").value).toLowerCase();

        // Create AJAX request, check room name with server
        const request = new XMLHttpRequest();
        request.open("POST", "/newroom");

        // When request completes
        request.onload = () => {

            // Extract JSON
            const data = JSON.parse(request.responseText);

            // Check if room name is accepted
            if (data.success) {
                localStorage.setItem("lastRoom", room);
                
                // Append new room then emit "join room" event
                const option = document.createElement("option");
                option.value = room;
                option.text = `# ${room}`;
                document.querySelector("select>optgroup").append(option);
                document.querySelector(`select>optgroup>option[value=${room}]`).selected = true;
                socket.emit("join room", {"room": room, "user": localStorage.getItem("user")})
                
                // Emit "create room" event to others except sender
                socket.emit("create room", {"room":room});
                
                // Hide/show elements
                document.querySelector("#new-room").value = "";
                document.querySelector(".create-room").style.display = "none";
                document.querySelector("#room-created").style.display = "block";
                setTimeout(() => { 
                    document.querySelector("#room-created").style.display = "none";
                    document.querySelector("#add-room").value = "+";}, 1500);

                // Stop form from submitting
                return false;
            } else {
                document.querySelector("#room-exists").style.display = "block";
                setTimeout(() => {
                    document.querySelector("#room-exists").style.display = "none";
                }, 2000);
            }
        }

        // Add data to send with request
        const data = new FormData();
        data.append("room", room);

        // Send request
        request.send(data);
        return false;
   }

   // Trigger "join room" event when switching rooms
   document.querySelector("select").onchange = function() {
        localStorage.setItem("lastRoom", this.value);
        socket.emit("join room", {"room": this.value, "user": localStorage.getItem("user")})
   }

   // When a new room is announced, add to select options
   socket.on("announce new room", data => {
        const option = document.createElement("option");
        option.value = data.room;
        option.text = `# ${data.room}`;
        document.querySelector("select>optgroup").append(option);
   })

   // When a user joins a room
   socket.on("joined room", data => {
        let message = data["message"];
        message = `<div class="join-div username">${message}</div>`;
        document.querySelector("#chat-box").innerHTML += message;
   })

});