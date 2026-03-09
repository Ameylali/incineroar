import re
from datetime import datetime

import pytest
from playwright.sync_api import Page, expect

from src.models.team import Team
from src.models.training import Action, Battle, Training, Turn
from src.models.user import User
from src.pages.login import LoginPage
from src.pages.training import (
    AnalyzeTrainingPage,
    BattlePage,
    BulkAnalyticsPage,
    DetailedTrainingPage,
    TrainingsPage,
)
from tests.conftest import MakeBattle, MakeTeam, MakeTraining

BASE_TURNS = [
    Turn(
        0,
        [
            Action(0, "", "switch", "solgaleo", [], "p1"),
            Action(1, "", "switch", "miraidon", [], "p1"),
            Action(2, "", "switch", "koraidon", [], "p2"),
            Action(3, "", "switch", "lunala", [], "p2"),
        ],
    ),
    Turn(
        1,
        [
            Action(
                0, "flash canon", "move", "solgaleo", ["p2:lunala", "p2:koraidon"], "p1"
            ),
            Action(
                1,
                "draco meteor",
                "move",
                "miraidon",
                ["p2:lunala", "p2:koraidon"],
                "p1",
            ),
            Action(
                2,
                "close combat",
                "move",
                "koraidon",
                ["p1:solgaleo", "p1:miraidon"],
                "p2",
            ),
            Action(
                3,
                "moongeist beam",
                "move",
                "lunala",
                ["p1:solgaleo", "p1:miraidon"],
                "p2",
            ),
        ],
    ),
    Turn(
        2,
        [
            Action(
                0, "fainted", "effect", "solgaleo", ["p2:lunala", "p2:koraidon"], "p1"
            ),
            Action(
                1, "fainted", "effect", "miraidon", ["p2:lunala", "p2:koraidon"], "p1"
            ),
            Action(
                2, "fainted", "effect", "koraidon", ["p1:solgaleo", "p1:miraidon"], "p2"
            ),
            Action(
                3, "fainted", "effect", "lunala", ["p1:solgaleo", "p1:miraidon"], "p2"
            ),
        ],
    ),
]


class TestBaseTraining:
    username = "mewtwo"
    user: User
    trainings: list[Training]
    teams: list[Team]


@pytest.fixture(autouse=True, scope="module")
def test_data(
    get_user,
    make_training: MakeTraining,
    make_battle: MakeBattle,
    make_team: MakeTeam,
):
    user = get_user(TestBaseTraining.username)
    trainings = []

    teams = [
        make_team(user, Team("team 1", 2025, "reg h", "rayquaza")),
    ]

    for i in range(9):
        training = Training(
            name=f"Test training {i + 1}",
            description="Sample training description",
            season=2025,
            format="reg j",
        )

        # No format for training 4
        if i == 4:
            training.season = None
            training.format = None

        created_training = make_training(user, training)

        if created_training.id is None:
            continue

        for j in range(3):
            turns: list[Turn] = []
            for turn_idx in range(3):
                actions: list[Action] = []
                for action_idx in range(3):
                    if action_idx % 2 == 1:
                        action = Action(
                            index=action_idx,
                            name=f"Action {action_idx + 1}",
                            type="move",
                            user="miraidon" if action_idx < 2 else "solgaleo",
                            targets=["p2:lunala", "p2:koraidon"],
                            player="p1",
                        )
                    else:
                        action = Action(
                            index=action_idx,
                            name=f"Action {action_idx + 1}",
                            type="move",
                            user="koraidon" if action_idx < 2 else "lunala",
                            targets=["p1:solgaleo", "p1:miraidon"],
                            player="p2",
                        )
                    actions.append(action)

                turn = Turn(index=turn_idx, actions=actions)
                turns.append(turn)

            turns.extend(BASE_TURNS)
            battle = Battle(
                name=f"Battle {j + 1}",
                notes=f"Test battle {j + 1} for training {i + 1}",
                turns=turns,
            )

            # Empty battles for training with idx 4
            if i == 4:
                battle = Battle("empty battle", "")

            created_battle = make_battle(user, created_training.id, battle)
            created_training.battles.append(created_battle)

        trainings.append(created_training)

    yield user, trainings, teams


