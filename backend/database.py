from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "golden_lotus.db"

MENU_SEED = [
    ("Cơm gà sốt tiêu", "Món chính", 55000, "Gà nướng mềm, sốt tiêu đen thơm nồng.", 42),
    ("Cá hồi áp chảo", "Món chính", 125000, "Cá hồi áp chảo vàng cạnh, rau củ theo mùa.", 31),
    ("Mì Ý bò bằm", "Món chính", 85000, "Sốt bò bằm nấu chậm cùng thảo mộc.", 28),
    ("Salad vườn xanh", "Khai vị", 45000, "Rau xanh giòn mát cùng sốt chanh nhẹ.", 24),
    ("Khoai tây lắc", "Khai vị", 35000, "Khoai tây giòn lắc phô mai.", 19),
    ("Trà đào cam sả", "Đồ uống", 38000, "Trà đào thanh mát, hương cam sả.", 37),
    ("Nước ép dứa", "Đồ uống", 42000, "Dứa tươi ép lạnh trong ngày.", 21),
    ("Súp bí đỏ", "Khai vị", 40000, "Súp bí đỏ mịn, vị ngọt tự nhiên.", 16),
    ("Bò lúc lắc khoai tây", "Món chính", 135000, "Thịt bò mềm áp chảo cùng khoai tây giòn.", 18),
    ("Tôm nướng bơ tỏi", "Món chính", 145000, "Tôm tươi nướng thơm với bơ tỏi.", 15),
    ("Gỏi cuốn tôm thịt", "Khai vị", 55000, "Bánh tráng cuốn tôm thịt và rau xanh.", 22),
    ("Bánh xếp chiên", "Khai vị", 48000, "Bánh xếp vàng giòn, nhân đậm đà.", 14),
    ("Trà chanh mật ong", "Đồ uống", 32000, "Trà thanh mát với chanh tươi và mật ong.", 26),
    ("Sinh tố xoài", "Đồ uống", 45000, "Xoài chín xay mịn, vị ngọt tự nhiên.", 19),
    ("Cơm sườn nướng mật ong", "Món chính", 95000, "Sườn nướng mềm phủ mật ong.", 25),
    ("Mực nướng sa tế", "Món chính", 120000, "Mực tươi nướng thơm, cay nhẹ.", 13),
    ("Cơm chiên hải sản", "Món chính", 88000, "Cơm chiên tơi cùng tôm, mực và rau củ.", 20),
    ("Đậu hũ chiên giòn", "Khai vị", 38000, "Đậu hũ chiên vàng giòn, sốt chua ngọt.", 17),
    ("Nem rán", "Khai vị", 45000, "Nem rán vàng giòn với nhân rau củ.", 12),
    ("Chè khúc bạch", "Khai vị", 42000, "Khúc bạch mềm mát, nhãn tươi.", 11),
    ("Soda chanh bạc hà", "Đồ uống", 35000, "Soda mát lạnh với chanh và bạc hà.", 23),
    ("Cà phê sữa đá", "Đồ uống", 30000, "Cà phê rang đậm pha cùng sữa đặc.", 29),
]

INGREDIENT_SEED = [
    ("Thịt gà", "kg", 12), ("Cá hồi", "kg", 8), ("Thịt bò", "kg", 10),
    ("Rau xanh", "kg", 15), ("Khoai tây", "kg", 10), ("Tôm", "kg", 7),
    ("Mì Ý", "kg", 6), ("Bí đỏ", "kg", 8), ("Sườn heo", "kg", 9),
    ("Mực tươi", "kg", 7), ("Hải sản tổng hợp", "kg", 8), ("Đậu hũ", "kg", 5),
    ("Bánh tráng", "kg", 4), ("Bột mì", "kg", 6), ("Bún nem", "kg", 5),
    ("Xoài", "kg", 8), ("Dứa", "kg", 8), ("Đào ngâm", "kg", 5),
    ("Chanh tươi", "kg", 4), ("Mật ong", "lít", 3), ("Cà phê", "kg", 3),
    ("Sữa đặc", "lít", 5), ("Sữa tươi", "lít", 5), ("Tỏi", "kg", 3),
    ("Sốt tiêu đen", "lít", 3), ("Sốt cà chua", "lít", 5), ("Dầu ăn", "lít", 10),
    ("Nước soda", "lít", 10), ("Bạc hà", "kg", 2), ("Đường", "kg", 5),
    ("Gelatin", "kg", 2), ("Nhãn", "kg", 4),
]

