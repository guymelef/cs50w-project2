import os

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

users = []							# keep track of users in the server

rooms = ["general"]					# keep track of rooms and add new ones
messages = {"general" : []}			# store 100 recent messages from each room


@app.route("/")
def index():
	return render_template("index.html", rooms=rooms)


@app.route("/login", methods=["POST"])
def login():
	# Check if username already exists
	username = request.form.get("username").lower()
	if username in users:
		return jsonify({"success":False})

	# add new user to users
	users.append(username)
	return jsonify({"success":True})


@app.route("/newroom", methods=["POST"])
def newroom():
	# Check if room already exists
	room = request.form.get("room").lower()
	if room in rooms:
		return jsonify({"success":False})
	
	# Add new room to rooms
	rooms.append(room)
	messages[room] = []
	return jsonify({"success":True})

@app.route("/messages", methods=["POST"])
def getMessages():
	# Return messages list for room
	room = request.form.get("room")
	return jsonify(messages[room])


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

# Send message
@socketio.on("send message")
def message(data):
	# Store message
	messages[data["room"]].append({"user": data["user"], "dateString": data["date"], "timeString": data["time"], "message": data["message"]})
	if len(messages[data["room"]]) > 100:
		messages[data["room"]].pop(0)
	emit("new message", {"user": data["user"], "dateString": data["date"], "timeString": data["time"], "message": data["message"]}, room=data["room"])