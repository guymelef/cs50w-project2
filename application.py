import os

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

rooms = ["general"]					# keep track of rooms and add new ones
users = []							# keep track of users in the server

@app.route("/")
def index():
    return render_template("index.html", rooms=rooms)

@app.route("/login", methods=["POST"])
def login():

	# Check if username already exists
	username = request.form.get("username")
	if username.lower() in users:
		return jsonify({"success":False})

	# add new user to users
	users.append(username.lower())
	return jsonify({"success":True})

@app.route("/newroom", methods=["POST"])
def newroom():

	# Check if room already exists
	room = request.form.get("room")
	if room.lower() in rooms:
		return jsonify({"success":False})

	#add new room to rooms
	rooms.append(room.lower())
	return jsonify({"success":True})

if __name__ == '__main__':
    socketio.run(app, debug=True)