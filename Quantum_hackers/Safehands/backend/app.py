from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, uuid, datetime

app = Flask(__name__)
CORS(app)

USER_DB = "users.json"
CRIME_DB = "crime_data.json"
CRIMINAL_DB = "criminals.json"


# ------------------ Helpers ------------------
def load(db):
    if not os.path.exists(db):
        with open(db, "w") as f:
            json.dump([], f)
    with open(db, "r") as f:
        return json.load(f)

def save(db, data):
    print(f"Saving to {db}: {data}")  # debug
    with open(db, "w") as f:
        json.dump(data, f, indent=4)


def new_id():
    return "id_" + uuid.uuid4().hex[:8]


# ------------------ AUTH ------------------
@app.route("/signup", methods=["POST"])
def signup():
    users = load(USER_DB)
    data = request.json
    email = data.get("email")

    if any(u["email"] == email for u in users):
        return jsonify({"status": "error", "message": "Email already registered"}), 400

    user = {
        "id": new_id(),
        "name": data.get("name"),
        "email": email,
        "password": data.get("password")
    }

    users.append(user)
    save(USER_DB, users)

    return jsonify({"status": "success", "message": "Signup successful"})


@app.route("/login", methods=["POST"])
def login():
    users = load(USER_DB)
    data = request.json

    for u in users:
        if u["email"] == data["email"] and u["password"] == data["password"]:
            return jsonify({"status": "success", "user": u})

    return jsonify({"status": "error", "message": "Invalid credentials"}), 401


# ------------------ CRIME REPORT (GIS) ------------------
@app.route("/crime/add", methods=["POST"])
def add_crime():
    crimes = load(CRIME_DB)
    data = request.json

    crime = {
        "id": new_id(),
        "lat": data["lat"],
        "lon": data["lon"],
        "type": data["type"],
        "date": data.get("date", str(datetime.date.today())),
        "time": data.get("time", "00:00"),
        "status": "new"
    }

    crimes.append(crime)
    save(CRIME_DB, crimes)

    return jsonify({"status": "success", "message": "Crime added"})


@app.route("/crime/all", methods=["GET"])
def get_all_crimes():
    return jsonify(load(CRIME_DB))


@app.route("/crime/update_status", methods=["POST"])
def update_crime_status():
    crimes = load(CRIME_DB)
    data = request.json

    for c in crimes:
        if c["id"] == data["id"]:
            c["status"] = data["status"]

    save(CRIME_DB, crimes)
    return jsonify({"status": "success"})


# ------------------ CRIMINAL RECORDS ------------------
@app.route("/criminal/add", methods=["POST"])
def add_criminal():
    crims = load(CRIMINAL_DB)
    data = request.json

    criminal = {
        "id": new_id(),
        "name": data["name"],
        "age": data["age"],
        "height": data["height"],
        "crime": data["crime"],
        "risk": data["risk"],
        "status": data["status"]
    }

    crims.append(criminal)
    save(CRIMINAL_DB, crims)

    return jsonify({"status": "success"})


@app.route("/criminal/all", methods=["GET"])
def get_criminals():
    return jsonify(load(CRIMINAL_DB))


@app.route("/criminal/delete", methods=["POST"])
def delete_criminal():
    crims = load(CRIMINAL_DB)
    data = request.json

    new_list = [c for c in crims if c["id"] != data["id"]]
    save(CRIMINAL_DB, new_list)
    print("New report added:", new_report)

    return jsonify({"status": "success"})




# ------------------ START SERVER ------------------
if __name__ == "__main__":
    app.run(debug=True)
