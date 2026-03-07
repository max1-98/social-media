from accounts.models import CustomUser
from clubs.models import ClubModel, Member, DummyUser


def create_club(user, club_username, name, info):
    """Create a club and make the user its president and admin member."""
    if not club_username:
        raise ValueError("Please provide a club username.")
    if len(club_username) > 12:
        raise ValueError("Username must be less than 12 characters.")
    if not name:
        raise ValueError("Please provide a club name.")
    if len(name) > 50:
        raise ValueError("Club name must be less than 50 characters.")
    if not info:
        raise ValueError("Please provide a club description.")
    if len(info) > 160:
        raise ValueError("Club description must be less than 160 characters.")

    if CustomUser.objects.filter(username=club_username).exists() or \
       ClubModel.objects.filter(club_username=club_username).exists():
        raise ValueError("Club username already exists.")

    club = ClubModel.objects.create(
        club_username=club_username,
        name=name,
        president=user,
        info=info,
    )
    member = Member.objects.create(club=club, user=user, is_admin=True)
    user.memberships.add(member)
    club.members.add(member)
    return club


def accept_member_request(member_request):
    """Accept a member request: reactivate past member or create new one."""
    club = member_request.club
    user = member_request.user

    # Check if user was a past member (reactivate)
    for membership in user.memberships.all():
        if membership.club_id == club.id:
            membership.is_member = True
            membership.save()
            member_request.delete()
            club.members.add(membership)
            return membership

    # Create new member
    member = Member.objects.create(club=club, user=user)
    club.members.add(member)
    user.memberships.add(member)
    member_request.delete()
    return member


def remove_member(member, requesting_user):
    """Remove a member from their club. Raises PermissionError or ValueError."""
    if member.club.president == member.user:
        raise PermissionError("A president cannot be revoked of their membership.")

    if member.is_admin:
        if member.club.president != requesting_user:
            raise PermissionError("Only the club president can delete an admin.")
        member.is_admin = False

    # Handle dummy user cleanup
    if not member.user.is_active and member.user.username.startswith("dummyuser_"):
        dummy_id = int(member.user.username[10:])
        DummyUser.objects.get(pk=dummy_id).delete()
        member.user.delete()
        return

    member.club.members.remove(member)
    member.is_member = False
    member.save()


def promote_member(member):
    """Promote a member to admin."""
    if member.is_admin:
        raise ValueError("This user is already a club admin.")
    member.is_admin = True
    member.save()


def demote_member(member):
    """Demote a member from admin."""
    if not member.is_admin:
        raise ValueError("This user is not a club admin.")
    member.is_admin = False
    member.save()
