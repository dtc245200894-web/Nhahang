from __future__ import annotations

from flask import Flask, jsonify, render_template, request, session

from backend.database import Database
from backend.services import ROLE_NAMES, ROLE_VIEWS, RestaurantService

app = Flask(__name__)
app.secret_key = "golden-lotus-local-development-key"
database = Database()
service = RestaurantService(database)


def response(ok: bool, message: str, **data: object):
    return jsonify({"ok": ok, "message": message, **data})


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return response(False, "Không tìm thấy chức năng hoặc dữ liệu yêu cầu."), 404
    return error


@app.errorhandler(500)
def internal_error(error):
    if request.path.startswith("/api/"):
        database.connection.rollback()
        return response(False, "Máy chủ gặp lỗi khi xử lý yêu cầu."), 500
    return error


@app.get("/")
def index():
    return render_template("index.html", role_names=ROLE_NAMES)


@app.post("/api/login")
def login():
    payload = request.get_json() or {}
    user = service.login(payload.get("username", ""), payload.get("password", ""), payload.get("role", ""))
    if user and user["status"] == "pending":
        return response(False, "Tài khoản của bạn chưa được quản lý duyệt."), 403
    if user and user["status"] == "rejected":
        return response(False, "Tài khoản của bạn đã bị từ chối."), 403
    if not user:
        return response(False, "Tài khoản, mật khẩu hoặc vai trò chưa đúng."), 401
    session["user"] = {"id": user["id"], "name": user["name"], "username": user["username"], "role": user["role"]}
    return response(True, "Đăng nhập thành công.", user=session["user"], views=list(ROLE_VIEWS[user["role"]]))


@app.post("/api/register")
def register():
    payload = request.get_json() or {}
    if len(payload.get("password", "")) < 6:
        return response(False, "Mật khẩu cần ít nhất 6 ký tự."), 400
    ok, message = service.register(payload.get("name", ""), payload.get("username", ""), payload.get("password", ""), payload.get("role", "server"), payload.get("phone", ""))
    return response(ok, message), 200 if ok else 400


@app.post("/api/logout")
def logout():
    session.clear()
    return response(True, "Đã đăng xuất.")


def logged_in():
    return session.get("user")


def require_role(*roles):
    user = logged_in()
    if not user:
        return response(False, "Bạn cần đăng nhập trước."), 401
    if roles and user["role"] not in roles:
        return response(False, "Bạn không có quyền thực hiện thao tác này."), 403
    return None


@app.get("/api/dashboard")
def dashboard():
    return jsonify(service.dashboard())


@app.get("/api/tables")
def tables():
    return jsonify(service.tables(request.args.get("search", ""), request.args.get("status", "all")))


@app.get("/api/menu")
def menu():
    return jsonify(service.menu(request.args.get("search", ""), request.args.get("category", "all")))


@app.get("/api/menu/popular")
def popular_menu():
    return jsonify(service.popular_menu())


@app.post("/api/reservations")
def reservations():
    access_error = require_role("manager")
    if access_error:
        return access_error
    payload = request.get_json() or {}
    ok, message = service.reserve(int(payload["table_id"]), payload.get("customer", ""), payload.get("phone", ""), int(payload.get("guests", 1)), payload.get("date", ""), payload.get("time", ""), payload.get("note", ""))
    return response(ok, message), 200 if ok else 400


@app.post("/api/orders")
def orders():
    payload = request.get_json() or {}
    items = [(int(item["menu_id"]), int(item["quantity"])) for item in payload.get("items", [])]
    ok, message = service.create_order(int(payload["table_id"]), items)
    return response(ok, message), 200 if ok else 400


@app.post("/api/tables/<int:table_id>/ready")
def ready(table_id: int):
    access_error = require_role("kitchen")
    if access_error:
        return access_error
    ok, message = service.mark_ready(table_id)
    return response(ok, message), 200 if ok else 400


@app.post("/api/tables/<int:table_id>/pay")
def pay(table_id: int):
    access_error = require_role("manager", "server")
    if access_error:
        return access_error
    payment_method = (request.get_json() or {}).get("payment_method", "cash")
    ok, message = service.pay(table_id, payment_method)
    return response(ok, message), 200 if ok else 400


