import re

import pytest
from playwright.sync_api import Page, expect

from src.pages.metagame import MetagamePage


class TestTeams:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.metagame_page = MetagamePage(page)

    @pytest.mark.skip("Not implemented")
    def test_go_to_tournament(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_tournament_analytics(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_add_tournament_raw_data(self):
        pass

    @pytest.mark.skip("Not implemented")
    def test_add_tournament_link(self):
        pass
