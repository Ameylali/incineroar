import re

import pytest
from playwright.sync_api import Page, expect

from src.models.user import User
from src.pages.login import LoginPage


class TestLogin:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.login_page = LoginPage(page)

    @pytest.mark.user("arceus")
    def test_login(self, page: Page, user: User):
        self.login_page.login(user)
        expect(page).to_have_url(re.compile("/home"))

    @pytest.mark.skip("Not implemented")
    def test_sign_up(self, page: Page):
        pass