RECIPE_SEED = {
    "Cơm gà sốt tiêu": [("Thịt gà", 0.18), ("Sốt tiêu đen", 0.025)],
    "Cá hồi áp chảo": [("Cá hồi", 0.20), ("Rau xanh", 0.10)],
    "Mì Ý bò bằm": [("Thịt bò", 0.15), ("Mì Ý", 0.12), ("Sốt cà chua", 0.08)],
    "Salad vườn xanh": [("Rau xanh", 0.15), ("Chanh tươi", 0.01)],
    "Khoai tây lắc": [("Khoai tây", 0.15), ("Dầu ăn", 0.02)],
    "Trà đào cam sả": [("Đào ngâm", 0.05), ("Chanh tươi", 0.01), ("Đường", 0.01)],
    "Nước ép dứa": [("Dứa", 0.22), ("Đường", 0.01)],
    "Súp bí đỏ": [("Bí đỏ", 0.20), ("Sữa tươi", 0.05)],
    "Bò lúc lắc khoai tây": [("Thịt bò", 0.18), ("Khoai tây", 0.12), ("Dầu ăn", 0.02)],
    "Tôm nướng bơ tỏi": [("Tôm", 0.18), ("Tỏi", 0.01), ("Dầu ăn", 0.01)],
    "Gỏi cuốn tôm thịt": [("Tôm", 0.08), ("Bánh tráng", 0.04), ("Rau xanh", 0.10)],
    "Bánh xếp chiên": [("Bột mì", 0.08), ("Thịt bò", 0.05), ("Dầu ăn", 0.02)],
    "Trà chanh mật ong": [("Chanh tươi", 0.02), ("Mật ong", 0.02), ("Đường", 0.01)],
    "Sinh tố xoài": [("Xoài", 0.18), ("Sữa tươi", 0.05), ("Đường", 0.01)],
    "Cơm sườn nướng mật ong": [("Sườn heo", 0.22), ("Mật ong", 0.02), ("Dầu ăn", 0.01)],
    "Mực nướng sa tế": [("Mực tươi", 0.18), ("Tỏi", 0.01), ("Dầu ăn", 0.01)],
    "Cơm chiên hải sản": [("Hải sản tổng hợp", 0.12), ("Mực tươi", 0.05), ("Dầu ăn", 0.02)],
    "Đậu hũ chiên giòn": [("Đậu hũ", 0.18), ("Dầu ăn", 0.02)],
    "Nem rán": [("Bún nem", 0.08), ("Bột mì", 0.04), ("Dầu ăn", 0.02)],
    "Chè khúc bạch": [("Sữa tươi", 0.10), ("Gelatin", 0.01), ("Nhãn", 0.05), ("Đường", 0.02)],
    "Soda chanh bạc hà": [("Nước soda", 0.25), ("Chanh tươi", 0.02), ("Bạc hà", 0.005), ("Đường", 0.01)],
    "Cà phê sữa đá": [("Cà phê", 0.025), ("Sữa đặc", 0.03), ("Đường", 0.01)],
}


def password_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class Database:
    def __init__(self, path: Path = DB_PATH) -> None:
        self.path = path
        self.connection = sqlite3.connect(path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.create_schema()
        self.seed()

    def create_schema(self) -> None:
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active'
            );
            CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
                price INTEGER NOT NULL, description TEXT NOT NULL, sold INTEGER NOT NULL DEFAULT 0,
                available INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS restaurant_tables (
                id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, seats INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'free', reservation TEXT, order_number TEXT
            );
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY, table_id INTEGER NOT NULL, status TEXT NOT NULL,
                subtotal INTEGER NOT NULL, service_fee INTEGER NOT NULL, total INTEGER NOT NULL,
                created_at TEXT NOT NULL, paid_at TEXT, payment_method TEXT,
                FOREIGN KEY(table_id) REFERENCES restaurant_tables(id)
            );
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, menu_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL, price INTEGER NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(menu_id) REFERENCES menu(id)
            );
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, unit TEXT NOT NULL,
                current REAL NOT NULL, initial REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS recipe_ingredients (
                menu_id INTEGER NOT NULL, inventory_id INTEGER NOT NULL,
                quantity REAL NOT NULL, PRIMARY KEY(menu_id, inventory_id),
                FOREIGN KEY(menu_id) REFERENCES menu(id),
                FOREIGN KEY(inventory_id) REFERENCES inventory(id)
            );
            """
        )
        user_columns = {row[1] for row in self.connection.execute("PRAGMA table_info(users)")}
        if "phone" not in user_columns:
            self.connection.execute("ALTER TABLE users ADD COLUMN phone TEXT")
        order_columns = {row[1] for row in self.connection.execute("PRAGMA table_info(orders)")}
        if "payment_method" not in order_columns:
            self.connection.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT")
        self.connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL")
        self.connection.commit()

    def seed(self) -> None:
        if not self.connection.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            self.connection.execute(
                "INSERT INTO users(name, username, password, role) VALUES (?, ?, ?, ?)",
                ("Minh Anh", "minh.anh", password_hash("123456"), "manager"),
            )
        if not self.connection.execute("SELECT 1 FROM menu LIMIT 1").fetchone():
            self.connection.executemany(
                "INSERT INTO menu(name, category, price, description, sold) VALUES (?, ?, ?, ?, ?)",
                MENU_SEED,
            )
        if not self.connection.execute("SELECT 1 FROM restaurant_tables LIMIT 1").fetchone():
            self.connection.executemany(
                "INSERT INTO restaurant_tables(name, seats) VALUES (?, ?)",
                [(f"Bàn {index:02d}", (2, 4, 6)[(index - 1) % 3]) for index in range(1, 19)],
            )
        for name, unit, amount in INGREDIENT_SEED:
            self.connection.execute(
                "INSERT OR IGNORE INTO inventory(name, unit, current, initial) VALUES (?, ?, ?, ?)",
                (name, unit, amount, amount),
            )
        for dish_name, recipe in RECIPE_SEED.items():
            dish = self.connection.execute("SELECT id FROM menu WHERE name = ?", (dish_name,)).fetchone()
            if not dish:
                continue
            for ingredient_name, quantity in recipe:
                ingredient = self.connection.execute("SELECT id FROM inventory WHERE name = ?", (ingredient_name,)).fetchone()
                if ingredient:
                    self.connection.execute(
                        "INSERT OR REPLACE INTO recipe_ingredients(menu_id, inventory_id, quantity) VALUES (?, ?, ?)",
                        (dish[0], ingredient[0], quantity),
                    )
        self.connection.commit()

    def rows(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute(query, params).fetchall()]

    def one(self, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        row = self.connection.execute(query, params).fetchone()
        return dict(row) if row else None

    def close(self) -> None:
        self.connection.close()


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")
