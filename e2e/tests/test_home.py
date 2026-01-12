import pytest
from playwright.sync_api import Page

from src.pages.home import HomePage


class TestHome:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.home_page = HomePage(page)

    @pytest.mark.skip("Not implemented")
    def test_side_navigation(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_sign_out(self, page: Page):
        pass
