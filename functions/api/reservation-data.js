// Reservation calendar management
// --------------------------------
// Miya can update the calendar by editing only this list.
//
// status: "open" | "full" | "cancelled"
// private: true prevents anyone else from joining the class.
// bookedGuests and capacity control the remaining-seat count.
// artwork.image may be left blank until an image is ready.
export const RESERVATION_SESSIONS = [
  {
    id: "2026-11-15-1000-moonlit-sakura",
    date: "2026-11-15",
    startTime: "10:00",
    endTime: "12:30",
    artwork: {
      name: { en: "Sunset Paradise", ja: "Sunset Paradise" },
      image: "/images/sunset-paradise-paint-design.jpg"
    },
    capacity: 6,
    bookedGuests: 3,
    private: false,
    status: "open"
  },
  {
    id: "2026-11-26-1000-artwork-tbd",
    date: "2026-11-26",
    startTime: "10:00",
    endTime: "12:30",
    artwork: {
      name: { en: "Painting TBD", ja: "作品未定" },
      image: ""
    },
    capacity: 6,
    bookedGuests: 2,
    private: false,
    status: "open"
  },
  {
    id: "2026-12-05-1300-christmas-wreath",
    date: "2026-12-05",
    startTime: "13:00",
    artwork: {
      name: { en: "Christmas Wreath", ja: "クリスマスリース" },
      image: "/images/christmas-wreath-dec-5-2026-class.jpg"
    },
    capacity: 6,
    bookedGuests: 0,
    private: false,
    status: "open"
  }
];

export function findReservationSession(sessionId) {
  return RESERVATION_SESSIONS.find((session) => session.id === sessionId) || null;
}

export function remainingSeats(session) {
  if (!session || session.private || session.status === "cancelled") {
    return 0;
  }

  if (session.status === "full") {
    return 0;
  }

  return Math.max(0, Number(session.capacity || 0) - Number(session.bookedGuests || 0));
}
