from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from events.models import Event
from clubs.models import Member
from clubs.serializers import MemberAttendanceSerializer
from clubs.permissions import IsClubAdmin


class MemberAttendanceListView(APIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberAttendanceSerializer

    def post(self, request, *args, **kwargs):
        start_date = request.data.get('start_date')
        finish_date = request.data.get('finish_date')
        club_id = request.data.get('club_id')

        if not all([start_date, finish_date, club_id]):
            return Response({'error': 'Missing required parameters'}, status=400)

        events = Event.objects.filter(
            date__range=[start_date, finish_date],
            club_id=club_id
        )

        member_attendance = {}
        for event in events:
            for member in event.played_one_match.all():
                if member not in member_attendance:
                    member_attendance[member] = 0
                member_attendance[member] += 1

        member_ids = [member.id for member in member_attendance.keys()]

        members = Member.objects.filter(pk__in=member_ids).order_by('user__surname')

        for member in members:
            member.attendance_count = member_attendance[member]

        serializer = MemberAttendanceSerializer(members, many=True)
        return Response(serializer.data)