class TestTrainings(TestBaseTraining):
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_data):
        user, trainings, teams = test_data
        self.user = user
        self.trainings = trainings
        self.teams = teams
        self.training_page = TrainingsPage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.training_page.navigate()

    def test_add_training(self, page: Page):
        """
        1. Create a new training with these data:
            - Name: "create training test"
            - Description: "This is a test training"
            - Season: 2025
            - Format: "reg j"
            - Team: "team 1"
        2. Verify the training appears in the training list with correct details.
        3. Clean up by deleting the created training.
        """
        # Click add training button
        self.training_page.add_training_button.click()

        # Fill out the training form
        self.training_page.training_modal["name"].fill("create training test")
        self.training_page.training_modal["description"].fill("This is a test training")
        self.training_page.training_modal["season"].click()
        self.training_page.modal_season_option(2025).click()
        self.training_page.training_modal["format"].fill("reg j")
        self.training_page.training_modal["team"].click()
        self.training_page.modal_team_item(self.teams[0].name).click()

        # Submit the form
        self.training_page.training_modal["submit"].click()

        # Verify the training appears in the list
        expect(self.training_page.training_link("create training test")).to_be_visible()

        # Clean up by deleting the created training
        self.training_page.row_actions_button("create training test").click()
        self.training_page.row_action_delete_button.click()

        # Verify it's deleted
        expect(
            self.training_page.training_link("create training test")
        ).not_to_be_visible()

    def test_edit_training(self, page: Page):
        """
        1. Edit the training[0] with these data:
            - Name: "updated test training 1"
            - Description: "updated description"
            - Format: "updated"
            - Team: "team 1"
        2. Verify the training was updated by opening the edit modal and check the updated values
        """
        training = self.trainings[0]

        # Open edit modal for first training
        self.training_page.row_actions_button(training.name).click()
        self.training_page.row_action_edit_button.click()

        # Update training data
        self.training_page.training_modal["name"].fill("updated test training 1")
        self.training_page.training_modal["description"].fill("updated description")
        self.training_page.training_modal["format"].fill("updated")
        self.training_page.training_modal["team"].click()
        self.training_page.modal_team_item(self.teams[0].name).click()

        # Save changes
        self.training_page.training_modal["update"].click()

        # Verify the training was updated by opening edit modal again
        self.training_page.row_actions_button("updated test training 1").click()
        self.training_page.row_action_edit_button.click()

        # Check the updated values
        expect(self.training_page.training_modal["name"]).to_have_value(
            "updated test training 1"
        )
        expect(self.training_page.training_modal["description"]).to_have_value(
            "updated description"
        )
        expect(self.training_page.training_modal["format"]).to_have_value("updated")
        expect(page.get_by_text("team 1")).to_be_visible()

        # Cancel to close modal
        self.training_page.training_modal["cancel"].click()

    def test_delete_training(self, page: Page):
        """
        1. Delete the training[1]
        2. Verify the training is not present in the list
        """
        training = self.trainings[1]
        expect(self.training_page.training_link(training.name)).to_be_visible()

        # Delete the second training
        self.training_page.row_actions_button(training.name).click()
        self.training_page.row_action_delete_button.click()

        # Verify the training is not present in the list
        expect(self.training_page.training_link(training.name)).not_to_be_visible()

    def test_add_quick_battle(self, page: Page):
        """
        1. click on the new battle button
        2. verify the list shows a new battle with title "Battel on mm/dd/yyyy" replace the date placeholder with the current date
        """
        # Click on the new battle button
        self.training_page.new_battle_button.click()

        # Get current date for verification
        current_date = datetime.now().strftime("%-m/%-d/%Y")
        expected_title = f"Battle on {current_date}"

        # Verify the list shows a new battle with the expected title
        expect(page.get_by_text(expected_title)).to_be_visible()

        self.training_page.row_actions_button(expected_title).click()
        self.training_page.row_action_delete_button.click()

        expect(page.get_by_text(expected_title)).not_to_be_visible()


