from playwright.sync_api import Page

from src.models.user import User
from src.util.constants import NEXT_PUBLIC_APP_URL


class LoginPage:
    def __init__(self, page: Page):
        self.page = page
        self.sign_in_button = self.page.get_by_role("button", name="Sign in")
        self.sign_up_button = self.page.get_by_role("button", name="Sign up")
        self.already_have_account_button = self.page.get_by_role(
            "button", name="I already have an account"
        )
        self.password_input = self.page.get_by_role(
            "textbox", name="Password", exact=True
        )
        self.confirm_password_input = self.page.get_by_role(
            "textbox", name="Confirm password", exact=True
        )
        self.username_input = self.page.get_by_role("textbox", name="Username")

    def navigate(self):
        self.page.goto(f"{NEXT_PUBLIC_APP_URL}/auth")

    def login(self, user: User):
        self.navigate()
        self.username_input.fill(user.username)
        self.password_input.fill(user.password)
        self.sign_in_button.click()
