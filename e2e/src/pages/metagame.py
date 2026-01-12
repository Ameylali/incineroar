from playwright.sync_api import Page


class MetagamePage:
    def __init__(self, page: Page):
        self.page = page
