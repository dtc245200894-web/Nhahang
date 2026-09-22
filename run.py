from frontend.main import LoginWindow
from backend.database import Database


if __name__ == "__main__":
    app = LoginWindow(Database())
    app.mainloop()
