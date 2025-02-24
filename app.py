from flask import Flask, render_template, request, redirect, flash, jsonify, session, make_response, abort
from flask_compress import Compress
from flask_caching import Cache
from flask_socketio import SocketIO, emit, join_room, leave_room
import sqlite3, bcrypt, pyotp, qrcode, uuid, os
from functools import wraps
from typing import Literal
from datetime import datetime, timedelta
from encryption import *
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = "sure_stedfast"
app.config.update(
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_NAME='authentication',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8)
)
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
app.config['SESSION_COOKIE_DOMAIN'] = None

Compress(app)

cache = Cache(app, config={
    'CACHE_TYPE': 'simple',
    'CACHE_DEFAULT_TIMEOUT': 300
})

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.session_protection = "strong"
login_manager.login_view = "login"

conn = sqlite3.connect('database.db', check_same_thread=False)
cursor = conn.cursor()

appt_holder_room_users = {}
nco_council_room_users = {}
blacklist_tokens = set()

RANKS = {
    "REC": "Recruit (REC)",
    "LCP": "Lance Corporal (LCP)",
    "CPL": "Corporal (CPL)",
    "SGT": "Sergeant (SGT)",
    "SSG": "Staff Sergeant (SSG)",
    "WO": "Warrant Officer (WO)",
    "OCT": "Officer Cadet (OCT)",
    "2LT": "Second Lieutenant (2LT)",
    "LTA": "Lieutenant (LTA)",
}

class User(UserMixin):
    def __init__(self, id: int, username: str, name: str, abb_name: str, account_type: Literal["Boy", "Primer", "Officer"], rank: Literal["REC", "LCP", "CPL", "SGT", "SSG", "WO", "CLT", "SCL", "OCT", "2LT", "LTA", "NIL"], attendance: bool = True):
        self.id = id
        self.name = name
        self.username = username
        self.abb_name = abb_name
        self.type = account_type
        self.rank = rank
        self.attendance = attendance

class Boy(User):
    def __init__(self, id: int, username: str, name: str, abb_name: str, account_type: Literal["Boy", "Primer", "Officer"], rank: Literal["REC", "LCP", "CPL", "SGT", "SSG", "WO"], member_id: int, secondary: int, sec1_class:str, sec2_class: str, sec3_class: str, sec4_class: str, sec5_class: str, sec1_rank: Literal["REC", "LCP", "CPL", "SGT", "SSG", "WO"], sec2_rank: Literal["REC", "LCP", "CPL", "SGT", "SSG", "WO"], sec3_rank: Literal["REC", "LCP", "CPL", "SGT", "SSG", "WO"], sec4_rank: Literal["REC", "LCP", "CPL", "SGT", "SSG", "WO"], graduated: bool = False, attendance: bool = True, appt_holder:bool = False):
        super().__init__(id, username, name, abb_name, account_type, rank, attendance)
        self.member_id = member_id
        self.secondary = secondary
        self.sec1_class = sec1_class
        self.sec2_class = sec2_class
        self.sec3_class = sec3_class
        self.sec4_class = sec4_class
        self.sec4_class = sec5_class
        self.sec1_rank = sec1_rank
        self.sec2_rank = sec2_rank
        self.sec3_rank = sec3_rank
        self.sec4_rank = sec4_rank
        self.graduated = graduated
        self.appt_holder = appt_holder

class Primer(User):
    def __init__(self, id: int, username: str, name: str, abb_name: str, account_type: Literal["Boy", "Primer", "Officer"], rank: Literal["NIL", "CLT", "SCL"], credentials: str, attendance: bool = True):
        super().__init__(id, username, name, abb_name, account_type, rank, attendance)
        self.credentials = credentials

class Officer(User):
    def __init__(self, id: int, username: str, name: str, abb_name: str, account_type: Literal["Boy", "Primer", "Officer"], rank: Literal["OCT", "2LT", "LTA"], user_class: Literal["STAFF", "UNI", "POLY", "VAL"], honorifics: Literal["MR", "MS", "MRS"], credentials: str, attendance: bool = True):
        super().__init__(id, username, name, abb_name, account_type, rank, attendance)
        self.honorifics = honorifics
        self.user_class = user_class
        self.credentials = credentials

@login_manager.user_loader
def load_user(user_id):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users_officers;")
    officers = cursor.fetchall()
    cursor.close()

    cursor1 = conn.cursor()
    cursor1.execute("SELECT * FROM users_boys;")
    boys = cursor1.fetchall()
    cursor1.close()

    cursor2 = conn.cursor()
    cursor2.execute("SELECT * FROM users_primers;")
    primers = cursor2.fetchall()
    cursor2.close()

    users = officers + primers + boys

    for user in users:
        if user[0] == int(user_id):
            if decrypt(user[5]).lower() == "officer":
                return Officer(user[0], decrypt(user[2]), decrypt(user[1]), decrypt(user[3]), decrypt(user[5]), decrypt(user[4]), decrypt(user[8]), decrypt(user[7]), decrypt(user[10]), decrypt(user[9]))
            elif decrypt(user[5]).lower() == "primer":
                return Primer(user[0], decrypt(user[2]), decrypt(user[1]), decrypt(user[3]), decrypt(user[5]), decrypt(user[4]), decrypt(user[8]), decrypt(user[7]))
            else:
                cursor3 = conn.cursor()
                cursor3.execute("SELECT COUNT(*) FROM appointment_holders WHERE user_id = ?", [user[0]])
                count = int(cursor3.fetchone()[0])
                cursor3.close()
                return Boy(user[0], decrypt(user[2]), decrypt(user[1]), decrypt(user[3]), decrypt(user[5]), decrypt(user[4]), decrypt(user[7]), decrypt(user[8]), decrypt(user[9]), decrypt(user[10]), decrypt(user[11]), decrypt(user[12]), decrypt(user[13]), decrypt(user[14]), decrypt(user[15]), decrypt(user[16]), decrypt(user[16]), bool(user[18]), decrypt(user[19]), True if count > 0 else False)
    return None

