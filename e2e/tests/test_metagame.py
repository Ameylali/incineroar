import re
from datetime import datetime

import pytest
from playwright.sync_api import Page, expect

from src.models.tournament import Tournament
from src.models.user import User
from src.pages.login import LoginPage
from src.pages.metagame import MetagamePage
from tests.conftest import GetUser, MakeTournament

TOURNAMENT_RAW_DATA = """
[
  {
    "name": "user 1",
    "decklist": [
      {
        "id": "10233",
        "name": "Typhlosion [Hisuian Form]",
        "teratype": "Fire",
        "ability": "Blaze",
        "item": "Choice Specs",
        "badges": [
          "Eruption",
          "Shadow Ball",
          "Heat Wave",
          "Overheat"
        ]
      },
      {
        "id": "547",
        "name": "Whimsicott",
        "teratype": "Ghost",
        "ability": "Prankster",
        "item": "Babiri Berry",
        "badges": [
          "Moonblast",
          "Sunny Day",
          "Encore",
          "Tailwind"
        ]
      },
      {
        "id": "727",
        "name": "Incineroar",
        "teratype": "Water",
        "ability": "Intimidate",
        "item": "Safety Goggles",
        "badges": [
          "Flare Blitz",
          "Knock Off",
          "Parting Shot",
          "Fake Out"
        ]
      },
      {
        "id": "10272",
        "name": "Ursaluna [Bloodmoon]",
        "teratype": "Normal",
        "ability": "Mind’s Eye",
        "item": "Life Orb",
        "badges": [
          "Earth Power",
          "Blood Moon",
          "Hyper Voice",
          "Protect"
        ]
      },
      {
        "id": "981",
        "name": "Farigiraf",
        "teratype": "Water",
        "ability": "Armor Tail",
        "item": "Sitrus Berry",
        "badges": [
          "Psychic",
          "Night Shade",
          "Helping Hand",
          "Trick Room"
        ]
      },
      {
        "id": "973",
        "name": "Flamigo",
        "teratype": "Fighting",
        "ability": "Scrappy",
        "item": "Focus Sash",
        "badges": [
          "Close Combat",
          "Feint",
          "Wide Guard",
          "Detect"
        ]
      }
    ]
  },
  {
    "name": "user2",
    "decklist": [
      {
        "id": "10272",
        "name": "Ursaluna [Bloodmoon]",
        "teratype": "Water",
        "ability": "Mind’s Eye",
        "item": "Leftovers",
        "badges": [
          "Blood Moon",
          "Earth Power",
          "Yawn",
          "Protect"
        ]
      },
      {
        "id": "727",
        "name": "Incineroar",
        "teratype": "Grass",
        "ability": "Intimidate",
        "item": "Sitrus Berry",
        "badges": [
          "Fake Out",
          "Parting Shot",
          "Knock Off",
          "Flare Blitz"
        ]
      },
      {
        "id": "903",
        "name": "Sneasler",
        "teratype": "Flying",
        "ability": "Unburden",
        "item": "Grassy Seed",
        "badges": [
          "Swords Dance",
          "Acrobatics",
          "Protect",
          "Close Combat"
        ]
      },
      {
        "id": "812",
        "name": "Rillaboom",
        "teratype": "Fire",
        "ability": "Grassy Surge",
        "item": "Assault Vest",
        "badges": [
          "Fake Out",
          "Wood Hammer",
          "Grassy Glide",
          "High Horsepower"
        ]
      },
      {
        "id": "149",
        "name": "Dragonite",
        "teratype": "Steel",
        "ability": "Multiscale",
        "item": "Loaded Dice",
        "badges": [
          "Scale Shot",
          "Tailwind",
          "Haze",
          "Protect"
        ]
      },
      {
        "id": "1000",
        "name": "Gholdengo",
        "teratype": "Water",
        "ability": "Good as Gold",
        "item": "Life Orb",
        "badges": [
          "Make It Rain",
          "Nasty Plot",
          "Shadow Ball",
          "Protect"
        ]
      }
    ]
  }
]
"""

