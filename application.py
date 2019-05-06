import os

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)


users = {}									# keep track of users and their sid
channelMessages = {"general" : []}			# store 100 recent messages from each room


@app.route("/", methods=["GET", "POST"])
def index():
	if request.method == "POST":
		# Return messages list for room
		room = request.form.get("room")
		return jsonify(channelMessages[room])
	return render_template("index.html", channels=list(channelMessages.keys()))


# Verify username
@socketio.on("user check")
def userCheck(data):
	user = data["username"]
	# Check if user is new or not
	if users.get(user.lower()) is None:
		users[user.lower()] = request.sid
		emit("user checked", {"success":1, "user":user}, room=request.sid)
	else:
		emit("user checked", {"success":0}, room=request.sid)

# Verify room name
@socketio.on("room check")
def roomCheck(data):
	room = data["room"].lower()
	#Check if room exists
	if channelMessages.get(room) is None:
		channelMessages[room] = []
		emit("room checked", {"success":1, "room":room}, room=request.sid)
	else:
		emit("room checked", {"success":0}, room=request.sid)

# Broadcast new room except to sender
@socketio.on("create room")
def createRoom(data):
	room = data["room"]
	emit("announce new room", {"room":room}, broadcast=True, include_self=False)

# Join a room
@socketio.on("join room")
def join(data):
	user = data["user"]
	room = data["room"]
	join_room(room)
	emit("joined room", {"message": f"<strong>{user}</strong> has entered the channel."}, include_self=False, room=room)
	emit("welcome", {"message": f"Welcome to <strong>#{room}</strong> channel!"}, room=request.sid)

# Leave room
@socketio.on("leave room")
def leave(data):
	user = data["user"]
	room = data["room"]
	leave_room(room)
	emit("left room", {"message": f"<strong>{user}</strong> has left the channel."}, room=room)

# Broadcast message to room
@socketio.on("send message")
def message(data):
	# Store message
	channelMessages[data["room"]].append({"user": data["user"], "dateString": data["date"], "timeString": data["time"], "message": data["message"]})
	if len(channelMessages[data["room"]]) > 100:
		channelMessages[data["room"]].pop(0)
	emit("new message", {"user": data["user"], "dateString": data["date"], "timeString": data["time"], "message": data["message"]}, room=data["room"])


if __name__ == '__main__':
    socketio.run(app)