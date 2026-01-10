from playwright.sync_api import Page

from src.util.constants import APP_URL


class LandingPage:
    def __init__(self, page: Page):
        self.page = page

    def navigate(self):
        self.page.goto(APP_URL)
