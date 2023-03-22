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
            // TODO: make it required to always have a users object following the $resourceId to be able to dynamically check if users are part of that resource group
            'roomState.breakoutRooms.$resourceId.users.$anyId.muted': true,
            'roomState.polls.$anyId.users.$userId': true,
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

  console.log('config: ', permissionConfig)


  /* ==============================
  ===== PERMISSION CHECKING =======
  ================================= */

  function hasWritePermission(
    userId: string,
    statePath: string,
    resourceId?: null | string,
  ): boolean {
    const userRoles = privateRoomState.roles[userId];

    for (const roleName in userRoles) {
      if (userRoles[roleName]) {
        const roleWritePermissions = permissionConfig.roles[roleName].permissions.write;

        // Check for the all-access wildcard
        if (roleWritePermissions['*']) {
          return true;
        }

        for (const pattern in roleWritePermissions) {
          if (roleWritePermissions[pattern] &&
            pathMatch(statePath, pattern, userId, resourceId)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function pathMatch(
    path: string,
    pattern: string,
    userId?: null | string,
    resourceId?: null | string): boolean {

    // [ 'roomState', 'users', '3', 'handRaised' ]
    const pathParts = path.split('.');
    // [ 'roomState', 'users', '$userId' ]
    const patternParts = pattern.split('.');

    for (let i = 0; i < pathParts.length; i++) {
      const pathPart = pathParts[i];
      const patternPart = patternParts[i];

      if (
        patternPart === '*' ||
        patternPart === '$anyId' ||
        pathPart === userId && patternPart === '$userId' ||
        pathPart === resourceId && patternPart === '$resourceId') {
        // if we're at the end of the pattern, we've matched
        if (i === patternParts.length - 1) {
          return true;
        }
        continue;
      }

      if (pathPart !== patternPart) {
        return false;
      }
    }

    return true;
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

  const resourceId = null;
  const statePath = 'roomState.users.3.handRaised'; // Example of a nested state object path
  const canPerformAction = hasWritePermission(
    msg1.userId,
    statePath,
    resourceId
  );

  console.log(canPerformAction); // true or false depending on the permissions


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
})()