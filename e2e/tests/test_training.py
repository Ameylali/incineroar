import pytest
from playwright.sync_api import Page

from src.pages.training import (
    AnalyzeTrainingPage,
    BattlePage,
    DetailedTrainingPage,
    TrainingsPage,
)


class TestTrainings:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.training_page = TrainingsPage(page)

    @pytest.mark.skip("Not implemented")
    def test_add_training(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_edit_training(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_delete_training(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_add_quick_battle(self, page: Page):
        pass


class TestDetailedTraining:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.detaild_training_page = DetailedTrainingPage(page)

    @pytest.mark.skip("Not implemented")
    def test_import_battle(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_add_battle(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_edit_training(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_edit_battle(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_delete_battle(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_analyze(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_training_details(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_go_to_battle(self, page: Page):
        pass


class TestAnalyzeTraining:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.analyze_training_page = AnalyzeTrainingPage(page)

    @pytest.mark.skip("Not implemented")
    def test_matchups(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_openings(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_usage(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_moves(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_kos(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_faints(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_key_action_kos(self, page: Page):
        pass

    @pytest.mark.skip("Not implemented")
    def test_key_action_faint(self):
        pass

    @pytest.mark.skip("Not implemented")
    def test_key_action_switch(self):
        pass

    @pytest.mark.skip("Not implemented")
    def test_key_action_my_pokemon(self):
        pass

    @pytest.mark.skip("Not implemented")
    def test_key_action_riva(self):
        pass


class TestBattle:
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.battle_page = BattlePage(page)

    @pytest.mark.skip("Not implemented")
    def test_edit(self):
        pass