@app.get("/api/invoices")
def invoices():
    return jsonify(service.invoices())


@app.get("/api/activities")
def activities():
    access_error = require_role("manager")
    if access_error:
        return access_error
    return jsonify(service.recent_activities())


@app.get("/api/invoices/<int:invoice_id>")
def invoice_detail(invoice_id: int):
    detail = service.invoice_detail(invoice_id)
    return (jsonify(detail), 200) if detail else (response(False, "Không tìm thấy hóa đơn."), 404)


@app.get("/api/inventory")
def inventory():
    return jsonify(service.inventory())


@app.post("/api/inventory")
def add_inventory():
    payload = request.get_json() or {}
    try:
        initial = float(payload.get("initial", 0))
    except (TypeError, ValueError):
        initial = -1
    ok, message = service.add_inventory(payload.get("name", ""), payload.get("unit", ""), initial)
    return response(ok, message), 200 if ok else 400


@app.post("/api/inventory/reset")
def reset_inventory():
    service.reset_inventory()
    return response(True, "Đã reset nguyên liệu theo định mức đầu ca.")


@app.put("/api/menu/<int:menu_id>/recipe")
def update_recipe(menu_id: int):
    payload = request.get_json() or {}
    ok, message = service.update_recipe(menu_id, payload.get("ingredients", []))
    return response(ok, message), 200 if ok else 400


@app.get("/api/tables/<int:table_id>")
def table_detail(table_id: int):
    detail = service.table_detail(table_id)
    return (jsonify(detail), 200) if detail else (response(False, "Không tìm thấy bàn."), 404)


@app.post("/api/tables/<int:table_id>/cancel-reservation")
def cancel_reservation(table_id: int):
    access_error = require_role("manager")
    if access_error:
        return access_error
    ok, message = service.cancel_reservation(table_id)
    return response(ok, message), 200 if ok else 400


@app.post("/api/menu")
def add_menu():
    payload = request.get_json() or {}
    ok, message = service.add_menu(payload.get("name", ""), payload.get("category", "Món chính"), int(payload.get("price", 0)), payload.get("description", ""))
    return response(ok, message), 200 if ok else 400


@app.patch("/api/menu/<int:menu_id>/availability")
def menu_availability(menu_id: int):
    payload = request.get_json() or {}
    value = payload.get("available", True)
    available = value if isinstance(value, bool) else str(value).lower() in {"1", "true", "yes", "on"}
    ok, message = service.set_menu_availability(menu_id, available)
    return response(ok, message), 200 if ok else 400


@app.get("/api/reports")
def reports():
    return jsonify(service.reports(int(request.args.get("days", 1))))


@app.get("/api/users")
def users():
    return jsonify(service.users())


@app.patch("/api/users/<username>/status")
def user_status(username: str):
    ok, message = service.update_user_status(username, (request.get_json() or {}).get("status", ""))
    return response(ok, message), 200 if ok else 400


@app.delete("/api/users/<username>")
def delete_user(username: str):
    ok, message = service.delete_user(username)
    return response(ok, message), 200 if ok else 400


@app.post("/api/ai/recommend")
def ai_recommend():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return response(False, "Thông tin gợi ý món không hợp lệ."), 400
    try:
        people = int(payload.get("people", 1))
        budget = int(payload.get("budget", 0))
    except (TypeError, ValueError):
        return response(False, "Số người và ngân sách cần là số nguyên."), 400
    if people < 1 or budget < 0:
        return response(False, "Số người phải từ 1 trở lên và ngân sách không được âm."), 400
    taste = payload.get("taste", "")
    if not isinstance(taste, str):
        return response(False, "Sở thích cần là văn bản."), 400
    return jsonify(service.recommend(people, budget, taste))


@app.post("/api/ai/describe")
def ai_describe():
    return response(True, service.describe_dish(int((request.get_json() or {}).get("menu_id", 0))))


@app.get("/api/session")
def current_session():
    return jsonify({"user": logged_in()})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
