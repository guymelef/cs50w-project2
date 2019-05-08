import os

from flask import Flask, render_template, request, jsonify, url_for, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = set(["txt", "pdf", "png", "jpg", "jpeg", "gif"])

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
socketio = SocketIO(app)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

users = {}									# keep track of users and their sid
channelMessages = {"general" : []}			# store 100 recent messages from each room


@app.route("/", methods=["GET", "POST"])
def index():
	if request.method == "POST":

		if request.form.get("room"):
			# Return messages list for room
			room = request.form.get("room")
			return jsonify(channelMessages[room])

		if request.files["file"]:
			file = request.files["file"]
			if file and allowed_file(file.filename):
				filename = secure_filename(file.filename)
				file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
				return jsonify({"success":1, "url":url_for("uploaded_file", filename=filename), "filetype":file.content_type, "filename":filename})
			return jsonify({"success":0})

	return render_template("index.html", channels=list(channelMessages.keys()))

@app.route('/uploads/<filename>')
def uploaded_file(filename):
	return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


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
	print(data);
	messageDict = {"user": data["user"], "dateString": data["date"], "timeString": data["time"], "message": data["message"]}
	if "file" in data.keys():
		messageDict["file"] = data["file"]
	channelMessages[data["room"]].append(messageDict)
	if len(channelMessages[data["room"]]) > 100:
		channelMessages[data["room"]].pop(0)
	emit("new message", messageDict, room=data["room"])


if __name__ == "__main__":
	socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))