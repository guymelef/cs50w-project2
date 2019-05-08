let socket;

document.addEventListener("DOMContentLoaded", () => {   // START OF 'DOMContentLoaded' listener code
    
    // Hide/disable some elements by default
    document.querySelector("#create-room").style.display = "none";
    document.querySelector("#room-created").style.display = "none";
    document.querySelector("#not-welcome").style.display = "none";
    document.querySelector("#room-exists").style.display = "none";
    document.querySelector("#submit-chat").disabled = true;

    // Connect to websocket
    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => {                                // START OF SOCKET 'connect' CODE
        
        console.log("OH MY, IT'S ALIVE!!!");
    
        // Check if user is new or not
        if (!localStorage.getItem("user")) {
            document.querySelector("#blink").style.animationPlayState = "paused";
            document.querySelector(".modal").style.display = "block";
            setTimeout(() => {
                document.querySelector("#username").focus();
            }, 500);

            // Emit event to check username
            document.querySelector("#new-user").onsubmit = () => {
                const username = document.querySelector("#username").value;
                socket.emit("user check", {"username": username});
                return false;
            }
        } else {
            // Join user's lastRoom
            document.querySelector("#welcome").innerHTML = `O hai, <u>${localStorage.getItem("user")}</u>!`;
            const lastRoom = localStorage.getItem("lastRoom");
            document.querySelector(`select>optgroup>option[value="${lastRoom}"]`).selected = true;
            socket.emit("join room", {"room": lastRoom, "user": localStorage.getItem("user")});
            getMessages(lastRoom);
        }
        
        // Enable submit button when input box has content
        document.querySelector("#chat-message").onkeyup = () => {
            
            // Check if message only has spaces
            let message = document.querySelector("#chat-message").value;
            message = message.trim();
            if (message.length > 0)
                document.querySelector("#submit-chat").disabled = false;
            else
                document.querySelector("#submit-chat").disabled = true;
        };

        // Enable submit button when user attaches a file
        document.querySelector("#file-upload").onchange = () => {
            document.querySelector("label[for='file-upload']").style.color = "darkslategray";
            document.querySelector("#submit-chat").value = "Send";
            document.querySelector("#submit-chat").disabled = false;
        }


        // When user types a message in chat box
        document.querySelector("#new-message").onsubmit = () => {

            // Get message timestamp
            const date = new Date();
            const dateString = date.toDateString();
            const timeString = date.toLocaleTimeString("en-US");
            // Store message
            const message = document.querySelector("#chat-message").value;
            // Store username
            const user = localStorage.getItem("user");
            // Store current selected room
            const room = localStorage.getItem("lastRoom");

            const messageDict = {"room": room, "user": user, "date": dateString, "time": timeString, "message": message};

            // If user uploads a file
            if (document.querySelector("#file-upload").value.length > 0) {
                // Send AJAX request
                const file = document.querySelector("#file-upload").files[0];
                const upload = uploadFile(file, messageDict);
            } else {
                // Emit "send message" event to selected room if there's no file attached
                socket.emit("send message", messageDict);
            }
            
            // Clear input field and disable button again
            document.querySelector("label[for='file-upload']").style.color = "darkgray";
            document.querySelector("#file-upload").value = "";
            document.querySelector("#chat-message").value = "";
            document.querySelector("#submit-chat").disabled = true;

            // Stop form from submitting
            return false;
        };
        
        // Show room creation div when button is clicked
        document.querySelector("#add-room").onclick = () => {
            if (document.querySelector("#create-room").style.display == "none") {            
                document.querySelector("#add-room").value = "-";            
                document.querySelector("#create-room").style.display = "block";
                document.querySelector("#new-room").focus();
            } else {
                document.querySelector("#add-room").value = "+";
                document.querySelector("#create-room").style.display = "none";
            }
        }

       // Check room name with server
       document.querySelector("#create-room").onsubmit = () => {
            const room = document.querySelector("#new-room").value;
            socket.emit("room check", {"room": room});
            return false;
       }

       // When user switches room from select options
       document.querySelector("select").onchange = function() {
            socket.emit("join room", {"room": this.value, "user": localStorage.getItem("user")});
            document.querySelector("#chat-box").innerHTML = "";
            socket.emit("leave room", {"room": localStorage.getItem("lastRoom"), "user": localStorage.getItem("user")});
            localStorage.setItem("lastRoom", this.value);
            document.querySelector("#chat-message").focus();
            getMessages(this.value);
       }
   });                                                               // END OF SOCKET CONNECTED CODE

    // After checking username with server
    socket.on("user checked", data => {
        if (data["success"]) {
            localStorage.setItem("user", data["user"]);
            document.querySelector(".modal").style.display = "none";
            document.querySelector("#welcome").innerHTML = `O hai, <u>${data["user"]}</u>!`;
            document.querySelector("#blink").style.animationPlayState = "running";

            // Have new user join #general room by default
            localStorage.setItem("lastRoom", "general");
            document.querySelector("select>optgroup>option[value='general']").selected;
            socket.emit("join room", {"room": "general", "user": data["user"]});
            document.querySelector("#chat-message").focus();
            getMessages("general");
        } else {
            document.querySelector("#not-welcome").style.display = "block";
            setTimeout(() => {
                document.querySelector("#not-welcome").style.display = "none";
            }, 2000);
        }
    })

    // After checking room name with server
    socket.on("room checked", data => {
        if (data["success"]) {
            // Leave lastRoom, append new room, then emit "join room"
            socket.emit("leave room", {"room": localStorage.getItem("lastRoom"), "user": localStorage.getItem("user")});
            const option = document.createElement("option");
            option.value = data["room"];
            option.text = `# ${data["room"]}`;
            document.querySelector("select>optgroup").append(option);
            document.querySelector(`select>optgroup>option[value="${data["room"]}"]`).selected = true;
            localStorage.setItem("lastRoom", data["room"]);               
            socket.emit("join room", {"room": data["room"], "user": localStorage.getItem("user")});
            document.querySelector("#chat-box").innerHTML = "";
            document.querySelector("#chat-message").focus();

            // Emit "create room" event to others
            socket.emit("create room", {"room":data["room"]});
            
            // Hide/show elements
            document.querySelector("#new-room").value = "";
            document.querySelector("#create-room").style.display = "none";
            document.querySelector("#room-created").style.display = "block";
            setTimeout(() => { 
                document.querySelector("#room-created").style.display = "none";
                document.querySelector("#add-room").value = "+";}, 2000);
        } else {
            document.querySelector("#room-exists").style.display = "block";
            setTimeout(() => {
                document.querySelector("#room-exists").style.display = "none";
            }, 2000);
        }
    })


   // When a new room is announced, add to select options
   socket.on("announce new room", data => {
        const option = document.createElement("option");
        option.value = data["room"];
        option.text = `# ${data["room"]}`;
        document.querySelector("select>optgroup").append(option);
   })

   // When a user joins a room
   socket.on("joined room", data => {
        let message = data["message"];
        message = `<div class="join-div username">► ${message}</div>`;
        document.querySelector("#chat-box").innerHTML += message;
        document.querySelector("#chat-box").scrollTo(0, 999999);
   })

   // Welcome user to new room
   socket.on("welcome", data => {
        let message = data["message"];
        message = `<div class="welcome-div username">◄ ${message} ►</div>`;
        document.querySelector("#chat-box").innerHTML += message;
        document.querySelector("#chat-box").scrollTo(0, 999999);
        setTimeout(() => {
            document.querySelector(".welcome-div").style.display = "none";
        },3000);
   })

   // When a user leaves a room
   socket.on("left room", data => {
        let message = data["message"];
        message = `<div class="leave-div username">◄ ${message}</div>`;
        document.querySelector("#chat-box").innerHTML += message;
        document.querySelector("#chat-box").scrollTo(0, 999999);
   })

   // When new message arrives
   socket.on("new message", data => {
        // Send data to help function to process
        const content = processMessage(data);

        // Scroll to bottom
        document.querySelector("#chat-box").scrollTo(0, 999999);
   })
}); // END OF 'DOMContentLoaded' listener code


