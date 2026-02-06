import re

import pytest
from playwright.sync_api import Page, expect

from src.models.user import User
from src.pages.landing import LandingPage
from src.pages.login import LoginPage
from src.util.constants import ENVIRONMENT, NEXT_PUBLIC_APP_URL

disabled_routes_map: dict[str, list[str]] = {
    "dev": [],
    "qa": ["/dev"],
    "prod": ["/dev"],
}


class TestLanding:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.landing_page = LandingPage(page)

    def test_has_welcome_message(self, page):
        self.landing_page.navigate()

        expect(page.get_by_text("FakeOut Labs")).to_be_visible()

    def test_enter_app(self, page: Page):
        self.landing_page.navigate()
        self.landing_page.enter_button.click()

        expect(page).to_have_url(re.compile("/auth"))

    @pytest.mark.user("mewtwo")
    def test_enter_app_already_signed_in(self, page: Page, user: User):
        login_page = LoginPage(page)
        login_page.login(user)

        expect(page).to_have_url(re.compile("/home"))

        self.landing_page.navigate()
        expect(page).to_have_url(re.compile("/"))
        self.landing_page.enter_button.click()

        expect(page).to_have_url(re.compile("/home"))

    @pytest.mark.parametrize("route", [("/home")])
    def test_protected_routes(self, page: Page, route: str):
        page.goto(f"{NEXT_PUBLIC_APP_URL}{route}")

        expect(page).to_have_url(re.compile("/auth"))

    @pytest.mark.parametrize("route", [("/auth")])
    def test_public_routes(self, page: Page, route: str):
        page.goto(f"{NEXT_PUBLIC_APP_URL}{route}")

        expect(page).to_have_url(re.compile(route))

    @pytest.mark.parametrize("route", disabled_routes_map[ENVIRONMENT])
    def test_dev_routes(self, page: Page, route: str):
        response = page.goto(f"{NEXT_PUBLIC_APP_URL}{route}")

        assert response is not None
        assert response.status == 404
