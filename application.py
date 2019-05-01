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
    return render_template("index.html")


@app.route("/login", methods=["POST"])
def login():

	# Check users variable for username
	username = request.form.get("username")
	if username.lower() in users:
		return jsonify({"success":False})

	# add new user to users
	users.append(username.lower())
	return jsonify({"success":True})

if __name__ == '__main__':
    socketio.run(app, debug=True)