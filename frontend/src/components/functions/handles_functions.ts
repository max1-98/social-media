import axios from "axios";
import type { EventDetail, Member, MemberEvent } from "../../types";
import { fetchClub, fetchEvent, fetchMembers } from "./fetch_functions";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

// Handles activation of users
export const handleActivate = async (
  member_id: number,
  event_id: number | string,
  setMembers: SetState<MemberEvent[]>,
  setEvent: SetState<EventDetail | null>,
  setAMembers: SetState<Member[]>,
  setInGameMembers: SetState<Member[]>
): Promise<void> => {
  try {
    await axios.post(`http://127.0.0.1:8000/club/event/activate-member/`,
      {
        member_id: member_id,
        event_id: event_id,
      }
    );
    fetchMembers(event_id, setMembers);
    fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);

  } catch (error) {
  }
};


export const handleDeactivate = async (
  member_id: number,
  event_id: number | string,
  setMembers: SetState<MemberEvent[]>,
  setEvent: SetState<EventDetail | null>,
  setAMembers: SetState<Member[]>,
  setInGameMembers: SetState<Member[]>
): Promise<void> => {
  try {
    await axios.post(`http://127.0.0.1:8000/club/event/deactivate-member/`,
      {
        member_id: member_id,
        event_id: event_id,
      }
    );
    fetchMembers(event_id, setMembers);
    fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);

  } catch (error) {
  }
};
