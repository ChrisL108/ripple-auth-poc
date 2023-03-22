(async () => {
  console.log('========== NEW RUN ==========')
  interface Role {
    roleName: string;
    permissions: {
      read: {
        [permissionName: string]: boolean;
      }
      write: {
        [permissionName: string]: boolean;
      }
    };
  }

  interface AccessState {
    roles: {
      [roleName: string]: Role;
    }
  }

/* ==============================
======== INITIAL SETUP ==========
================================= */

  const permissionConfig: AccessState = {
    // TODO use Map instead of object
    roles: {
      owner: {
        roleName: 'owner',
        permissions: {
          read: {
            '*': true,
          },
          write: {
            '*': true,
          },
        }
      },
      participant: {
        roleName: 'participant',
        permissions: {
          read: {
            'roomState.*': true,
            'chalkboardState.*': true,
            'settingsState.*': true,
          },
          write: {
            'roomState.users.$userId': true,
            'roomState.breakoutRooms.$resourceId.users.$anyId.muted': true,
          },
        }
      },
      poll: {
        roleName: 'poll',
        permissions: {
          read: {
            'roomState.poll.*': true,
          },
          write: {
            'roomState.poll.$resourceId.answers': true,
          },
        }
      }
    }
  };

  let privateRoomState: { roles: Record<string, Record<string, boolean>> } = {
    roles: {
      "1": {
        owner: true
      },
      "2": {
        participant: true,
        poll: true
      },
      "3": {
        participant: true
      }
    }
  }

  const RoomRoot = {
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

  console.log(permissionConfig)


  /* ==============================
  ===== PERMISSION CHECKING =======
  ================================= */

  function pathMatch(
    path: string,
    pattern: string,
    userId?: null | string,
    resourceId?: null | string): boolean {

    const pathParts = path.split('.');
    const patternParts = pattern.split('.');

    console.log('\n-----------\n')
    console.log('path[]: ', pathParts)
    console.log('patt[]: ', patternParts)

    for (let i = 0; i < pathParts.length; i++) {
      console.log('checking: ', { path: pathParts[i], pattern: patternParts[i] })
      if (patternParts[i] === '*' || patternParts[i] === '$anyId') {
        // wildcards
        if (i === patternParts.length - 1) {
          break
        } else {
          continue
        }
      }

      if (patternParts[i] === '$userId') {
        if (pathParts[i] === userId) {
          // $userId being the last path value means they 
          // have access to anything nested
          if (i === patternParts.length - 1) {
            break
          }
          continue
        } else return false;
      }

      if (patternParts[i] === '$resourceId') {
        if (pathParts[i] === resourceId) {
          // $resourceId being the last path value means they 
          // have access to anything nested
          if (i === patternParts.length - 1) {
            break
          }
          continue
        } else return false;
      }

      if (pathParts[i] !== patternParts[i]) {
        // If the parts don't match, return false
        return false;
      }
    }

    console.log('returning true')

    return true;
  }

  function hasWritePermission(
    userId: string,
    statePath: string,
    resourceId?: null | string,
  ): boolean {
    const userRoles = privateRoomState.roles[userId];

    for (const roleName in userRoles) {
      if (userRoles[roleName]) {
        const rolePermissions = permissionConfig.roles[roleName].permissions.write;
        // console.log('rolePermissions: ', rolePermissions)

        // Check for the all-access wildcard
        if (rolePermissions['*']) {
          return true;
        }

        for (const pattern in rolePermissions) {
          const hasPattern = rolePermissions[pattern];
          const matchesPattern = pathMatch(statePath, pattern, userId, resourceId);
          // console.log('hasPattern: ', hasPattern)
          // console.log('matchesPattern: ', matchesPattern)
          if (hasPattern && matchesPattern) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /* ==============================
  =========== MOCK USE ============
  ================================= */

  // websocket message
  const msg1 = {
    event: {
      lastEventType: "raise-hand",
      payload: {
        id: "3"
      }
    },
    userId: "3",
  }

  // const msg2 = {
  //   event: {
  //     lastEventType: "mute-breakout-room-user",
  //     payload: {
  //       breakoutGroups: {
  //         "0": {
  //           users: {
  //             "1": {
  //               muted: true
  //             },
  //             "3": {
  //               muted: false
  //             }
  //           }
  //         }
  //       }
  //     },
  //     userId: "3",
  //   }
  // }

  const userId = '3';
  const resourceId = null;
  const statePath = 'roomState.users.3.handRaised'; // Example of a nested state object path
  const canPerformAction = hasWritePermission(
    msg1.userId,
    statePath,
    resourceId
  );

  console.log(canPerformAction); // true or false depending on the permissions

})()