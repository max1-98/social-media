import pytest
from clubs.models import ClubModel, Member
from clubs.services import (
    create_club, accept_member_request, remove_member,
    promote_member, demote_member,
)
from factories import (
    ClubFactory, MemberFactory, MemberRequestFactory,
)
from accounts.tests.conftest import UserFactory


@pytest.mark.django_db
class TestCreateClub:

    def test_creates_club_and_admin_member(self):
        user = UserFactory()
        club = create_club(user, "testclub", "Test Club", "A test club")

        assert club.club_username == "testclub"
        assert club.name == "Test Club"
        assert club.president == user
        assert club.members.count() == 1

        member = club.members.first()
        assert member.user == user
        assert member.is_admin is True
        assert member in user.memberships.all()

    def test_raises_on_empty_username(self):
        user = UserFactory()
        with pytest.raises(ValueError, match="club username"):
            create_club(user, "", "Name", "Info")

    def test_raises_on_long_username(self):
        user = UserFactory()
        with pytest.raises(ValueError, match="less than 12"):
            create_club(user, "a" * 13, "Name", "Info")

    def test_raises_on_empty_name(self):
        user = UserFactory()
        with pytest.raises(ValueError, match="club name"):
            create_club(user, "club1", "", "Info")

    def test_raises_on_long_name(self):
        user = UserFactory()
        with pytest.raises(ValueError, match="less than 50"):
            create_club(user, "club1", "x" * 51, "Info")

    def test_raises_on_empty_info(self):
        user = UserFactory()
        with pytest.raises(ValueError, match="club description"):
            create_club(user, "club1", "Name", "")

    def test_raises_on_long_info(self):
        user = UserFactory()
        with pytest.raises(ValueError, match="less than 160"):
            create_club(user, "club1", "Name", "x" * 161)

    def test_raises_on_duplicate_club_username(self):
        user1 = UserFactory()
        create_club(user1, "dupeclub", "Club One", "Info one")

        user2 = UserFactory()
        with pytest.raises(ValueError, match="already exists"):
            create_club(user2, "dupeclub", "Club Two", "Info two")

    def test_raises_on_username_matching_existing_user(self):
        user = UserFactory(username="takenname")
        with pytest.raises(ValueError, match="already exists"):
            create_club(user, "takenname", "Club", "Info")


@pytest.mark.django_db
class TestAcceptMemberRequest:

    def test_creates_new_member(self):
        request = MemberRequestFactory()
        member = accept_member_request(request)

        assert member.user == request.user
        assert member.club == request.club
        assert member in request.club.members.all()
        assert member in request.user.memberships.all()
        assert not request.club.memberrequest_set.exists()

    def test_reactivates_past_member(self):
        user = UserFactory()
        club = ClubFactory()
        # Create a past membership (is_member=False but still in user.memberships)
        old_member = MemberFactory(user=user, club=club, is_admin=False)
        old_member.is_member = False
        old_member.save()
        user.memberships.add(old_member)

        request = MemberRequestFactory(user=user, club=club)
        result = accept_member_request(request)

        assert result.id == old_member.id
        old_member.refresh_from_db()
        assert old_member.is_member is True
        assert not club.memberrequest_set.exists()


@pytest.mark.django_db
class TestRemoveMember:

    def test_removes_regular_member(self):
        club = ClubFactory()
        user = UserFactory()
        member = MemberFactory(user=user, club=club)
        club.members.add(member)

        remove_member(member, club.president)

        member.refresh_from_db()
        assert member.is_member is False
        assert member not in club.members.all()

    def test_raises_on_president_removal(self):
        user = UserFactory()
        club = ClubFactory(president=user)
        member = MemberFactory(user=user, club=club)

        with pytest.raises(PermissionError, match="president"):
            remove_member(member, user)

    def test_raises_on_admin_removal_by_non_president(self):
        president = UserFactory()
        club = ClubFactory(president=president)
        admin_user = UserFactory()
        admin_member = MemberFactory(user=admin_user, club=club, is_admin=True)
        non_president = UserFactory()

        with pytest.raises(PermissionError, match="president"):
            remove_member(admin_member, non_president)

    def test_admin_removed_by_president(self):
        president = UserFactory()
        club = ClubFactory(president=president)
        admin_user = UserFactory()
        admin_member = MemberFactory(user=admin_user, club=club, is_admin=True)
        club.members.add(admin_member)

        remove_member(admin_member, president)

        admin_member.refresh_from_db()
        assert admin_member.is_member is False
        assert admin_member.is_admin is False


@pytest.mark.django_db
class TestPromoteDemoteMember:

    def test_promote_member(self):
        member = MemberFactory(is_admin=False)
        promote_member(member)
        member.refresh_from_db()
        assert member.is_admin is True

    def test_promote_already_admin_raises(self):
        member = MemberFactory(is_admin=True)
        with pytest.raises(ValueError, match="already"):
            promote_member(member)

    def test_demote_member(self):
        member = MemberFactory(is_admin=True)
        demote_member(member)
        member.refresh_from_db()
        assert member.is_admin is False

    def test_demote_non_admin_raises(self):
        member = MemberFactory(is_admin=False)
        with pytest.raises(ValueError, match="not a club admin"):
            demote_member(member)