TOURNAMENT_URL = (
    "https://www.pokedata.ovh/standingsVGC/0000162/masters/0000162_Masters.json"
)


class TestMetagame:
    username = "mewtwo"
    user: User
    tournaments: list[Tournament]

    @pytest.fixture(autouse=True, scope="class")
    def setup_data(self, get_user: GetUser, make_tournament: MakeTournament):
        admin_user = get_user("mew")
        self.__class__.user = get_user(self.username)
        self.__class__.tournaments = [
            make_tournament(
                admin_user,
                Tournament(
                    "test tournament",
                    2025,
                    "reg h",
                    TOURNAMENT_RAW_DATA,
                    source="pokedata",
                ),
            )
        ]

    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        self.metagame_page = MetagamePage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.metagame_page.navigate()

    def test_go_to_tournament(self, page: Page):
        self.metagame_page.tournament_link("test tournament").click()

        expect(page).to_have_url(re.compile(f"/home/metagame/{self.tournaments[0].id}"))
        expect(page.locator("h2")).to_contain_text("test tournament")
        expect(page.get_by_role("main")).to_contain_text("2025 - reg h")
        expect(page.locator("tbody")).to_contain_text("user 1")

    def test_tournament_analytics(self, page: Page):
        self.metagame_page.tournament_link("test tournament").click()
        expect(page).to_have_url(re.compile(f"/home/metagame/{self.tournaments[0].id}"))

        self.metagame_page.analytics_tab.click()

        expect(page.get_by_label("Analytics").get_by_role("tablist")).to_contain_text(
            "Pokemon"
        )
        for i in range(2, 6):
            expect(
                page.get_by_label("Analytics").get_by_role("tablist")
            ).to_contain_text(f"Cores of {i}")


class TestAdminMetagame(TestMetagame):
    username = "mew"

    @pytest.fixture(autouse=True)
    def redirect_admin(self, setup):
        self.metagame_page.navigate_admin()

    def test_add_tournament_raw_data(self, page: Page):
        self.metagame_page.add_tournament_button.click()
        self.metagame_page.add_tournament_modal["name"].fill("test add raw")
        self.metagame_page.add_tournament_modal["format"].fill("reg h")
        self.metagame_page.add_tournament_modal["data"].fill(TOURNAMENT_RAW_DATA)
        self.metagame_page.add_tournament_modal["submit_button"].click()

        expect(page.locator("tbody")).to_contain_text("test add raw")

        self.metagame_page.tournament_link("test add raw").click()

        expect(page.locator("h2")).to_contain_text("test add raw")
        expect(page.get_by_role("main")).to_contain_text(
            f"{datetime.now().year} - reg h"
        )
        expect(page.locator("tbody")).to_contain_text("user 1")

        self.metagame_page.navigate_admin()
        self.metagame_page.delete_button("test add raw").click()

    def test_add_tournament_link(self, page: Page):
        self.metagame_page.add_tournament_button.click()
        self.metagame_page.add_tournament_modal["name"].fill("test add url")
        self.metagame_page.add_tournament_modal["format"].fill("reg h")
        self.metagame_page.add_tournament_modal["source"].click()
        self.metagame_page.modal_source_option("Pokedata URL").click()
        self.metagame_page.add_tournament_modal["data"].fill(TOURNAMENT_URL)
        self.metagame_page.add_tournament_modal["submit_button"].click()

        expect(page.locator("tbody")).to_contain_text("test add url", timeout=15000)

        self.metagame_page.tournament_link("test add url").click()

        expect(page.locator("h2")).to_contain_text("test add url")
        expect(page.get_by_role("main")).to_contain_text(
            f"{datetime.now().year} - reg h"
        )

        self.metagame_page.navigate_admin()
        self.metagame_page.delete_button("test add url").click()

    def test_delete_tournament(self, page: Page):
        expect(page.locator("tbody")).to_contain_text(self.tournaments[0].name)

        self.metagame_page.delete_button(self.tournaments[0].name).click()

        expect(page.locator("tbody")).not_to_contain_text(self.tournaments[0].name)