class TestDetailedTraining(TestBaseTraining):
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_data):
        user, trainings, teams = test_data
        self.user = user
        self.trainings = trainings
        self.teams = teams
        self.detailed_training_page = DetailedTrainingPage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.detailed_training_page.navigate(self.trainings[2].id or "")

    def test_import_battle(self, page: Page):
        """
        1. click on "import battle"
        2. fill the username value with "danimontes"
        3. click on the file picker
        4. select the file at data/test_battle_file.html
        5. click on import
        6. verify that a battle with name "test_battle_file" is present in the table
        7. delete the created battle
        """
        # Click on import battle button
        self.detailed_training_page.import_battle_button.click()

        # Fill username
        self.detailed_training_page.import_modal["username"].fill("danimontes")

        # Upload file
        with page.expect_file_chooser() as fc_info:
            self.detailed_training_page.import_modal["file-picker"].click()
        file_chooser = fc_info.value
        file_chooser.set_files("data/test_battle_file.html")

        # Click import
        self.detailed_training_page.import_modal["import"].click()

        # Verify battle appears in table
        expect(
            self.detailed_training_page.battle_link("test_battle_file")
        ).to_be_visible()

        # Clean up - delete the created battle
        self.detailed_training_page.row_actions_button("test_battle_file").click()
        self.detailed_training_page.delete_action_button.click()

        # Verify it's deleted
        expect(
            self.detailed_training_page.battle_link("test_battle_file")
        ).not_to_be_visible()

    def test_add_battle(self, page: Page):
        """
        1. click on new battle
        2. verify a battle with name "Battle on dd/mm/yyyy" is present in the table,
           replace the date with the current date without leading zeros.
        3. delete the created battle
        """
        training_id = self.trainings[2].id

        # Click on new battle
        self.detailed_training_page.add_battle_button.click()

        # Get current date for verification
        current_date = datetime.now().strftime("%-m/%-d/%Y")
        expected_title = f"Battle on {current_date}"

        # Verify battle appears in table
        expect(self.detailed_training_page.battle_link(expected_title)).to_be_visible()

        # Clean up - delete the created battle
        self.detailed_training_page.row_actions_button(expected_title).click()
        self.detailed_training_page.delete_action_button.click()

        # Verify it's deleted
        expect(
            self.detailed_training_page.battle_link(expected_title)
        ).not_to_be_visible()

    def test_edit_training(self, page: Page):
        """
        1. click on edit button
        2. fill the modal with the following data:
            - Description: this is an updated description
        3. click on update
        4. click on "Training" tab
        5. verify the updated description text is visible
        """
        # Click on edit button
        self.detailed_training_page.edit_button.click()

        # Fill the description
        self.detailed_training_page.training_modal["description"].fill(
            "this is an updated description"
        )

        # Click update
        self.detailed_training_page.training_modal["update"].click()

        # Click on Training tab
        self.detailed_training_page.training_tab.click()

        # Verify the updated description is visible
        expect(page.get_by_text("this is an updated description")).to_be_visible()

    def test_edit_battle(self, page: Page):
        """
        1. use test_battle as trainings[2].battles[0]
        2. click on the row actions button for test_battle's row
        3. select "Edit" option
        4. verify url is now /home/training/[trainingId]/[battleId]?edit=true
        """
        training = self.trainings[2]
        test_battle = training.battles[0]
        training_id = training.id

        # Click on row actions button for the battle
        self.detailed_training_page.row_actions_button(test_battle.name).click()

        # Select Edit option
        self.detailed_training_page.edit_action_button.click()

        # Verify URL contains edit=true
        expect(page).to_have_url(
            re.compile(rf"/home/training/{training_id}/{test_battle.id}\?edit=true")
        )

    def test_quick_edit_battle(self, page: Page):
        """
        1. use test_battle as trainings[2].battles[0]
        2. click on the row actions button for test_battle's row
        3. select "Quick edit" option
        4. verify url is now /home/training/[trainingId]/[battleId]?edit=true&quick=true
        """
        training = self.trainings[2]
        test_battle = training.battles[0]
        training_id = training.id

        # Click on row actions button for the battle
        self.detailed_training_page.row_actions_button(test_battle.name).click()

        # Select Quick edit option
        self.detailed_training_page.quick_edit_action_button.click()

        # Verify URL contains edit=true&quick=true
        expect(page).to_have_url(
            re.compile(rf"/home/training/{training_id}/{test_battle.id}\?edit=true&quick=true")
        )

    def test_delete_battle(self, page: Page):
        """
        1. use test_battle as trainings[2].battles[1]
        2. click on the row actions button for test_battle's row
        3. select "Delete" option
        4. verify test_battle's row is not present in the table
        """
        training = self.trainings[2]
        test_battle = training.battles[1]

        # Verify battle is initially visible
        expect(
            self.detailed_training_page.battle_link(test_battle.name)
        ).to_be_visible()

        # Click on row actions button for the battle
        self.detailed_training_page.row_actions_button(test_battle.name).click()

        # Select Delete option
        self.detailed_training_page.delete_action_button.click()

        # Verify battle row is not present in the table
        expect(
            self.detailed_training_page.battle_link(test_battle.name)
        ).not_to_be_visible()

    def test_analyze(self, page: Page):
        """
        1. click on "Analyze" button
        2. verify url is now "/home/training/[trainingId]/analyze"
        """
        training_id = self.trainings[2].id

        # Click on Analyze button
        self.detailed_training_page.analyze_button.click()

        # Verify URL is now analyze page
        expect(page).to_have_url(re.compile(rf"/home/training/{training_id}/analyze"))

    def test_go_to_battle(self, page: Page):
        """
        1. use test_battle as trainings[2].battles[2]
        2. click on row battle link with name test_battle.name
        3. verify ur is "/home/training/[trainingId]/[battleId]"
        """
        training = self.trainings[2]
        test_battle = training.battles[2]
        training_id = training.id

        # Click on battle link
        self.detailed_training_page.battle_link(test_battle.name).click()

        # Verify URL is battle page
        expect(page).to_have_url(
            re.compile(rf"/home/training/{training_id}/{test_battle.id}")
        )

