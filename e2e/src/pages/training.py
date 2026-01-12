from playwright.sync_api import Page


class TrainingsPage:
    def __init__(self, page: Page):
        self.page = page


class DetailedTrainingPage:
    def __init__(self, page: Page):
        self.page = page


class AnalyzeTrainingPage:
    def __init__(self, page: Page):
        self.page = page


class BattlePage:
    def __init__(self, page: Page):
        self.page = page
