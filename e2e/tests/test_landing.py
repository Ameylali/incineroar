import re

import pytest
from playwright.sync_api import Page, expect

from src.pages.landing import LandingPage


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

    @pytest.mark.skip("Not implemented")
    def test_enter_app_already_signed_in(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_protected_routes(self, page: Page):
        pass