class TestAnalyzeTraining(TestBaseTraining):
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_data):
        user, trainings, teams = test_data
        self.user = user
        self.trainings = trainings
        self.teams = teams
        self.analyze_training_page = AnalyzeTrainingPage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.analyze_training_page.navigate(self.trainings[3].id or "")

    def test_matchups(self, page: Page):
        """
        1. click on matchups tab
        2. click on all matches tab
        3. verify column headers with these names are visible:
            - Pairings
            - Pokemon
            - Usage
            - Results
        4. expand row with name "solgaleo"
        5. verify column headers with these names are shown twice:
            - Pairings
            - Pokemon
            - Usage
            - Results
        """
        # Click on matchups tab
        self.analyze_training_page.matchups_tab.click()

        # Click on all matches tab (it's the same as matchups tab based on the selectors)
        self.analyze_training_page.all_matches_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Pairings")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Pokemon")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Usage")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Results")).to_be_visible()

        # Expand row with name "solgaleo"
        self.analyze_training_page.expand_row("solgaleo").click()

        # Verify column headers are shown twice (after expansion)
        expect(page.get_by_role("columnheader", name="Pairings").nth(1)).to_be_visible()
        expect(page.get_by_role("columnheader", name="Pokemon").nth(1)).to_be_visible()
        expect(page.get_by_role("columnheader", name="Usage").nth(1)).to_be_visible()
        expect(page.get_by_role("columnheader", name="Results").nth(1)).to_be_visible()

    def test_openings(self, page: Page):
        """
        1. click on matchups tab
        2. click on openings tab
        3. verify column headers with these names are visible:
            - Pairings
            - Pokemon
            - Usage
            - Results
        """
        # Click on matchups tab
        self.analyze_training_page.matchups_tab.click()

        # Click on openings tab
        self.analyze_training_page.openings_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Pairings")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Pokemon")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Usage")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Results")).to_be_visible()

    def test_usage(self, page: Page):
        """
        1. click on pokemon tab
        2. click on usage tab
        3. verify column headers with these names are visible:
            - Pokemon
            - Usage
        """
        # Click on pokemon tab
        self.analyze_training_page.pokemon_tab.click()

        # Click on usage tab
        self.analyze_training_page.usage_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Pokemon")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Usage")).to_be_visible()

    def test_moves(self, page: Page):
        """
        1. click on pokemon tab
        2. click on moves tab
        3. verify column headers with these names are visible:
            - Pokemon
            - Moves
        4. expand row with name "solgaleo"
        5. verify column headers with these names are visible:
            - Move
            - Average Usage
            - Expected Usage By Match
        """
        # Click on pokemon tab
        self.analyze_training_page.pokemon_tab.click()

        # Click on moves tab
        self.analyze_training_page.moves_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Pokemon")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Moves")).to_be_visible()

        # Expand row with name "solgaleo"
        self.analyze_training_page.expand_row("solgaleo").click()

        # Verify expanded column headers
        expect(
            page.get_by_role("columnheader", name="Move", exact=True)
        ).to_be_visible()
        expect(
            page.get_by_role("columnheader", name="Average Usage", exact=True)
        ).to_be_visible()
        expect(
            page.get_by_role("columnheader", name="Expected Usage By Match", exact=True)
        ).to_be_visible()

    def test_kos(self, page: Page):
        """
        1. click on pokemon tab
        2. click on kos tab
        3. verify column headers with these names are visible:
            - KOs
            - Pokemon
            - Total KOs
        4. expand row with name "solgaleo"
        5. verify column headers with these names are visible:
            - Pokemon
            - Count
        """
        # Click on pokemon tab
        self.analyze_training_page.pokemon_tab.click()

        # Click on kos tab
        self.analyze_training_page.kos_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="KOs", exact=True)).to_be_visible()
        expect(page.get_by_role("columnheader", name="Pokemon")).to_be_visible()
        expect(
            page.get_by_role("columnheader", name="Total KOs", exact=True)
        ).to_be_visible()

        # Expand row with name "solgaleo"
        self.analyze_training_page.expand_row("solgaleo").click()

        # Verify expanded column headers
        expect(page.get_by_role("columnheader", name="Pokemon").nth(1)).to_be_visible()
        expect(page.get_by_role("columnheader", name="Count")).to_be_visible()

    def test_faints(self, page: Page):
        """
        1. click on pokemon tab
        2. click on faints tab
        3. verify column headers with these names are visible:
            - Faints
            - Pokemon
            - Total Faints
        4. expand row with name "miraidon"
        5. verify column headers with these names are visible:
            - Pokemon
            - Count
        """
        # Click on pokemon tab
        self.analyze_training_page.pokemon_tab.click()

        # Click on faints tab
        self.analyze_training_page.faints_tab.click()

        # Verify column headers are visible
        expect(
            page.get_by_role("columnheader", name="Faints", exact=True)
        ).to_be_visible()
        expect(page.get_by_role("columnheader", name="Pokemon")).to_be_visible()
        expect(
            page.get_by_role("columnheader", name="Total Faints", exact=True)
        ).to_be_visible()

        # Expand row with name "miraidon"
        self.analyze_training_page.expand_row("miraidon").click()

        # Verify expanded column headers
        expect(page.get_by_role("columnheader", name="Pokemon").nth(1)).to_be_visible()
        expect(page.get_by_role("columnheader", name="Count")).to_be_visible()

    def test_key_action_kos(self, page: Page):
        """
        1. click on key actions tab
        2. click on kos tab
        3. verify column headers with these names are visible:
            - Turn
            - Count
        """
        # Click on key actions tab
        self.analyze_training_page.key_actions_tab.click()

        # Click on kos tab
        self.analyze_training_page.kos_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Turn")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Count")).to_be_visible()

    def test_key_action_faint(self, page: Page):
        """
        1. click on key actions tab
        2. click on faints tab
        3. verify column headers with these names are visible:
            - Turn
            - Count
        """
        # Click on key actions tab
        self.analyze_training_page.key_actions_tab.click()

        # Click on faints tab
        self.analyze_training_page.faints_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Turn")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Count")).to_be_visible()

    def test_key_action_switch(self, page: Page):
        """
        1. click on key actions tab
        2. click on switches tab
        3. verify column headers with these names are visible:
            - Turn
            - Count
        """
        # Click on key actions tab
        self.analyze_training_page.key_actions_tab.click()

        # Click on switches tab
        self.analyze_training_page.switches_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Turn")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Count")).to_be_visible()

    def test_key_action_my_pokemon(self, page: Page):
        """
        1. click on key actions tab
        2. click on my pokemon key actions tab
        3. verify column headers with these names are visible:
            - Name
            - Pokemon Usage
            - Action Usage
        """
        # Click on key actions tab
        self.analyze_training_page.key_actions_tab.click()

        # Click on my pokemon key actions tab
        self.analyze_training_page.my_poke_key_actions_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Name")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Pokemon Usage")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Action Usage")).to_be_visible()

    def test_key_action_rival(self, page: Page):
        """
        1. click on key actions tab
        2. click on rival pokemon key actions tab
        3. verify column headers with these names are visible:
            - Name
            - Pokemon Usage
            - Action Usage
        """
        # Click on key actions tab
        self.analyze_training_page.key_actions_tab.click()

        # Click on rival pokemon key actions tab
        self.analyze_training_page.rival_poke_key_actions_tab.click()

        # Verify column headers are visible
        expect(page.get_by_role("columnheader", name="Name")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Pokemon Usage")).to_be_visible()
        expect(page.get_by_role("columnheader", name="Action Usage")).to_be_visible()


class TestBattle(TestBaseTraining):
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_data):
        user, trainings, teams = test_data
        self.user = user
        self.trainings = trainings
        self.teams = teams
        self.battle_page = BattlePage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.battle_page.navigate(
            self.trainings[4].id or "", self.trainings[4].battles[0].id or ""
        )

    def test_edit(self, page: Page):
        self.battle_page.edit_button.click()

        self.battle_page.battle_form["name"].fill("Updated test edit battle")
        self.battle_page.battle_form["result"].click()
        self.battle_page.select_option("win").click()
        self.battle_page.battle_form["season"].click()
        self.battle_page.select_option("2026").click()
        self.battle_page.battle_form["format"].click()
        self.battle_page.battle_form["format"].fill("reg f")
        self.battle_page.battle_form["teams"].click()
        self.battle_page.select_option("team 1").click()
        self.battle_page.battle_form["notes"].click()
        self.battle_page.battle_form["notes"].fill("updated notes")

        # Add first turn and action
        self.battle_page.add_tab_button.click()
        self.battle_page.get_action_combobox("player").click()
        self.battle_page.select_option("p1").click()
        self.battle_page.get_turn_action_type().click()
        self.battle_page.select_option("switch").click()
        self.battle_page.get_action_combobox("name").click()
        self.battle_page.get_action_combobox("targets").click()
        self.battle_page.get_action_combobox("targets").fill("solgaleo")
        self.battle_page.get_action_combobox("targets").press("Enter")

        # Add second action to first turn
        self.battle_page.add_action_button.click()
        self.battle_page.get_action_player_field(0, 1).click()
        self.battle_page.select_option("p2", 1).click()
        self.battle_page.get_turn_action_type("Turn").click()
        self.battle_page.select_option("switch", 2).click()
        self.battle_page.get_action_targets_field(0, 1).click()
        self.battle_page.get_action_targets_field(0, 1).fill("lunala")

        # Add third action to first turn
        self.battle_page.add_action_button.click()

        # Add second turn
        self.battle_page.add_tab_button.click()
        self.battle_page.get_action_combobox("user").click()
        self.battle_page.get_action_combobox("user").fill("p1:solgaleo")
        self.battle_page.get_action_combobox("name").click()
        self.battle_page.get_action_combobox("name").fill("flash-canon")
        self.battle_page.get_action_combobox("targets").click()
        self.battle_page.get_action_combobox("targets").fill("p2:lunala")
        self.battle_page.get_action_combobox("targets").press("Enter")

        # Save changes
        self.battle_page.battle_form["save"].click()

        # Verify changes
        expect(page.locator("h2")).to_contain_text("Updated test edit battle")
        expect(page.get_by_role("main")).to_contain_text("win")
        expect(page.get_by_role("main")).to_contain_text("2026 - reg f")
        expect(page.get_by_role("main")).to_contain_text("updated notes")
        expect(page.get_by_role("main")).to_contain_text("Turn 1")
        expect(page.get_by_role("main")).to_contain_text("solgaleo")
        expect(page.get_by_role("main")).to_contain_text("lunala")
        expect(page.get_by_role("main")).to_contain_text("p1:solgaleo")
        expect(page.get_by_role("main")).to_contain_text("p2:lunala")
        expect(page.get_by_role("main")).to_contain_text("flash-canon")
        expect(page.get_by_role("main")).to_contain_text("Switch")
        expect(page.get_by_role("main")).to_contain_text("Turn 2")


