from __future__ import annotations

from datetime import datetime
import re
import unicodedata
from typing import Any

from .database import Database, now_iso, password_hash


ROLE_NAMES = {
    "manager": "Quản lý",
    "server": "Nhân viên phục vụ",
    "cashier": "Kế toán",
    "kitchen": "Nhân viên bếp",
}

ROLE_VIEWS = {
    "manager": {"overview", "tables", "reservations", "menu", "orders", "reports", "invoices", "ai", "accountApproval", "inventory"},
    "server": {"overview", "tables", "orders", "ai"},
    "cashier": {"overview", "reports", "invoices"},
    "kitchen": {"overview", "tables"},
}


class RestaurantService:
    def __init__(self, database: Database) -> None:
        self.db = database

    def login(self, username: str, password: str, role: str) -> dict[str, Any] | None:
        user = self.db.one(
            "SELECT * FROM users WHERE username = ? AND password = ? AND role = ?",
            (username.strip().lower(), password_hash(password), role),
        )
        return user

    def register(self, name: str, username: str, password: str, role: str, phone: str) -> tuple[bool, str]:
        phone = "".join(character for character in phone if character.isdigit())
        if len(phone) < 9 or len(phone) > 11:
            return False, "Số điện thoại cần có từ 9 đến 11 chữ số."
        if self.db.one("SELECT id FROM users WHERE phone = ?", (phone,)):
            return False, "Số điện thoại này đã được đăng ký tài khoản khác."
        try:
            status = "active" if role == "manager" else "pending"
            self.db.connection.execute(
                "INSERT INTO users(name, username, password, role, status, phone) VALUES (?, ?, ?, ?, ?, ?)",
                (name.strip(), username.strip().lower(), password_hash(password), role, status, phone),
            )
            self.db.connection.commit()
            return True, "Tài khoản đã tạo." if status == "active" else "Tài khoản đang chờ quản lý duyệt."
        except Exception:
            return False, "Tài khoản đã tồn tại hoặc thông tin không hợp lệ."

    def tables(self, search: str = "", status: str = "all") -> list[dict[str, Any]]:
        query = "SELECT * FROM restaurant_tables WHERE name LIKE ?"
        params: list[Any] = [f"%{search}%"]
        if status != "all":
            query += " AND status = ?"
            params.append(status)
        return self.db.rows(query + " ORDER BY id", tuple(params))

    def menu(self, search: str = "", category: str = "all") -> list[dict[str, Any]]:
        query = "SELECT * FROM menu WHERE name LIKE ?"
        params: list[Any] = [f"%{search}%"]
        if category != "all":
            query += " AND category = ?"
            params.append(category)
        dishes = self.db.rows(query + " ORDER BY sold DESC, category, name", tuple(params))
        for dish in dishes:
            dish["ingredients"] = self.db.rows(
                "SELECT inventory.id AS inventory_id, inventory.name, inventory.unit, recipe_ingredients.quantity "
                "FROM recipe_ingredients JOIN inventory ON inventory.id = recipe_ingredients.inventory_id "
                "WHERE recipe_ingredients.menu_id = ? ORDER BY inventory.name",
                (dish["id"],),
            )
        return dishes

    def popular_menu(self, limit: int = 4) -> list[dict[str, Any]]:
        hour = datetime.now().hour
        shift_hour = 0 if hour < 5 else 5 if hour < 12 else 12 if hour < 18 else 18
        shift_start = datetime.now().replace(hour=shift_hour, minute=0, second=0, microsecond=0).isoformat(timespec="seconds")
        return self.db.rows(
            "SELECT menu.*, SUM(order_items.quantity) AS shift_sold "
            "FROM order_items JOIN orders ON orders.id = order_items.order_id "
            "JOIN menu ON menu.id = order_items.menu_id "
            "WHERE orders.status = 'paid' AND orders.paid_at >= ? "
            "GROUP BY menu.id ORDER BY shift_sold DESC, menu.name LIMIT ?",
            (shift_start, limit),
        )

    def reserve(self, table_id: int, customer: str, phone: str, guests: int, date: str, time: str, note: str) -> tuple[bool, str]:
        table = self.db.one("SELECT * FROM restaurant_tables WHERE id = ?", (table_id,))
        if not table or table["status"] != "free":
            return False, "Bàn không còn trống."
        reservation = f"{customer} | {phone} | {guests} khách | {date} {time} | {note}"
        self.db.connection.execute(
            "UPDATE restaurant_tables SET status = 'reserved', reservation = ? WHERE id = ?",
            (reservation, table_id),
        )
        self.db.connection.commit()
        return True, f"Đã xác nhận đặt {table['name']} cho {customer}."

    def create_order(self, table_id: int, items: list[tuple[int, int]]) -> tuple[bool, str]:
        table = self.db.one("SELECT * FROM restaurant_tables WHERE id = ?", (table_id,))
        if not table or table["status"] not in {"free", "reserved"}:
            return False, "Bàn này đang có đơn hoặc không tồn tại."
        if not items:
            return False, "Hãy thêm ít nhất một món."
        ids = tuple(item_id for item_id, _ in items)
        placeholders = ",".join("?" for _ in ids)
        dishes = self.db.rows(f"SELECT * FROM menu WHERE id IN ({placeholders}) AND available = 1", ids)
        by_id = {dish["id"]: dish for dish in dishes}
        if len(by_id) != len(ids):
            return False, "Có món đã hết, hãy chọn món khác."
        usage: dict[str, float] = {}
        for item_id, quantity in items:
            recipe = self.db.rows(
                "SELECT inventory.name, recipe_ingredients.quantity "
                "FROM recipe_ingredients JOIN inventory ON inventory.id = recipe_ingredients.inventory_id "
                "WHERE recipe_ingredients.menu_id = ?",
                (item_id,),
            )
            for ingredient in recipe:
                usage[ingredient["name"]] = usage.get(ingredient["name"], 0) + ingredient["quantity"] * quantity
        for ingredient, amount in usage.items():
            stock = self.db.one("SELECT current FROM inventory WHERE name = ?", (ingredient,))
            if not stock or stock["current"] < amount:
                return False, f"Không đủ nguyên liệu {ingredient}."
        subtotal = sum(by_id[item_id]["price"] * quantity for item_id, quantity in items)
        fee = round(subtotal * 0.05)
        cursor = self.db.connection.execute(
            "INSERT INTO orders(table_id, status, subtotal, service_fee, total, created_at) VALUES (?, 'busy', ?, ?, ?, ?)",
            (table_id, subtotal, fee, subtotal + fee, now_iso()),
        )
        order_id = cursor.lastrowid
        self.db.connection.executemany(
            "INSERT INTO order_items(order_id, menu_id, quantity, price) VALUES (?, ?, ?, ?)",
            [(order_id, item_id, quantity, by_id[item_id]["price"]) for item_id, quantity in items],
        )
        self.db.connection.executemany("UPDATE menu SET sold = sold + ? WHERE id = ?", [(quantity, item_id) for item_id, quantity in items])
        self.db.connection.execute("UPDATE restaurant_tables SET status = 'busy', order_number = ? WHERE id = ?", (f"#{1049 + table_id}", table_id))
        for ingredient, amount in usage.items():
            self.db.connection.execute("UPDATE inventory SET current = current - ? WHERE name = ?", (amount, ingredient))
        self.db.connection.commit()
        return True, f"Đã tạo đơn cho {table['name']}: {self.money(subtotal + fee)}."

    def mark_ready(self, table_id: int) -> tuple[bool, str]:
        self.db.connection.execute("UPDATE restaurant_tables SET status = 'waiting' WHERE id = ? AND status = 'busy'", (table_id,))
        self.db.connection.commit()
        return True, "Đơn đã hoàn tất, đang chờ thanh toán."

    def pay(self, table_id: int, payment_method: str = "cash") -> tuple[bool, str]:
        if payment_method not in {"cash", "qr"}:
            return False, "Phương thức thanh toán không hợp lệ."
        order = self.db.one("SELECT * FROM orders WHERE table_id = ? AND status IN ('busy', 'waiting') ORDER BY id DESC LIMIT 1", (table_id,))
        table = self.db.one("SELECT * FROM restaurant_tables WHERE id = ?", (table_id,))
        if not order or not table or table["status"] != "waiting":
            return False, "Chỉ thanh toán được đơn đã hoàn tất."
        self.db.connection.execute("UPDATE orders SET status = 'paid', paid_at = ?, payment_method = ? WHERE id = ?", (now_iso(), payment_method, order["id"]))
        self.db.connection.execute("UPDATE restaurant_tables SET status = 'free', reservation = NULL, order_number = NULL WHERE id = ?", (table_id,))
        self.db.connection.commit()
        return True, f"Đã thanh toán {table['name']}: {self.money(order['total'])}."

    def dashboard(self) -> dict[str, int]:
        now = datetime.now()
        shift_hour = 0 if now.hour < 5 else 5 if now.hour < 12 else 12 if now.hour < 18 else 18
        shift_start = now.replace(hour=shift_hour, minute=0, second=0, microsecond=0).isoformat(timespec="seconds")
        row = self.db.one(
            "SELECT COALESCE(SUM(total), 0) revenue, COUNT(*) orders, COALESCE(AVG(total), 0) average "
            "FROM orders WHERE status = 'paid' AND paid_at >= ?",
            (shift_start,),
        ) or {}
        serving = self.db.one("SELECT COUNT(*) count FROM restaurant_tables WHERE status IN ('busy', 'waiting')")
        return {"revenue": int(row.get("revenue", 0)), "orders": row.get("orders", 0), "serving": (serving or {}).get("count", 0), "average": int(row.get("average", 0))}

    def invoices(self) -> list[dict[str, Any]]:
        invoices = self.db.rows("SELECT orders.*, restaurant_tables.name table_name FROM orders JOIN restaurant_tables ON restaurant_tables.id = orders.table_id WHERE orders.status = 'paid' ORDER BY paid_at DESC")
        for invoice in invoices:
            invoice["items"] = self.db.rows("SELECT order_items.*, menu.name FROM order_items JOIN menu ON menu.id = order_items.menu_id WHERE order_id = ?", (invoice["id"],))
        return invoices

    def recent_activities(self, limit: int = 20) -> list[dict[str, Any]]:
        return self.db.rows(
            "SELECT * FROM ("
            "SELECT 'order' type, 'Đơn hàng đã được ghi nhận' title, restaurant_tables.name table_name, orders.total amount, orders.created_at occurred_at "
            "FROM orders JOIN restaurant_tables ON restaurant_tables.id = orders.table_id "
            "UNION ALL "
            "SELECT 'payment' type, 'Đơn hàng đã thanh toán' title, restaurant_tables.name table_name, orders.total amount, orders.paid_at occurred_at "
            "FROM orders JOIN restaurant_tables ON restaurant_tables.id = orders.table_id WHERE orders.status = 'paid' AND orders.paid_at IS NOT NULL"
            ") WHERE occurred_at IS NOT NULL ORDER BY occurred_at DESC LIMIT ?",
            (limit,),
        )

    def inventory(self) -> list[dict[str, Any]]:
        return self.db.rows("SELECT * FROM inventory ORDER BY name")

    def add_inventory(self, name: str, unit: str, initial: float) -> tuple[bool, str]:
        name = name.strip()
        unit = unit.strip()
        if not name or not unit or initial < 0:
            return False, "Tên, đơn vị và số lượng đầu ca không hợp lệ."
        try:
            self.db.connection.execute(
                "INSERT INTO inventory(name, unit, current, initial) VALUES (?, ?, ?, ?)",
                (name, unit, initial, initial),
            )
            self.db.connection.commit()
            return True, f"Đã thêm nguyên liệu {name}."
        except Exception:
            return False, "Nguyên liệu đã tồn tại hoặc thông tin không hợp lệ."

    def update_recipe(self, menu_id: int, ingredients: list[dict[str, Any]]) -> tuple[bool, str]:
        if not self.db.one("SELECT id FROM menu WHERE id = ?", (menu_id,)):
            return False, "Không tìm thấy món ăn."
        recipe: list[tuple[int, float]] = []
        seen: set[int] = set()
        for item in ingredients:
            try:
                inventory_id = int(item["inventory_id"])
                quantity = float(item["quantity"])
            except (KeyError, TypeError, ValueError):
                return False, "Định lượng nguyên liệu không hợp lệ."
            if inventory_id in seen or quantity <= 0:
                return False, "Mỗi nguyên liệu chỉ được chọn một lần và định lượng phải lớn hơn 0."
            if not self.db.one("SELECT id FROM inventory WHERE id = ?", (inventory_id,)):
                return False, "Công thức chỉ được dùng nguyên liệu trong kho."
            seen.add(inventory_id)
            recipe.append((inventory_id, quantity))
        if not recipe:
            return False, "Món ăn phải có ít nhất một nguyên liệu."
        with self.db.connection:
            self.db.connection.execute("DELETE FROM recipe_ingredients WHERE menu_id = ?", (menu_id,))
            self.db.connection.executemany(
                "INSERT INTO recipe_ingredients(menu_id, inventory_id, quantity) VALUES (?, ?, ?)",
                [(menu_id, inventory_id, quantity) for inventory_id, quantity in recipe],
            )
        return True, "Đã cập nhật định lượng món ăn."

    def reset_inventory(self) -> None:
        self.db.connection.execute("UPDATE inventory SET current = initial")
        self.db.connection.commit()

    def table_detail(self, table_id: int) -> dict[str, Any] | None:
        table = self.db.one("SELECT * FROM restaurant_tables WHERE id = ?", (table_id,))
        if not table:
            return None
        order = self.db.one("SELECT * FROM orders WHERE table_id = ? AND status IN ('busy', 'waiting') ORDER BY id DESC LIMIT 1", (table_id,))
        if order:
            order["items"] = self.db.rows("SELECT order_items.*, menu.name FROM order_items JOIN menu ON menu.id = order_items.menu_id WHERE order_id = ?", (order["id"],))
        table["order"] = order
        return table

    def cancel_reservation(self, table_id: int) -> tuple[bool, str]:
        cursor = self.db.connection.execute("UPDATE restaurant_tables SET status = 'free', reservation = NULL WHERE id = ? AND status = 'reserved'", (table_id,))
        self.db.connection.commit()
        return (cursor.rowcount == 1, "Đã hủy đặt bàn." if cursor.rowcount else "Bàn không ở trạng thái đã đặt.")

    def add_menu(self, name: str, category: str, price: int, description: str) -> tuple[bool, str]:
        if not name.strip() or price < 0:
            return False, "Tên món và giá bán không hợp lệ."
        self.db.connection.execute("INSERT INTO menu(name, category, price, description) VALUES (?, ?, ?, ?)", (name.strip(), category, price, description.strip() or "Món mới trong thực đơn."))
        self.db.connection.commit()
        return True, f"Đã thêm món {name.strip()}."

    def set_menu_availability(self, menu_id: int, available: bool) -> tuple[bool, str]:
        cursor = self.db.connection.execute("UPDATE menu SET available = ? WHERE id = ?", (int(available), menu_id))
        self.db.connection.commit()
        return (cursor.rowcount == 1, "Đã cập nhật trạng thái món." if cursor.rowcount else "Không tìm thấy món.")

    def reports(self, days: int = 1) -> dict[str, Any]:
        days = days if days in {1, 7, 30} else 1
        since = f"-{days} days"
        orders = self.db.rows("SELECT * FROM orders WHERE status = 'paid' AND paid_at >= datetime('now', ?) ORDER BY paid_at", (since,))
        revenue = sum(order["total"] for order in orders)
        items = self.db.rows("SELECT menu.name, SUM(order_items.quantity) quantity FROM order_items JOIN orders ON orders.id = order_items.order_id JOIN menu ON menu.id = order_items.menu_id WHERE orders.status = 'paid' AND orders.paid_at >= datetime('now', ?) GROUP BY menu.name ORDER BY quantity DESC", (since,))
        top_dish = items[0] if items else None
        return {"days": days, "revenue": revenue, "count": len(orders), "average": round(revenue / len(orders)) if orders else 0, "top_dish": top_dish, "items": items[:5], "orders": orders}

    def invoice_detail(self, invoice_id: int) -> dict[str, Any] | None:
        invoice = self.db.one("SELECT orders.*, restaurant_tables.name table_name FROM orders JOIN restaurant_tables ON restaurant_tables.id = orders.table_id WHERE orders.id = ?", (invoice_id,))
        if invoice:
            invoice["items"] = self.db.rows("SELECT order_items.*, menu.name FROM order_items JOIN menu ON menu.id = order_items.menu_id WHERE order_id = ?", (invoice_id,))
        return invoice

    def users(self) -> list[dict[str, Any]]:
        return self.db.rows("SELECT id, name, username, role, status FROM users ORDER BY status, name")

    def update_user_status(self, username: str, status: str) -> tuple[bool, str]:
        if status not in {"active", "rejected", "pending"}:
            return False, "Trạng thái không hợp lệ."
        cursor = self.db.connection.execute("UPDATE users SET status = ? WHERE username = ? AND role != 'manager'", (status, username))
        self.db.connection.commit()
        return (cursor.rowcount == 1, "Đã cập nhật tài khoản." if cursor.rowcount else "Không thể cập nhật tài khoản quản lý.")

    def delete_user(self, username: str) -> tuple[bool, str]:
        cursor = self.db.connection.execute("DELETE FROM users WHERE username = ? AND role != 'manager'", (username,))
        self.db.connection.commit()
        return (cursor.rowcount == 1, "Đã xóa tài khoản." if cursor.rowcount else "Không thể xóa tài khoản quản lý.")

    def recommend(self, people: int, budget: int, taste: str = "") -> dict[str, Any]:
        if people < 1:
            return {"recommendations": [], "reason": "taste"}

        dishes = self.db.rows(
            "SELECT menu.*, COALESCE((SELECT group_concat(inventory.name, ' ') "
            "FROM recipe_ingredients JOIN inventory ON inventory.id = recipe_ingredients.inventory_id "
            "WHERE recipe_ingredients.menu_id = menu.id), '') AS ingredients "
            "FROM menu WHERE available = 1 AND price > 0 ORDER BY sold DESC, price, name"
        )
        if not dishes:
            return {"recommendations": [], "reason": "budget"}

        def normalize(value: str) -> str:
            value = value.lower().replace("đ", "d")
            return "".join(
                character
                for character in unicodedata.normalize("NFD", value)
                if unicodedata.category(character) != "Mn"
            )

        flavor_terms = {
            "sweet": {"ngot"},
            "spicy": {"cay", "ot", "sa te"},
            "sour": {"chua", "chua cay"},
            "salty": {"man", "muoi"},
            "rich": {"beo", "ngay"},
            "fresh": {"thanh", "mat", "thanh mat"},
            "savory": {"dam da", "dam", "umami"},
            "crispy": {"gion", "gion tan"},
        }
        flavor_cues = {
            "sweet": ("ngọt", "mật ong", "sữa đặc", "chè", "xoài chín"),
            "spicy": ("cay", "sa tế", "ớt", "tiêu"),
            "sour": ("chua", "chanh", "me", "tắc"),
            "salty": ("mặn", "muối", "nước mắm"),
            "rich": ("béo", "bơ", "phô mai", "sữa đặc", "kem"),
            "fresh": ("thanh mát", "thanh", "mát", "bạc hà", "sả"),
            "savory": ("đậm đà", "thơm nồng", "bơ tỏi", "đậm"),
            "crispy": ("giòn", "vàng giòn", "giòn tan"),
        }

        def contains_phrase(text: str, phrase: str) -> bool:
            if normalize(phrase) != phrase or "đ" in phrase:
                original_text = unicodedata.normalize("NFC", text.lower())
                original_phrase = unicodedata.normalize("NFC", phrase.lower())
                return re.search(
                    rf"(?<!\w){re.escape(original_phrase)}(?!\w)",
                    original_text,
                ) is not None
            normalized_text = normalize(text)
            normalized_phrase = normalize(phrase)
            return re.search(
                rf"(?<![a-z0-9]){re.escape(normalized_phrase)}(?![a-z0-9])",
                normalized_text,
            ) is not None

        requested_flavors = {
            flavor
            for flavor, terms in flavor_terms.items()
            if any(contains_phrase(taste or "", term) for term in terms)
        }

        stop_words = {
            "an", "cho", "co", "don", "hay", "la", "mon", "muon", "nhieu",
            "nguoi", "thuc", "toi", "thich", "trong", "va", "vi", "voi", "qua",
        }
        negative_markers = {"bot", "han", "it", "k", "khong", "kieng", "ko", "ne", "tranh"}
        raw_taste_tokens = re.findall(
            r"[^\W_]+|[,;.!?]",
            unicodedata.normalize("NFC", (taste or "").lower()),
        )
        taste_tokens = [(normalize(token), token) for token in raw_taste_tokens]
        positive_preferences: set[tuple[str, str | None]] = set()
        negative_preferences: set[tuple[str, str | None]] = set()
        connectors = {"and", "hoac", "nhung", "or", "va"}
        for index, (token, _) in enumerate(taste_tokens):
            if token not in negative_markers:
                continue
            candidate_index = index + 1
            while candidate_index < len(taste_tokens):
                candidate, raw_candidate = taste_tokens[candidate_index]
                if candidate in connectors or re.fullmatch(r"[,;.!?]", raw_taste_tokens[candidate_index]):
                    break
                if candidate in stop_words or (token == "han" and candidate == "che"):
                    candidate_index += 1
                    continue
                if candidate in negative_markers:
                    break
                strict = normalize(raw_candidate) != raw_candidate or "đ" in raw_candidate
                negative_preferences.add((candidate, raw_candidate if strict else None))
                if candidate == "hai" and candidate_index + 1 < len(taste_tokens):
                    next_candidate, next_raw = taste_tokens[candidate_index + 1]
                    if next_candidate == "san":
                        strict_next = normalize(next_raw) != next_raw or "đ" in next_raw
                        negative_preferences.add((next_candidate, next_raw if strict_next else None))
                break

        def is_negative_preference(preference: tuple[str, str | None]) -> bool:
            token, exact = preference
            return any(
                negative_token == token and (negative_exact is None or negative_exact == exact)
                for negative_token, negative_exact in negative_preferences
            )

        if {"hai", "san"} <= {token for token, _ in negative_preferences}:
            negative_preferences.update({
                ("ca", "cá"),
                ("tom", "tôm"),
                ("muc", "mực"),
                ("ngheu", "nghêu"),
                ("so", "sò"),
                ("cua", None),
            })

        positive_preferences.update(
            (token, raw_token if normalize(raw_token) != raw_token or "đ" in raw_token else None)
            for token, raw_token in taste_tokens
            if token not in stop_words
            and token not in connectors
            and token not in negative_markers
            and not re.fullmatch(r"[,;.!?]", raw_token)
            and not is_negative_preference((
                token,
                raw_token if normalize(raw_token) != raw_token or "đ" in raw_token else None,
            ))
        )
        negative_flavors = {
            flavor
            for flavor, terms in flavor_terms.items()
            if any(
                contains_phrase(preference[0], term)
                for preference in negative_preferences
                for term in terms
            )
        }
        requested_flavors.difference_update(negative_flavors)
        positive_preferences = {
            preference
            for preference in positive_preferences
            if not any(
                contains_phrase(preference[0], term)
                for terms in flavor_terms.values()
                for term in terms
            )
        }
        if taste.strip() and not positive_preferences and not negative_preferences:
            if not requested_flavors:
                return {"recommendations": [], "reason": "taste"}

        def dish_text(dish: dict[str, Any]) -> str:
            return f"{dish['name']} {dish['description']}"

        def preference_matches(
            dish: dict[str, Any],
            preference: tuple[str, str | None],
            include_ingredients: bool = True,
        ) -> bool:
            dish_text = unicodedata.normalize(
                "NFC",
                (
                    f"{dish['name']} {dish['description']} {dish['ingredients']}"
                    if include_ingredients else f"{dish['name']} {dish['description']}"
                ).lower(),
            )
            exact_tokens = set(re.findall(r"[^\W_]+", dish_text))
            normalized_tokens = {normalize(token) for token in exact_tokens}
            token, exact = preference
            return exact in exact_tokens if exact else token in normalized_tokens

        def preference_score(dish: dict[str, Any]) -> int:
            positive_matches = sum(
                preference_matches(
                    dish,
                    preference,
                    include_ingredients=not requested_flavors,
                )
                for preference in positive_preferences
            )
            has_negative_match = any(
                preference_matches(dish, preference) for preference in negative_preferences
            )
            return 5 * positive_matches - 8 * has_negative_match

        def matched_flavors(dish: dict[str, Any]) -> set[str]:
            text = dish_text(dish)
            return {
                flavor
                for flavor, cues in flavor_cues.items()
                if any(contains_phrase(text, cue) for cue in cues)
            }

        def has_negative_flavor_match(dish: dict[str, Any]) -> bool:
            return bool(matched_flavors(dish) & negative_flavors)

        def has_negative_match(dish: dict[str, Any]) -> bool:
            return any(
                preference_matches(dish, preference) for preference in negative_preferences
            ) or has_negative_flavor_match(dish)

        for dish in dishes:
            dish["preference_score"] = preference_score(dish)

        has_positive_preferences = bool(positive_preferences or requested_flavors)
        if has_positive_preferences:
            matched_dishes = [
                dish for dish in dishes
                if not has_negative_match(dish)
                and (
                    bool(matched_flavors(dish) & requested_flavors)
                    if requested_flavors
                    else dish["preference_score"] > 0
                )
            ]
            if not matched_dishes:
                return {"recommendations": [], "reason": "taste"}
        else:
            matched_dishes = [dish for dish in dishes if not has_negative_match(dish)]
            if not matched_dishes:
                return {"recommendations": [], "reason": "taste"}

        mains = [dish for dish in dishes if dish["category"] == "Món chính"]
        recommendations: list[dict[str, Any]] = []
        remaining_budget = budget

        if has_positive_preferences:
            eligible = matched_dishes
            categories = ("Món chính", "Khai vị", "Đồ uống")
            for category in categories:
                candidates = [
                    dish for dish in eligible
                    if dish["category"] == category
                    and dish["price"] * (people if category == "Món chính" else 1) <= remaining_budget
                ]
                if not candidates:
                    continue
                dish = max(
                    candidates,
                    key=lambda item: (
                        len(matched_flavors(item) & requested_flavors),
                        item["preference_score"],
                        item["sold"],
                        -item["price"],
                    ),
                )
                target_quantity = people if category in {"Món chính", "Đồ uống"} else (people + 1) // 2
                quantity = min(target_quantity, remaining_budget // dish["price"])
                if quantity < 1:
                    continue
                dish["quantity"] = quantity
                dish["line_total"] = dish["price"] * quantity
                recommendations.append(dish)
                remaining_budget -= dish["line_total"]
        else:
            affordable_mains = [
                dish for dish in matched_dishes
                if dish["category"] == "Món chính"
                if not has_negative_match(dish)
                and (not requested_flavors or bool(matched_flavors(dish) & requested_flavors))
                and dish["price"] * people <= budget
            ]
            if not affordable_mains:
                return {"recommendations": [], "reason": "budget"}

            main = max(
                affordable_mains,
                key=lambda dish: (
                    dish["preference_score"],
                    dish["sold"],
                    -dish["price"],
                ),
            )
            main["quantity"] = people
            main["line_total"] = main["price"] * people
            recommendations = [main]
            remaining_budget = budget - main["line_total"]

            extras_by_category = {
                category: [dish for dish in dishes if dish["category"] == category]
                for category in ("Khai vị", "Đồ uống")
            }
            extras = []
            for category, candidates in extras_by_category.items():
                eligible = [
                    dish for dish in candidates
                    if not has_negative_match(dish)
                    and (not requested_flavors or bool(matched_flavors(dish) & requested_flavors))
                ]
                if eligible:
                    extras.append(max(
                        eligible,
                        key=lambda dish: (
                            dish["preference_score"],
                            dish["sold"],
                            -dish["price"],
                        ),
                    ))

            for dish in extras:
                target_quantity = (people + 1) // 2 if dish["category"] == "Khai vị" else people
                quantity = min(target_quantity, remaining_budget // dish["price"])
                if quantity < 1:
                    continue
                dish["quantity"] = quantity
                dish["line_total"] = dish["price"] * quantity
                recommendations.append(dish)
                remaining_budget -= dish["line_total"]

        for dish in recommendations:
            dish.pop("ingredients", None)
            dish.pop("preference_score", None)
        return {
            "recommendations": recommendations,
            "reason": None if recommendations else "budget",
        }

    def describe_dish(self, menu_id: int) -> str:
        dish = self.db.one("SELECT * FROM menu WHERE id = ?", (menu_id,))
        return f"{dish['description']} Một lựa chọn nổi bật của Golden Lotus." if dish else "Không tìm thấy món ăn."

    @staticmethod
    def money(value: int | float) -> str:
        return f"{value:,.0f}".replace(",", ".") + "đ"
