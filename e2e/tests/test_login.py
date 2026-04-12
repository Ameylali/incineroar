import re

import pytest
from playwright.sync_api import Page, expect

from src.models.user import User
from src.pages.login import LoginPage
from src.util.api import create_api_with_token
from src.util.cookie import get_cookie
from src.util.names import prefixed_name


class TestLogin:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_prefix: str):
        self.login_page = LoginPage(page)
        self.prefix = test_prefix

    @pytest.mark.user("mew")
    def test_login(self, page: Page, user: User):
        self.login_page.login(user)

        expect(page).to_have_url(re.compile("/home"))

    def test_sign_up(self, page: Page):
        signup_username = prefixed_name("e2e_test_user")
        self.login_page.navigate()
        self.login_page.sign_up_button.click()
        page.locator("span").first.click()
        self.login_page.username_input.fill(signup_username)
        self.login_page.username_input.press("Tab")
        self.login_page.password_input.fill("123456")
        self.login_page.password_input.press("Tab")
        self.login_page.confirm_password_input.fill("123456")
        self.login_page.sign_up_button.click()

        expect(self.login_page.sign_in_button).to_be_visible()

        self.login_page.username_input.click()
        self.login_page.username_input.fill(signup_username)
        self.login_page.password_input.click()
        self.login_page.password_input.fill("123456")
        self.login_page.sign_in_button.click()

        expect(page).to_have_url(re.compile("/home"))

        x = page.context.cookies()
        jwt_cookie = get_cookie("jwt", page.context.cookies())
        assert jwt_cookie is not None

        api = create_api_with_token(jwt_cookie["value"])
        api.delete_current_user()