class TestBulkAnalytics(TestBaseTraining):
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_data):
        user, trainings, teams = test_data
        self.user = user
        self.trainings = trainings
        self.teams = teams
        self.training_page = TrainingsPage(page)
        self.trainings_page = TrainingsPage(page)
        self.bulk_analytics_page = BulkAnalyticsPage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.training_page.navigate()

    def test_bulk_analyze_multiple_trainings(self, page: Page):
        """Test bulk analysis with multiple trainings"""

        # Verify we're on the right page and can see trainings
        expect(page).to_have_url(re.compile("/home/training"))

        # Get trainings with battles (using actual training names from test data 7-9)
        training_names = ["Test training 7", "Test training 8", "Test training 9"]

        # Select training checkboxes using page selectors
        for training_name in training_names:
            training_checkbox = self.trainings_page.training_row_checkbox(training_name)
            training_checkbox.check()

        # Verify analyze button appears with correct text
        analyze_button = self.trainings_page.bulk_analyze_button(len(training_names))
        expect(analyze_button).to_be_visible()
        expect(analyze_button).to_be_enabled()

        # Click analyze button
        analyze_button.click()

        # Verify navigation to bulk analytics page
        expect(page).to_have_url(re.compile(r"/home/training/analytics\?ids=.*"))

        # Wait for page to load
        expect(page.get_by_role("tab", name="Matchups")).to_be_visible()

    def test_bulk_analytics_page_displays_correct_tabs(self, page: Page):
        """Test that bulk analytics page displays all tabs correctly"""

        # Get first two trainings with battles
        training_ids = [self.trainings[6].id, self.trainings[7].id]
        ids_param = ",".join(training_ids)

        # Navigate directly to bulk analytics
        self.bulk_analytics_page.navigate(ids_param)

        # Verify all tabs are present
        expect(self.bulk_analytics_page.matchups_tab).to_be_visible()
        expect(self.bulk_analytics_page.pokemon_tab).to_be_visible()
        expect(self.bulk_analytics_page.key_actions_tab).to_be_visible()

    def test_bulk_analytics_matchups_tab(self, page: Page):
        """Test matchups tab functionality in bulk analytics"""

        # Get first two trainings
        training_ids = [self.trainings[6].id, self.trainings[7].id]
        ids_param = ",".join(training_ids)

        # Navigate to bulk analytics
        self.bulk_analytics_page.navigate(ids_param)

        # Click matchups tab
        self.bulk_analytics_page.matchups_tab.click()

        # Verify matchups content is loaded (similar to single training analytics)
        # Wait for content to load
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("main")).to_contain_text(
            "All Matches"
        )  # Case-sensitive fix

    def test_bulk_analytics_pokemon_tab(self, page: Page):
        """Test pokemon tab functionality in bulk analytics"""

        # Get first two trainings
        training_ids = [self.trainings[6].id, self.trainings[7].id]
        ids_param = ",".join(training_ids)

        # Navigate to bulk analytics
        self.bulk_analytics_page.navigate(ids_param)

        # Click pokemon tab
        self.bulk_analytics_page.pokemon_tab.click()

        # Verify pokemon analytics content - check for Usage tab within pokemon section
        expect(page.get_by_role("main")).to_contain_text("Usage")
        expect(page.get_by_role("main")).to_contain_text("Pokemon")

    def test_bulk_analytics_key_actions_tab(self, page: Page):
        """Test key actions tab functionality in bulk analytics"""

        # Get first two trainings
        training_ids = [self.trainings[6].id, self.trainings[7].id]
        ids_param = ",".join(training_ids)

        # Navigate to bulk analytics
        self.bulk_analytics_page.navigate(ids_param)

        # Click key actions tab
        self.bulk_analytics_page.key_actions_tab.click()

        # Verify key actions content
        expect(self.bulk_analytics_page.kos_tab).to_be_visible()
        expect(self.bulk_analytics_page.faints_tab).to_be_visible()
        expect(self.bulk_analytics_page.switches_tab).to_be_visible()

    def test_analyze_button_only_appears_when_selections_made(self, page: Page):
        """Test that analyze button only appears when trainings are selected"""

        # Initially, analyze button should not be visible
        analyze_button = self.trainings_page.bulk_analyze_button_any()
        expect(analyze_button).not_to_be_visible()

        # Select a training (using actual training name from test data)
        training_checkbox = self.trainings_page.training_row_checkbox("Test training 9")
        training_checkbox.check()

        # Now analyze button should appear
        analyze_button = self.trainings_page.bulk_analyze_button(1)
        expect(analyze_button).to_be_visible()

        # Uncheck training
        training_checkbox.uncheck()

        # Analyze button should disappear
        expect(analyze_button).not_to_be_visible()

    def test_bulk_analytics_error_handling(self, page: Page):
        """Test error handling for invalid training IDs"""

        # Navigate directly with invalid ID
        self.bulk_analytics_page.navigate("invalid-id-123")

        # Should handle gracefully - either redirect or show error
        # Wait for page to load and verify it doesn't crash
        page.wait_for_load_state("networkidle")

        # Page should either show error message or redirect appropriately
        # This test ensures the page doesn't completely break
