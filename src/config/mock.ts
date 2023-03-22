export const RoomRoot = {
  roomState: {
    callId: "123",
    users: {
      "1": {
        id: "1",
        name: "John",
        raiseHand: false,
      },
      "2": {
        id: "2",
        name: "Jane",
        raiseHand: true,
      },
      "3": {
        id: "3",
        name: "Joe",
        raiseHand: false,
      },
    },
    breakoutRooms: {
      "0": {
        active: true,
        users: {
          "1": {
            id: "1",
            name: "John",
            muted: false,
            raiseHand: false,
          },
          "3": {
            id: "3",
            name: "Joe",
            muted: false,
            raiseHand: false,
          },
        }
      },
      "1": {
        active: false,
        users: {}
      }
    }
  },
  privateState: {
    users: {
      1: ['participant', 'poll'],
      2: ['owner'],
      3: ['participant'],
    }
  },
}