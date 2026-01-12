import pytest
from playwright.sync_api import Page

from src.pages.teams import TeamsPage


class TestTeams:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.teams_page = TeamsPage(page)

    @pytest.mark.skip("Not implemented")
    def test_import_team(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_edit_team(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_delete_team(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_navigate_to_team(self, page: Page):
        pass
