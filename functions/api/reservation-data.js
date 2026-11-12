// Reservation calendar management
// --------------------------------
// Miya can update the calendar by editing only this list.
//
// status: "open" | "full" | "cancelled"
// private: true prevents anyone else from joining the class.
// bookedGuests and capacity control the remaining-seat count.
// artwork.image may be left blank until an image is ready.
const CHRISTMAS_PRICING = {
  adult: 4000,
  child: 3000,
  currency: "JPY",
  parentChildDiscount: false
};
const CHRISTMAS_DETAILS = {
  en: "One canvas per person. All materials included. Beginners welcome. No additional parent & child discount.",
  ja: "キャンバスは1人1枚、画材すべて込み。初心者歓迎。親子の追加割引はありません。"
};

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
      image: "/images/christmas-wreath-dec-5-2026-class.jpg?v=20261112-photos"
    },
    flyer: "/images/christmas-wreath-dec-5-2026-flyer.jpg",
    pricing: CHRISTMAS_PRICING,
    details: CHRISTMAS_DETAILS,
    capacity: 6,
    bookedGuests: 0,
    private: false,
    status: "open"
  },
  {
    id: "2026-12-09-1000-joy-christmas-tree",
    date: "2026-12-09",
    startTime: "10:00",
    artwork: {
      name: { en: "JOY Christmas Tree", ja: "JOY Christmas Tree" },
      image: "/images/joy-paint-design.jpg?v=20261112-photos"
    },
    flyer: "/images/joy-christmas-tree-dec-9-2026-flyer.jpg",
    pricing: CHRISTMAS_PRICING,
    details: CHRISTMAS_DETAILS,
    capacity: 6,
    bookedGuests: 0,
    private: false,
    status: "open"
  },
  {
    id: "2026-12-13-1300-starry-christmas-night",
    date: "2026-12-13",
    startTime: "13:00",
    artwork: {
      name: { en: "Starry Christmas Night", ja: "Starry Christmas Night（星降る夜）" },
      image: "/images/starry-christmas-night-paint-design.jpg?v=20261112-photos"
    },
    flyer: "/images/starry-christmas-night-dec-13-2026-flyer.jpg",
    pricing: CHRISTMAS_PRICING,
    details: CHRISTMAS_DETAILS,
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
