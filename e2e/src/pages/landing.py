from playwright.sync_api import Page

from src.util.constants import NEXT_PUBLIC_APP_URL


class LandingPage:
    def __init__(self, page: Page):
        self.page = page
        self.enter_button = self.page.get_by_role("link", name="Enter")

    def navigate(self):
        self.page.goto(NEXT_PUBLIC_APP_URL)
