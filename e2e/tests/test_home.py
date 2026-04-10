import re

import pytest
from playwright.sync_api import Page, expect

from src.models.user import User
from src.pages.home import HomePage
from src.pages.login import LoginPage


class TestHome:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, random_user: User):
        user = random_user
        self.home_page = HomePage(page)
        self.user = user

        login_page = LoginPage(page)
        login_page.login(user)
        expect(page).to_have_url(re.compile("/home"))

    def test_side_navigation(self, page: Page, subtests: pytest.Subtests):
        self.home_page.navigate()
        side_nav_items = [
            (self.home_page.teams_menu_item, "/teams"),
            (self.home_page.metagame_menu_item, "/metagame"),
            (self.home_page.training_menu_item, "/training"),
        ]

        for item, path in side_nav_items:
            with subtests.test(f"Menu item {path}", page=page, item=item, path=path):
                expect(item).to_be_visible()

                item.click()

                expect(page).to_have_url(re.compile(path))

    def test_sign_out(self, page: Page):
        self.home_page.navigate()
        self.home_page.sign_out_menu_item.click()

        expect(page).not_to_have_url(re.compile("/home"))

        self.home_page.navigate()

        expect(page).to_have_url(re.compile("/auth"))


class TestAdminHome:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, random_admin: User):
        user = random_admin
        self.home_page = HomePage(page)
        self.user = user

        login_page = LoginPage(page)
        login_page.login(user)
        expect(page).to_have_url(re.compile("/home"))

    def test_side_navigation(self, page: Page, subtests: pytest.Subtests):
        self.home_page.navigate()
        side_nav_items = [
            (self.home_page.admin_subitems["metagame"], "/metagame/admin"),
        ]

        for item, path in side_nav_items:
            with subtests.test(f"Menu item {path}", page=page, item=item, path=path):
                self.home_page.admin_menu_item.click()

                expect(item).to_be_visible()

                item.click()

                expect(page).to_have_url(re.compile(path))