// HELPER FUNCTIONS
function processMessage(data) {
    // Process handlebars script
    const template = Handlebars.compile(document.querySelector("#message").innerHTML);
    const dateString = new Date().toDateString();
    let timestamp = "";
    if (dateString == data["dateString"])
        data["timestamp"] = `Today at ${data["timeString"]}`;
    else
        data["timestamp"] = data["dateString"].slice(4) + ` at ${data["timeString"]}`;
    
    const content = template(data);
    document.querySelector("#chat-box").innerHTML += content;
}

function getMessages(room) {
    // Create AJAX request, check room name with server
    const request = new XMLHttpRequest();
    request.open("POST", "/");

    // When request completes
    request.onload = () => {

           const messages =  JSON.parse(request.responseText);
           console.log(messages);
           if (messages.length > 0) {
            messages.forEach(message => {
                // Send data to help function to process                
                const content = processMessage(message);
            })
           }
           document.querySelector("#chat-box").scrollTo(0, 999999);
    }

    // Add data to send with request
    const data = new FormData();
    data.append("room", room);

    // Send request
    request.send(data);
    return false;  
}

function uploadFile(file, message) {
    const request = new XMLHttpRequest();
    request.open("POST", "/");

        // When request completes
        request.onload = () => {

            const data = JSON.parse(request.responseText);
            // If upload succeeds:
            if (data["success"]) {
                message["file"] = {"url": data["url"], "filename": data["filename"], "filetype": data["filetype"]};
                socket.emit("send message", message);
            } else {
                alert("Something's not right. :|");
            }
        }

    // Add data to send with request
    const data = new FormData();
    data.append("file", file);

    // Send request
    request.send(data);
    return false;
}

Handlebars.registerHelper("fileTypeCheck", function(file) {
    const type = file.filetype;
    const name = file.filename;
    const url = file.url;

    if (["jpg", "jpeg", "png", "gif"].includes(type.split("/")[1])) {
        return new Handlebars.SafeString(
            "<a href='" + url + "' target=\"_blank\">" + "<img id=\"uploaded-img\" src='" + url + "'></a>"
        );
    };

    if (type === "application/pdf") {
        return new Handlebars.SafeString(
            "<a href='" + url + "' target=\"_blank\"><i class=\"far fa-file-pdf\"></i> " + name + "</a>"
        );
    }

    if (type === "text/plain") {
        return new Handlebars.SafeString(
            "<a href='" + url + "' target=\"_blank\"><i class=\"far fa-file-alt\"></i> " + name + "</a>"
        );
    }

})