def api_route(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.headers.get("X-Source") != "bb21portal":
            abort(403)

        return f(*args, **kwargs)
    return decorated_function
    
def login_required1(account_types: list, appt_holders: bool = False):  
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect('/login')

            if current_user.type.capitalize() not in account_types and not (appt_holders and appt_holders == current_user.appt_holder):
                abort(403)

            session_token = session.get("token", None)

            if session_token in blacklist_tokens or session.get("ip_address") != request.remote_addr:
                abort(401)

            cursor = conn.cursor()
            cursor.execute("SELECT setting_value FROM settings WHERE id = 1")
            lockdown = cursor.fetchone()[0]

            if int(lockdown) == 1:
                abort(423)

            return f(*args, **kwargs)
        return decorated_function
    return decorator

def no_cache(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = f(*args, **kwargs)
        if isinstance(response, str):
            response = make_response(response)

        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    return decorated_function

@app.after_request
def set_referrer_policy(response):
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/parade_notice')
def parade_notice():
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM parade_notices WHERE date(parade_date) > date('now') ORDER BY date(parade_date) LIMIT 1;")
    result = cursor.fetchone()[0] if cursor.fetchone() else None

    return render_template('parade_notice.html', date=result) 

@app.route("/dashboard")
@login_required
@no_cache
@login_required1(["Officer", "Primer", "Boy"])
def dashboard():
    cursor = conn.cursor()
    cursor.execute("SELECT parade_date, cos_id, flag_bearer FROM parade_notices WHERE parade_date >= DATE('now') AND (cos_id = ? OR flag_bearer = ?);", [current_user.id, current_user.id])
    result = cursor.fetchall()

    columns = [description[0] for description in cursor.description]
    roles = [dict(zip(columns, row)) for row in result]

    cursor.execute("SELECT u.id, u.rank, u.user_name, p.parade_date, u.attendance_appearance FROM users_boys u JOIN parade_notices p ON 1=1 LEFT JOIN attendance a ON u.id = a.user_id AND a.parade_id = p.id WHERE a.user_id IS NULL;")
    result1 = cursor.fetchall()

    columns1 = [description[0] for description in cursor.description]
    attendance_boys = [dict(zip(columns1, row)) for row in result1]

    for user in attendance_boys:
        user["user_name"] = decrypt(user["user_name"].encode())
        user["rank"] = decrypt(user["rank"].encode())
        if user.get("attendance_appearance"):
            user["attendance_appearance"] = decrypt(user["attendance_appearance"].encode())

    grouped_parades = {date: [notice for notice in attendance_boys if notice['parade_date'] == date] for date in set(notice['parade_date'] for notice in attendance_boys)}        

    cursor.execute("SELECT CASE WHEN ABS(DATE('now') - DATE('next saturday')) < 2 AND NOT EXISTS (SELECT 1 FROM parade_notices WHERE parade_date = DATE('next saturday')) THEN '0' ELSE '1' END AS result;")
    parade_notice_exist = cursor.fetchone()

    cursor.execute("SELECT parade_date FROM parade_notices WHERE date(parade_date) > date('now') ORDER BY date(parade_date) LIMIT 1;")
    parade_notice = cursor.fetchone()[0] if cursor.fetchone() else None

    cursor.execute("SELECT date('now', 'weekday 6');")
    nearest_sat = cursor.fetchone()

    return render_template("dashboard.html", roles=roles, attendance=grouped_parades, parade_notice_exist=parade_notice_exist, parade_notice=parade_notice, nearest_sat=nearest_sat)

@app.route("/profile")
@login_required
@no_cache
@login_required1(["Officer", "Boy", "Primer"])
def profile():
    return render_template("profile.html", ranks=RANKS)

@app.route("/reset_login_information")
@login_required
@no_cache
@login_required1(["Officer", "Boy", "Primer"])
def reset():
    return render_template("reset_login.html")

@app.route("/change_password", methods=["PUT"])
@login_required
@login_required1(["Officer", "Boy", "Primer"])
@no_cache
@api_route
def change_password():
    if request.method != "PUT":
        return redirect("/reset_login_information")

    current_password = request.form["current_password"]
    new_password = request.form["new_password"]
    confirm_password = request.form["confirm_password"]

    if current_user.type.lower() == "officer":
        cursor.execute("SELECT user_name, password FROM users_officers WHERE id = ?", [current_user.id])
        user = cursor.fetchone()
    else:
        cursor.execute("SELECT user_name, password FROM users_boys WHERE id = ?", [current_user.id])
        user = cursor.fetchone()
    
    if new_password != confirm_password:
        return jsonify({ "error": "Password does not match" })

    if user:
        if decrypt(user[0]) == current_user.username and bcrypt.checkpw(bytes(current_password, "utf-8"), bytes(user[1], "utf-8")):
            if current_user.type.lower() == "officer":
                cursor.execute("UPDATE users_officers SET password = ? WHERE id = ?", [bcrypt.hashpw(bytes(new_password, "utf-8"), bcrypt.gensalt()).decode("utf-8"), current_user.id])
            else:
                cursor.execute("UPDATE users_boys SET password = ? WHERE id = ?", [bcrypt.hashpw(bytes(new_password, "utf-8"), bcrypt.gensalt()).decode("utf-8"), current_user.id])
            
            conn.commit()

            return jsonify({ "updated": True })

        return jsonify({ "error": "Incorrect password" })

    return jsonify({ "error": "User not found" })

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/login/authenticate', methods=["POST"])
@api_route
def authenticate():
    if request.method != "POST":
        return redirect("/login")

    username = request.form["username"]
    password = request.form["password"]

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users_officers")
    officers = cursor.fetchall()
    cursor.close()

    cursor1 = conn.cursor()
    cursor1.execute("SELECT * FROM users_boys")
    boys = cursor1.fetchall()
    cursor1.close()

    cursor2 = conn.cursor()
    cursor2.execute("SELECT * FROM users_primers")
    primers = cursor2.fetchall()
    cursor2.close()

    users = officers + primers + boys

    for user in users:
        if decrypt(user[2]) == username and bcrypt.checkpw(password.encode('utf-8'), bytes(user[6], 'utf-8')):
            if decrypt(user[5]).lower() == "officer":
                user = Officer(user[0], decrypt(user[2]), decrypt(user[1]), decrypt(user[3]), decrypt(user[5]), decrypt(user[4]), decrypt(user[8]), decrypt(user[7]), decrypt(user[10]), decrypt(user[9]))
            elif decrypt(user[5]).lower() == "primer":
                user = Primer(user[0], decrypt(user[2]), decrypt(user[1]), decrypt(user[3]), decrypt(user[5]), decrypt(user[4]), decrypt(user[8]), decrypt(user[7]))
            else:
                cursor3 = conn.cursor()
                cursor3.execute("SELECT COUNT(*) FROM appointment_holders WHERE user_id = ?", [user[0]])
                count = int(cursor3.fetchone()[0])
                user = Boy(user[0], decrypt(user[2]), decrypt(user[1]), decrypt(user[3]), decrypt(user[5]), decrypt(user[4]), decrypt(user[7]), decrypt(user[8]), decrypt(user[9]), decrypt(user[10]), decrypt(user[11]), decrypt(user[12]), decrypt(user[13]), decrypt(user[14]), decrypt(user[15]), decrypt(user[16]), decrypt(user[16]), bool(user[18]), decrypt(user[19]), True if count > 0 else False)
            
            session_token = str(uuid.uuid4())
            ip_addr = request.remote_addr

            if session_token:
                session["token"] = session_token

            if ip_addr:
                session["ip_address"] = ip_addr

            login_user(user)

            return jsonify({ "status": "success", "redirect": "/dashboard" })
    
    return jsonify({ "error": "Incorrect username or password" })

@app.route('/user_authentication_status', methods=["GET"])
@login_required
@login_required1(["Officer", "Primer", "Boy"])
@api_route
def user_authentication_status():
    cursor = conn.cursor()
    cursor.execute("SELECT setting_value FROM settings WHERE id = 1;")
    lockdown = cursor.fetchone()[0]

    if int(lockdown) == 1:
        return jsonify({ "lockdown": True }), 200

    return jsonify({ "authenticated": current_user.is_authenticated }), 200

@app.route('/get_maintenance_status', methods=["GET"])
@api_route
def get_maintenance_status():
    cursor = conn.cursor()
    cursor.execute("SELECT setting_value FROM settings WHERE id = 2 OR id = 3")
    maintenance = cursor.fetchall()

    if maintenance[0][0] == "1":
        return jsonify({ "maintenance": True, "timing": maintenance[1][0] }), 200

    return jsonify({ "maintenance": False }), 200

@app.route('/get_all_badges', methods=["GET"])
@login_required
@login_required1(["Boy"])
@no_cache
@api_route
def get_all_badges():
    cursor.execute("SELECT * FROM badges")
    badges = cursor.fetchall()

    return jsonify({ "badges": badges })

@app.route('/get_attained_badges', methods=["GET"])
@login_required
@login_required1(["Boy"])
@no_cache
@api_route
def get_attained_badges():
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attained_badges WHERE user_id = ?", [current_user.id])
    badges = cursor.fetchall()

    updated_badges = []

    for badge in badges:
        badge = list(badge)
        badge[3] = decrypt(badge[3].encode('utf-8'))
        updated_badges.append(tuple(badge))

    return jsonify({ "attained_badges": updated_badges })

@app.route('/get_all_usernames', methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def get_all_usernames():
    cursor = conn.cursor()
    cursor.execute("SELECT id, rank, user_name, honorifics FROM users_officers")
    encrypted_officers = cursor.fetchall()
    officers_columns = [description[0] for description in cursor.description]

    cursor.execute("SELECT id, rank, user_name, graduated FROM users_boys")
    encrypted_boys = cursor.fetchall()
    boys_columns = [description[0] for description in cursor.description]

    cursor.execute("SELECT id, rank, user_name FROM users_primers")
    encrypted_primers = cursor.fetchall()
    primers_columns = [description[0] for description in cursor.description]
    cursor.close()

    officers = []
    primers = []
    boys = []

    for row in encrypted_officers:
        user = list(row)
        user[1] = decrypt(user[1].encode('utf-8'))
        user[2] = decrypt(user[2].encode('utf-8'))
        user[3] = decrypt(user[3].encode('utf-8'))
        officers.append(tuple(user))

    for row in encrypted_primers:
        user = list(row)
        user[1] = decrypt(user[1].encode('utf-8'))
        user[2] = decrypt(user[2].encode('utf-8'))
        primers.append(tuple(user))

    for row in encrypted_boys:
        user = list(row)
        user[1] = decrypt(user[1].encode('utf-8'))
        user[2] = decrypt(user[2].encode('utf-8'))
        boys.append(tuple(user))

    all_officers = [dict(zip(officers_columns, row)) for row in officers]
    all_primers = [dict(zip(primers_columns, row)) for row in primers]
    all_boys = [dict(zip(boys_columns, row)) for row in boys]
    
    return jsonify({
        "officers": all_officers,
        "primers": all_primers,
        "boys": all_boys
    })

@app.route('/get_one_user_details', methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def get_one_user_details():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({ "error": "Missing User ID field. Please try again." })
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users_officers WHERE id = ?", [user_id])
    user = cursor.fetchone()

    if not user:
        cursor.execute("SELECT * FROM users_boys WHERE id = ?", [user_id])
        user = cursor.fetchone()

    if not user:
        cursor.execute("SELECT * FROM users_primers WHERE id = ?", [user_id])
        user = cursor.fetchone()

    if not user:
        return jsonify({ "error": "User not found" }), 400

    columns = [description[0] for description in cursor.description]
    user = list(user)

    for i in range(len(user)):
        try:
            user[i] = decrypt(user[i].encode())
        except:
            pass

    decrypted_user = dict(zip(columns, user))
    return jsonify(decrypted_user)

@app.route("/awards")
@login_required
@login_required1(["Boy"])
@no_cache
def awards():
    return render_template("awards.html")

@app.route('/user_management')
@app.route('/user_management/current_users')
@login_required
@login_required1(["Officer", "Primer"], True)
@no_cache
def user_management_current():
    return render_template('user_management (current).html')

@login_required
@login_required1(["Officer", "Primer"], True)
@socketio.on('connect', namespace='/current_users_room')
def handle_current_user_connect():
    join_room("current_users_room")

@app.route('/create_new_user', methods=["POST"])
@login_required
@login_required1(["Officer", "Primer"], True)
@no_cache
@api_route
def create_new_user():
    if request.method != "POST":
        return redirect("/user_management/current_users")
    
    data = request.get_json()

    start = data.get("honorifics") if data.get("honorifics") else data.get("rank")
    
    if data.get("account_type").lower() == "officer":
        table = "users_officers"
    elif data.get("account_type").lower() == "primer":
        table = "users_primers"
    else:
        table = "users_boys"
    
    cursor = conn.cursor()

    if table == "users_boys":
        cursor.execute("SELECT MAX(id) FROM users_boys")
        result = cursor.fetchone()
        max_id = result[0] if result[0] is not None else 9999

        rank = ["NIL"] * 4
        rank[int(data["level"]) - 1] = "REC"        

        cursor.execute("INSERT INTO users_boys VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",[
            max_id + 1,
            encrypt(data["user_name"].title()).decode("utf-8"),
            encrypt(data["user_name"].title()).decode("utf-8"),
            encrypt(data["abb_name"].title()).decode("utf-8"),
            encrypt(data["rank"]).decode("utf-8"),
            encrypt(data["account_type"]).decode("utf-8"),
            bcrypt.hashpw(bytes(data["password"], "utf-8"), bcrypt.gensalt()).decode("utf-8"),
            encrypt("NIL").decode("utf-8"),
            encrypt(data["level"]).decode("utf-8"),
            encrypt("NIL").decode("utf-8"),
            encrypt("NIL").decode("utf-8"),
            encrypt("NIL").decode("utf-8"),
            encrypt("NIL").decode("utf-8"),
            encrypt("NIL").decode("utf-8"),
            encrypt(rank[0]).decode("utf-8"),
            encrypt(rank[1]).decode("utf-8"),
            encrypt(rank[2]).decode("utf-8"),
            encrypt(rank[3]).decode("utf-8"),
            False,
            encrypt(data.get("nominal_roll")).decode("utf-8"),
            False
        ])
        
        conn.commit()

    elif table == "users_primers":
        cursor.execute("SELECT MAX(id) FROM users_primers")
        result = cursor.fetchone()
        max_id = result[0] if result[0] is not None else 19999
        
        cursor.execute("INSERT INTO users_primers VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)",[
            max_id + 1,
            encrypt(data["user_name"].title()).decode("utf-8"),
            encrypt(data["user_name"].title()).decode("utf-8"),
            encrypt(data["abb_name"].title()).decode("utf-8"),
            encrypt(data["rank1"]).decode("utf-8"),
            encrypt(data["account_type"]).decode("utf-8"),
            bcrypt.hashpw(bytes(data["password"], "utf-8"), bcrypt.gensalt()).decode("utf-8"),
            encrypt(data.get("nominal_roll")).decode("utf-8"),
            encrypt(data.get("credential")).decode("utf-8"),
        ])

        conn.commit()

    elif table == "users_officers":
        cursor.execute("SELECT MAX(id) FROM users_officers")
        result = cursor.fetchone()
        max_id = result[0] if result[0] is not None else 0

        cursor.execute("INSERT INTO users_officers VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",[
            max_id + 1,
            encrypt(data["user_name"].title()).decode("utf-8"),
            encrypt(data["user_name"].title()).decode("utf-8"),
            encrypt(data["abb_name"].title()).decode("utf-8"),
            encrypt(data["rank2"]).decode("utf-8"),
            encrypt(data["account_type"]).decode("utf-8"),
            bcrypt.hashpw(bytes(data["password"], "utf-8"), bcrypt.gensalt()).decode("utf-8"),
            encrypt(data["honorifics"].upper()).decode("utf-8"),
            encrypt(data["class"]).decode("utf-8"),
            encrypt(data.get("nominal_roll")).decode("utf-8"),
            encrypt(data.get("credential1")).decode("utf-8"),
        ])

        conn.commit()

    emit("new_user_created", { "start": start, "user_name": data["user_name"].title(), "account_type": data["account_type"], "id": max_id + 1 }, namespace="/current_users_room", broadcast=True)
    return jsonify({ "status": "success" })

@app.route('/delete_user', methods=["DELETE"])
@login_required
@login_required1(["Officer", "Primer"], True)
@no_cache
@api_route
def delete_user():
    if request.method != "DELETE":
        return redirect("/user_management/current_users")
    
    user_id = request.args.get('user_id')
    requested_user = request.args.get('sid')

    cursor = conn.cursor()
    cursor.execute("DELETE FROM users_officers WHERE id = ?", [user_id])
    cursor.execute("DELETE FROM users_boys WHERE id = ?", [user_id])
    cursor.execute("DELETE FROM appointment_holders WHERE user_id = ?", [user_id])
    cursor.execute("DELETE FROM attained_badges WHERE user_id = ?", [user_id])
    conn.commit()

    emit("user_deleted", { "user_id": user_id }, namespace="/current_users_room", broadcast=True)
    emit("user_deleted", { "user_id": user_id }, namespace="/graduated_boys_room", broadcast=True)
    emit("user_deleted_host", room=requested_user, namespace="/current_users_room")
    emit("user_deleted_host", room=requested_user, namespace="/graduated_boys_room")
    emit("user_deleted", namespace="/awards_tracker_room", broadcast=True)
    return jsonify({ "status": "success" })

@app.route('/update_user', methods=["PUT"])
@login_required
@login_required1(["Officer", "Primer"], True)
@no_cache
@api_route
def update_user():
    if request.method != "PUT":
        return redirect("/user_management/current_users")

    data = request.get_json()
    
    if data["account_type"].lower() == "boy":
        sql = "UPDATE users_boys SET user_name = ?, abbreviated_name = ?, attendance_appearance = ?, account_type = ?, rank = ?, secondary = ?, member_id = ?, graduated = ?, sec1_class = ?, sec1_rank = ?, sec2_class = ?, sec2_rank = ?, sec3_class = ?, sec3_rank = ?, sec4_class = ?, sec4_rank = ?, sec5_class = ? WHERE id = ?;"
        parameters = [encrypt(data['user_name']).decode(), encrypt(data['abb_name']).decode(), encrypt(data['nominal_roll']).decode(), encrypt(data['account_type']).decode(), encrypt(data['rank']).decode(), encrypt(data['level']).decode(), encrypt(data['member_id']).decode(), 0 if data['graduated'].lower() == "no" else 1, encrypt(data['sec1_class']).decode(), encrypt(data['sec1_rank']).decode(), encrypt(data['sec2_class']).decode(), encrypt(data['sec2_rank']).decode(), encrypt(data['sec3_class']).decode(), encrypt(data['sec3_rank']).decode(), encrypt(data['sec4_class']).decode(), encrypt(data['sec4_rank']).decode(), encrypt(data['sec5_class']).decode(), data['id']]
    elif data["account_type"].lower() == "officer":
        sql = "UPDATE users_officers SET user_name = ?, abbreviated_name = ?, attendance_appearance = ?, account_type = ?, rank = ?, honorifics = ?, class = ?, credentials = ? WHERE id = ?;"
        parameters = [encrypt(data['user_name']).decode(), encrypt(data['abb_name']).decode(), encrypt(data['nominal_roll']).decode(), encrypt(data['account_type']).decode(), encrypt(data['rank2']).decode(), encrypt(data['honorifics']).decode(), encrypt(data['class']).decode(), encrypt(data['credential1']).decode(), data['id']]
    else:
        sql = "UPDATE users_primers SET user_name = ?, abbreviated_name = ?, attendance_appearance = ?, account_type = ?, rank = ?, credentials = ? WHERE id = ?;"
        parameters = [encrypt(data['user_name']).decode(), encrypt(data['abb_name']).decode(), encrypt(data['nominal_roll']).decode(), encrypt(data['account_type']).decode(), encrypt(data['rank1']).decode(), encrypt(data['credential']).decode(), data['id']]

    cursor = conn.cursor()
    cursor.execute(sql, parameters)
    conn.commit()
    cursor.close()

    emit("user_updated", data, namespace="/current_users_room", broadcast=True)
    emit("user_graduated", data, namespace="/graduated_boys_room", broadcast=True)
    return jsonify({ "status": "success" })

@app.route('/user_management/graduated_boys')
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
def user_management_graduated():
    return render_template('user_management (past).html')

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('connect', namespace='/graduated_boys_room')
def handle_graduated_boys_connect():
    join_room("graduated_boys_room")

@app.route('/user_management/current_users/<user_id>')
@login_required
@login_required1(["Officer", "Primer"], True)
@no_cache
def user_management_user(user_id: int | str):
    if current_user.type.lower() != "officer":
        return jsonify({ "error": f"Unauthorised. Your current account type of {current_user.type} does not have the permission to access this route." })

    if not user_id:
        return jsonify({ "error": "Missing User ID field. Please try again." })
    
    if not user_id.isdigit() and not user_id == "create_new_account":
        abort(404)
    
    if user_id == "create_new_account":
        return render_template('user_management (current) (user).html')

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users_officers WHERE id = ?", [user_id])
    user = cursor.fetchone()

    if not user:
        cursor.execute("SELECT * FROM users_boys WHERE id = ?", [user_id])
        user = cursor.fetchone()

    if not user:
        abort(404)

    columns = [description[0] for description in cursor.description]
    user = list(user)
    
    for i in range(len(user)):
        try:
            user[i] = decrypt(user[i].encode())
        except:
            pass

    decrypted_user = dict(zip(columns, user))

    return render_template('user_management (current) (user).html', user = decrypted_user)

@app.route('/user_management/graduated_boys/<user_id>')
@login_required
@login_required1(["Officer", "Primer"], True)
@no_cache
def user_management_graduated_user(user_id: int | str):
    if current_user.type.lower() != "officer":
        return jsonify({ "error": f"Unauthorised. Your current account type of {current_user.type} does not have the permission to access this route." })

    if not user_id:
        return jsonify({ "error": "Missing User ID field. Please try again." })
    
    if not user_id.isdigit():
        abort(404)

    cursor.execute("SELECT * FROM users_boys WHERE id = ?", [user_id])
    user = cursor.fetchone()

    if not user:
        abort(404)

    columns = [description[0] for description in cursor.description]
    user = list(user)
    
    for i in range(len(user)):
        try:
            user[i] = decrypt(user[i].encode())
        except:
            pass

    decrypted_user = dict(zip(columns, user))

    return render_template('user_management (past) (user).html', user = decrypted_user)

@app.route('/get_all_graduated', methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
@api_route
def get_all_graduated():
    cursor = conn.cursor()
    cursor.execute("SELECT id, rank, user_name FROM users_boys WHERE graduated = 1")
    encrypted_boys = cursor.fetchall()
    boys_columns = [description[0] for description in cursor.description]

    boys = []

    for row in encrypted_boys:
        user = list(row)
        user[1] = decrypt(user[1].encode('utf-8'))
        user[2] = decrypt(user[2].encode('utf-8'))
        boys.append(tuple(user))

    all_boys = [dict(zip(boys_columns, row)) for row in boys]
    
    return jsonify(all_boys)

@app.route('/update_graduated', methods=["PUT"])
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
@api_route
def update_graduated():
    if request.method != "PUT":
        return redirect("/user_management/graduated_boys")

    data = request.get_json()

    cursor = conn.cursor()
    cursor.execute("UPDATE users_boys SET graduated = ? WHERE id = ?", [0 if data['graduated'].lower() == "no" else 1, data['id']])
    conn.commit()

    emit("user_ungraduated", data, namespace="/current_users_room", broadcast=True)
    emit("user_updated", data, namespace="/graduated_boys_room", broadcast=True)
    return jsonify({ "status": "success" })

@no_cache
@login_required
@login_required1(["Officer", "Primer"])
@app.route('/user_management/appointment_holders')
def user_management_appt():
    return render_template('user_management (appt).html')

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('connect', namespace='/appt_holder_room')
def handle_appt_holder_connect():
    username = request.args.get('username')
    sid = request.sid

    if username and sid and (sid not in appt_holder_room_users) and (username not in appt_holder_room_users.values()):
        appt_holder_room_users[sid] = username
        join_room("appt_holder_room")

        emit("user_list", list(appt_holder_room_users.values()), namespace="/appt_holder_room", broadcast=True)

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('connect', namespace='/nco_council_room')
def handle_nco_council_connect():
    username = request.args.get('username')
    sid = request.sid

    if username and sid and (sid not in nco_council_room_users) and (username not in nco_council_room_users.values()):
        nco_council_room_users[sid] = username
        join_room("nco_council_room")

        emit("user_list1", list(nco_council_room_users.values()), namespace="/nco_council_room", broadcast=True)

@app.route("/get_all_officers")
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
def get_all_officers():
    cursor = conn.cursor()
    cursor.execute("SELECT id, rank, user_name, honorifics FROM users_officers")
    rows = cursor.fetchall()
    users = []

    for row in rows:
        user = list(row)
        user[1] = decrypt(user[1].encode('utf-8'))
        user[2] = decrypt(user[2].encode('utf-8'))
        user[3] = decrypt(user[3].encode('utf-8'))
        users.append(tuple(user))

    columns = [description[0] for description in cursor.description]
    results = [dict(zip(columns, row)) for row in users]

    return jsonify(results)

@app.route("/get_all_boys")
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def get_all_boys():
    cursor = conn.cursor()
    cursor.execute("SELECT id, rank, user_name FROM users_boys")
    rows = cursor.fetchall()
    users = []

    for row in rows:
        user = list(row)
        user[1] = decrypt(user[1].encode('utf-8'))
        user[2] = decrypt(user[2].encode('utf-8'))
        users.append(tuple(user))

    columns = [description[0] for description in cursor.description]
    results = [dict(zip(columns, row)) for row in users]
    
    return jsonify(results)

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('disconnect', namespace='/appt_holder_room')
def appt_holder_disconnect():
    sid = request.sid

    if sid in appt_holder_room_users:
        appt_holder_room_users.pop(sid)
        emit("user_list", list(appt_holder_room_users.values()), namespace="/appt_holder_room", broadcast=True)

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('disconnect', namespace='/nco_council_room')
def nco_council_disconnect():
    sid = request.sid

    if sid in appt_holder_room_users:
        nco_council_room_users.pop(sid)
        emit("user_list1", list(nco_council_room_users.values()), namespace="/nco_council_room", broadcast=True)

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('get_users', namespace='/appt_holder_room')
def send_users():
    emit("user_list", list(appt_holder_room_users.values()), namespace="/appt_holder_room")

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('get_users1', namespace='/nco_council_room')
def send_users1():
    emit("user_list1", list(nco_council_room_users.values()), namespace="/nco_council_room")

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('update_appt_holder', namespace='/appt_holder_room')
def update_appt_holder(data):
    cursor = conn.cursor()
    cursor.execute("UPDATE appointment_holders SET user_id = ? WHERE role_id = ?", [data["input_value"], data["input_id"]])

    conn.commit()

    emit("appt_holder_updated", data, namespace="/appt_holder_room", broadcast=True)

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('update_nco_council', namespace='/nco_council_room')
def update_nco_council(data):
    cursor = conn.cursor()
    cursor.execute("UPDATE appointment_holders SET user_id = ? WHERE role_id = ?", [data["input_value"], data["input_id"]])
    conn.commit()

    emit("nco_council_updated", data, namespace="/nco_council_room", broadcast=True)

@app.route('/get_all_appointment_holders', methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
def get_all_appointment_holders():
    cursor = conn.cursor()
    cursor.execute("SELECT role_id, user_id FROM appointment_holders")
    rows = cursor.fetchall()

    columns = [description[0] for description in cursor.description]
    results = [dict(zip(columns, row)) for row in rows]

    return jsonify(results)

@app.route('/user_management/nco_council')
@login_required
@login_required1(["Officer", "Primer"])
def user_management_nco():
    return render_template('user_management (nco).html')

@app.route('/parade_notice_and_attendance')
@login_required
@login_required1(["Officer", "Primer"], True)
@no_cache
def parade_notices():
    return render_template('parade_notices.html')

@app.route('/parade_notice_template/<int:parade_id>')
@api_route
def parade_notice_template(parade_id):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM parade_notices WHERE id = ?", [parade_id])
    parade_row = cursor.fetchone()

    columns = [description[0] for description in cursor.description]
    parade = dict(zip(columns, parade_row))

    parade["day"] = datetime.strptime(parade["parade_date"], "%Y-%m-%d").strftime("%A")
    parade["parade_date"] = datetime.strptime(parade["parade_date"], "%Y-%m-%d").strftime("%d %B %Y")
    parade["start_time"] = datetime.strptime(parade["start_time"], "%H:%M").strftime("%I:%M %p")
    parade["end_time"] = datetime.strptime(parade["end_time"], "%H:%M").strftime("%I:%M %p")

    cursor.execute("SELECT id, rank, honorifics, user_name FROM users_officers WHERE id = ? OR id = ?", [parade["duty_officer_id"], parade["duty_teacher_id"]])
    users = cursor.fetchmany(2)

    for user in users:
        if user[0] == parade["duty_officer_id"]:
            parade["duty_officer"] = f"{decrypt(user[2].encode()).capitalize() if decrypt(user[1].encode()) == "NIL" else decrypt(user[1].encode())} {decrypt(user[3].encode())}"
        else:
            parade["duty_teacher"] = f"{decrypt(user[2].encode()).capitalize() if decrypt(user[1].encode()) == "NIL" else decrypt(user[1].encode())} {decrypt(user[3].encode())}"

    cursor.execute("SELECT id, rank, user_name FROM users_boys WHERE id = ? OR id = ?", [parade["cos_id"], parade["flag_bearer"]])
    users = cursor.fetchmany(2)

    for user in users:
        if user[0] == parade["flag_bearer"]:
            parade["flag_bearer_name"] = f"{decrypt(user[1].encode()).upper()} {decrypt(user[2].encode())}"
        
        if user[0] == parade["cos_id"]:
            parade["cos"] = f"{decrypt(user[1].encode()).upper()} {decrypt(user[2].encode())}"

    cursor.execute("SELECT id, role_id, rank, user_name FROM appointment_holders JOIN users_boys ON appointment_holders.user_id = users_boys.id WHERE appointment_holders.role_id = 9 OR appointment_holders.role_id = 2")
    users = cursor.fetchmany(2)

    for user in users:
        if user[1] == 9:
            parade["csm_name"] = f"{decrypt(user[2].encode()).upper()} {decrypt(user[3].encode())}"
        
        if user[1] == 2:
            parade["ce_name"] = f"{decrypt(user[2].encode()).upper()} {decrypt(user[3].encode())}"

    return render_template('parade_notice_template.html', parade=parade)

@app.route('/get_parade_appts', methods=["GET"])
@api_route
@login_required
@login_required1(["Officer", "Primer"], True)
def get_parade_appt():
    decrypted_users = {
        "appt_holders": {},
        "officers": {},
        "boys": {}
    }

    cursor = conn.cursor()
    cursor.execute("SELECT role_name, rank, user_name FROM appointment_holders LEFT JOIN users_boys ON appointment_holders.user_id = users_boys.id WHERE role_id = 2 OR role_id = 9;")
    users = cursor.fetchmany(2)

    for user in users:
        decrypted_users["appt_holders"][user[0]] = f"{decrypt(user[1].encode())} {decrypt(user[2].encode())}"

    cursor.execute("SELECT id, honorifics, rank, user_name FROM users_officers;")
    users = cursor.fetchall()

    for user in users:
        decrypted_users["officers"][user[0]] = f"{decrypt(user[1].encode()) if decrypt(user[2]).lower() == "nil" else decrypt(user[2])} {decrypt(user[3].encode())}" 

    cursor.execute("SELECT id, rank, user_name FROM users_primers;")
    users = cursor.fetchall()

    for user in users:
        decrypted_users["officers"][user[0]] = f"{decrypt(user[1].encode())} {decrypt(user[2].encode())}" 

    cursor.execute("SELECT id, rank, user_name, secondary FROM users_boys;")
    users = cursor.fetchall()

    for user in users:
        decrypted_users["boys"][user[0]] = {
            "start": f"{decrypt(user[1].encode())} {decrypt(user[2].encode())}",
            "secondary": decrypt(user[3].encode())
        }

    return jsonify({
        "appt_holders": decrypted_users["appt_holders"],
        "officers": decrypted_users["officers"],
        "boys": decrypted_users["boys"]
    })

@socketio.on("connect", namespace="/parade_notice_and_attendance")
@login_required
@login_required1(["Officer", "Primer"], True)
def handle_parade_notices_connect():
    join_room("parade_notice_and_attendance")

    emit("Connected to parade_notice_and_attendance", namespace="/parade_notice_and_attendance")

@app.route('/get_all_parade_notices', methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def get_parade_notices():
    cursor = conn.cursor()
    cursor.execute("SELECT id, parade_date FROM parade_notices;")
    result = cursor.fetchall()

    return jsonify(result)

@app.route('/create_parade_notice', methods=["POST"])
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def create_parade_notice():
    if request.method != "POST":
        return redirect("/parade_notice_and_attendance")

    data = request.get_json()

    cursor = conn.cursor()
    cursor.execute("INSERT INTO parade_notices(parade_date, venue, start_time, end_time, duty_teacher_id, duty_officer_id, cos_id, flag_bearer, company_announcements, sec1_announcements, sec2_announcements, sec3_announcements, sec4_announcements, sec1_attire, sec2_attire, sec3_attire, sec4_attire, sec1_programs, sec2_programs, sec3_programs, sec4_programs, parade_description) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        data["date"],
        data["venue"],
        data["reporting_time"],
        data["dismissal_time"],
        data["DT"],
        data["DO"],
        data["COS"],
        data["Flag Bearer"],
        "/bb21/".join(map(str, data["company_announcements"])),
        "/bb21/".join(map(str, data["sec_1_announcements"])),
        "/bb21/".join(map(str, data["sec_2_announcements"])),
        "/bb21/".join(map(str, data["sec_3_announcements"])),
        "/bb21/".join(map(str, data["sec_4_announcements"])),
        data["sec_1_attire"],
        data["sec_2_attire"],
        data["sec_3_attire"],
        data["sec_4_attire"],
        "/bb21/".join(map(str, data["sec_1_programs"])),
        "/bb21/".join(map(str, data["sec_2_programs"])),
        "/bb21/".join(map(str, data["sec_3_programs"])),
        "/bb21/".join(map(str, data["sec_4_programs"])),
        data["description"]
    ])

    conn.commit()

    emit("parade_notice_created", data, namespace="/parade_notice_and_attendance", broadcast=True)
    emit("parade_notice_created_host", { "added": True }, namespace="/parade_notice_and_attendance", room=data["sid"])
    return jsonify({ "updated": True })

@app.route("/get_parade_details", methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def get_parade_details():
    parade_id = request.args.get("parade")

    if not parade_id:
        return jsonify({ "error": "Missing Parade ID" }), 400

    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            p.*,
            t1.id AS duty_teacher_id, 
            t1.name AS duty_teacher_name,
            t1.rank AS duty_teacher_rank,
            t1.honorifics AS duty_teacher_honorific,
            t2.id AS duty_officer_id, 
            t2.name AS duty_officer_name,
            t2.rank AS duty_officer_rank,
            t2.honorifics AS duty_officer_honorific,
            b1.id AS cos_id,
            b1.rank AS cos_rank,
            b1.name AS cos_name,
            b2.id AS flag_bearer, 
            b2.name AS flag_bearer_name,
            b2.rank AS flag_bearer_rank
        FROM 
            parade_notices p
        JOIN users_officers t1 ON p.duty_teacher_id = t1.id
        JOIN users_officers t2 ON p.duty_officer_id = t2.id
        JOIN users_boys b1 ON p.cos_id = b1.id
        JOIN users_boys b2 ON p.flag_bearer = b2.id
        WHERE p.id = ?;
    """, [parade_id])

    parade = cursor.fetchone()
    columns = [description[0] for description in cursor.description]
    results = dict(zip(columns, parade))

    results["cos_name"] = decrypt(results["cos_name"].encode())
    results["duty_officer_name"] = decrypt(results["duty_officer_name"].encode())
    results["duty_teacher_name"] = decrypt(results["duty_teacher_name"].encode())
    results["flag_bearer_name"] = decrypt(results["flag_bearer_name"].encode())
    results["duty_teacher_rank"] = decrypt(results["duty_teacher_rank"].encode())
    results["flag_bearer_rank"] = decrypt(results["flag_bearer_rank"].encode())
    results["cos_rank"] = decrypt(results["cos_rank"].encode())
    results["duty_officer_honorific"] = decrypt(results["duty_officer_honorific"].encode())
    results["duty_officer_rank"] = decrypt(results["duty_officer_rank"].encode())
    results["duty_teacher_honorific"] = decrypt(results["duty_teacher_honorific"].encode())

    return jsonify(results)

@socketio.on("update_attendance", namespace="/parade_notice_and_attendance")
@login_required
@login_required1(["Officer", "Primer"], True)
def update_attendance(data, sid):
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM attendance WHERE user_id = ? AND parade_id = ?;", [data["attendance_id"].split("_")[1], data["parade_id"]])
    attendance_id = cursor.fetchone()

    if not attendance_id:
        sql = "INSERT INTO attendance(user_id, parade_id, attendance_status) VALUES (?, ?, ?);"
        parameters = [data["attendance_id"].split("_")[1], data["parade_id"], data["value"]]
    else:
        sql = "UPDATE attendance SET attendance_status = ? WHERE id = ?;"
        parameters = [data["value"], attendance_id[0]]

    cursor.execute(sql, parameters)
    conn.commit()

    emit("attendance_updated", data, namespace="/parade_notice_and_attendance", broadcast=True, include_self=False)

@app.route("/get_attendance", methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def get_attendance():
    parade_id = request.args.get("parade_id")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendance WHERE parade_id = ?;", [parade_id])
    users = cursor.fetchall()
    columns = [description[0] for description in cursor.description]
    results = [dict(zip(columns, row)) for row in users]

    return jsonify(results)

@app.route('/update_parade_notice', methods=["PUT"])
@login_required
@login_required1(["Officer", "Primer"], True)
@api_route
def update_parade_notice():
    if request.method != "PUT":
        return redirect("/parade_notice_and_attendance")

    data = request.get_json()
    cursor = conn.cursor()
    cursor.execute("UPDATE parade_notices SET parade_date = ?, venue = ?, start_time = ?, end_time = ?, duty_teacher_id = ?, duty_officer_id = ?, cos_id = ?, flag_bearer = ?, company_announcements = ?, sec1_announcements = ?, sec2_announcements = ?, sec3_announcements = ?, sec4_announcements = ?, sec1_attire = ?, sec2_attire = ?, sec3_attire = ?, sec4_attire = ?, sec1_programs = ?, sec2_programs = ?, sec3_programs = ?, sec4_programs = ?, parade_description = ? WHERE id = ?;", [
        data["date"],
        data["venue"],
        data["reporting_time"],
        data["dismissal_time"],
        data["DT"],
        data["DO"],
        data["COS"],
        data["Flag Bearer"],
        "/bb21/".join(map(str, data["company_announcements"])),
        "/bb21/".join(map(str, data["sec_1_announcements"])),
        "/bb21/".join(map(str, data["sec_2_announcements"])),
        "/bb21/".join(map(str, data["sec_3_announcements"])),
        "/bb21/".join(map(str, data["sec_4_announcements"])),
        data["sec_1_attire"],
        data["sec_2_attire"],
        data["sec_3_attire"],
        data["sec_4_attire"],
        "/bb21/".join(map(str, data["sec_1_programs"])),
        "/bb21/".join(map(str, data["sec_2_programs"])),
        "/bb21/".join(map(str, data["sec_3_programs"])),
        "/bb21/".join(map(str, data["sec_4_programs"])),
        data["description"],
        data["parade_id"]
    ])

    conn.commit()

    emit("parade_notice_updated", data, namespace="/parade_notice_and_attendance", broadcast=True)
    emit("parade_notice_updated_host", { "added": True }, namespace="/parade_notice_and_attendance", room=data["sid"])
    return jsonify({ "updated": True })

@app.route('/logout')
@login_required
@login_required1(["Officer", "Boy", "Primer"])
def logout():    
    blacklist_tokens.add(session.get("token", None))
    session.pop("token", None)
    session.clear()

    logout_user()
    return redirect("/login")

@app.route('/settings')
@no_cache
def settings():
    user = request.args.get('user')
    account_type = request.args.get('type')

    if user != "1" or account_type != "admin":
        return redirect("/dashboard")

    cursor = conn.cursor()
    cursor.execute("SELECT id, setting_value FROM settings")
    rows = cursor.fetchall()

    return render_template('settings.html', settings = rows)

@app.route('/update_maintenance_setting', methods=["PUT"])
@no_cache
@api_route
def update_setting():
    data = request.get_json()

    cursor = conn.cursor()
    cursor.execute("UPDATE settings SET setting_value = ? WHERE id = 2", [data["maintenance"]])
    cursor.execute("UPDATE settings SET setting_value = ? WHERE id = 3", [data["time"]])
    conn.commit()

    return jsonify({ "updated": True })

@app.route('/update_lockdown_setting', methods=["PUT"])
@no_cache
@api_route
def update_lockdown_setting():
    data = request.get_json()

    cursor = conn.cursor()
    cursor.execute("UPDATE settings SET setting_value = ? WHERE id = 1", [data["lockdown"]])
    conn.commit()

    return jsonify({ "updated": True })

@app.route('/annual_calendar')
def calendar():
    return render_template('calendar.html')

@socketio.on('connect', namespace='/calendar_room')
def calendar_connect():
    join_room("calendar_room")

@app.route('/annual_calendar_updater')
@no_cache
@login_required
@login_required1(["Officer"])
def annual_calendar_updater():
    return render_template('calendar_update.html')

@app.route('/upload_annual_calendar', methods=["POST"])
@login_required
@login_required1(["Officer"])
@api_route
def upload_annual_calendar():
    if request.method != "POST":
        return redirect("/annual_calendar_updater")
    
    if "file" not in request.files:
        return jsonify({ "error": "No file selected" }), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({ "error": "No file selected" }), 400
    
    if file and ("." in file.filename and file.filename.rsplit(".")[-1].lower() == "pdf"):
        filepath = os.path.join("static/pdf", "annual_calendar.pdf")
        file.save(filepath)
        emit("calendar_updated", namespace="/calendar_room", broadcast=True)
        return jsonify({ "uploaded": True }), 200
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/awards_tracker/boys_awards')
@app.route('/awards_tracker')
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
def awards_tracker_list():
    return render_template('awards_tracker (list).html')

@app.route('/get_all_attained_badges', methods=["GET"])
@login_required
@login_required1(["Officer", "Primer"])
@api_route
def get_all_attained_badges():
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attained_badges")
    badges = cursor.fetchall()
    decrypted_badges = []

    for badge in badges:
        badge = list(badge)
        badge[3] = decrypt(badge[3].encode())
        decrypted_badges.append(badge)

    return jsonify(decrypted_badges), 200

@login_required
@login_required1(["Officer", "Primer"])
@socketio.on('connect', namespace='/awards_tracker_room')
def handle_awards_tracker_connect():
    join_room("awards_tracker_room")

@app.route('/update_awards_tracker', methods=["PUT"])
@login_required
@login_required1(["Officer", "Primer"])
def update_awards_tracker():
    data = request.get_json()
    operation = data.get("operation")
    user_id = data.get("user_id")
    badge_id = data.get("badge_id")
    badge_level = data.get("badge_level")

    if not operation or not user_id or not badge_id or not badge_level:
        return jsonify({"error": "Missing fields. Please try again"}), 400

    if not isinstance(operation, str) or not isinstance(user_id, int) or not isinstance(badge_id, int) or not isinstance(badge_level, str):
        return jsonify({"error": "Fields are invalid (eg: wrong data type)"}), 422

    if operation == "insertion":
        sql = "INSERT INTO attained_badges(user_id, badge_id, badge_level) VALUES(?, ?, ?);"
        parameters = [user_id, badge_id, encrypt(badge_level).decode()]
    elif operation == "deletion":
        cursor = conn.cursor()
        cursor.execute("SELECT attained_id, badge_level FROM attained_badges WHERE user_id = ? AND badge_id = ?;", [user_id, badge_id])
        results = cursor.fetchall()

        for result in results:
            if decrypt(result[1].encode()).lower() == badge_level.lower():
                attained_badge_id = result[0]

        sql = "DELETE FROM attained_badges WHERE attained_id = ?"
        parameters = [attained_badge_id]
    else:
        return jsonify({"error": "operation method undefined"}), 422

    cursor = conn.cursor()
    cursor.execute(sql, parameters)
    conn.commit()

    emit("attained_badges_updated", data, namespace="/awards_tracker_room", broadcast=True)
    return jsonify({ "updated": True })

@app.route('/awards_tracker/award_requirements')
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
def awards_tracker_requirements():
    return render_template('awards_tracker (requirements).html')

@app.route('/user_attendance')
@login_required
@login_required1(["Officer", "Boy", "Primer"])
@no_cache
def user_attendance():
    cursor = conn.cursor()
    cursor.execute("SELECT parade_date, attendance_status FROM attendance JOIN parade_notices ON parade_notices.id = attendance.parade_id WHERE user_id = ?;", [current_user.id])
    result = cursor.fetchall()

    columns = [description[0] for description in cursor.description]
    rows = [dict(zip(columns, row)) for row in result]

    return render_template('user_attendance.html', attendance=rows)

@app.route('/results_generation')
@login_required
@login_required1(["Officer", "Primer"])
@no_cache
def result_generation():
    cursor = conn.cursor()
    cursor.execute("SELECT badge_name, level FROM badges WHERE badge_id < 22;")
    badges = cursor.fetchall()

    cursor.execute("SELECT honorifics, rank, user_name, credentials FROM users_officers;")
    officers = cursor.fetchall()

    cursor.execute("SELECT rank, user_name, credentials FROM users_primers;")
    primers = cursor.fetchall()

    decrypted_officers = {}
    decrypted_boys = {}

    for officer in officers:
        decrypted_officers[f"{decrypt(officer[0].encode()).capitalize() if decrypt(officer[1].encode()) == "NIL" else decrypt(officer[1].encode())} {decrypt(officer[2].encode())}"] = decrypt(officer[3].encode())

    for primer in primers:
        decrypted_officers[f"{decrypt(primer[0].encode()).upper()} {decrypt(primer[1].encode())}"] = decrypt(primer[2].encode())

    cursor.execute("SELECT id, rank, user_name, secondary FROM users_boys;")
    boys = cursor.fetchall()
    cursor.close()

    for boy in boys:
        decrypted_boys[boy[0]] = {
            "name": f"{decrypt(boy[1].encode()).upper()} {decrypt(boy[2].encode())}",
            "secondary": decrypt(boy[3].encode()).upper()
        }

    return render_template('result_generation.html', badges=badges, officers=decrypted_officers, boys=decrypted_boys)

@app.route('/results_generation_template', methods=["POST"])
@login_required
@login_required1(["Officer", "Primer"])
@api_route
def result_generation_template():
    data = request.get_json()

    if not data:
        return abort(400)

    return render_template("result_generation_template.html", data=data)

@app.errorhandler(401)
def forbidden(e):
    return render_template('401.html'), 401

@app.errorhandler(403)
def forbidden(e):
    return render_template('403.html'), 403

@app.errorhandler(404)
def forbidden(e):
    return render_template('404.html'), 404

@app.route("/423")
@app.errorhandler(423)
def forbidden(e):
    return render_template('423.html'), 423

@app.route('/maintenance')
@app.errorhandler(503)
def maintenance():
    return render_template('503.html'), 503

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)