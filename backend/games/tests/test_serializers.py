import pytest
from games.serializers import MemberSerializer
from games.tests.conftest import GameTypeFactory, MemberFactory, ClubFactory
from accounts.tests.conftest import UserFactory


class TestMemberSerializerGetElo:
    def test_nonexistent_game_type_returns_none(self, db):
        user = UserFactory()
        club = ClubFactory(president=user)
        member = MemberFactory(user=user, club=club)
        serializer = MemberSerializer(member, context={"game_type": "nonexistent_type"})
        assert serializer.data["elo"] is None

    def test_no_game_type_in_context_returns_none(self, db):
        user = UserFactory()
        club = ClubFactory(president=user)
        member = MemberFactory(user=user, club=club)
        serializer = MemberSerializer(member, context={})
        assert serializer.data["elo"] is None
