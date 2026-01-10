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
