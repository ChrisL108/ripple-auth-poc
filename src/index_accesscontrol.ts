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

  function convertToInitialGrants(permissionConfig: AccessState) {
    const initialGrants = [];

    for (const roleName in permissionConfig.roles) {
      const role = permissionConfig.roles[roleName];
      const permissions = role.permissions;

      for (const actionType in permissions) {
        const actionKey = actionType as 'read' | 'write';
        const action = actionKey === 'read' ? 'read:any' : 'write:own';

        for (const resource in permissions[actionKey]) {
          if (permissions[actionKey][resource]) {
            const formattedResource = resource === '*' ? '__all__' : resource;
            initialGrants.push({
              role: roleName,
              resource: formattedResource,
              action,
              //TODO: We are assuming all attributes are allowed. Change this if needed.
              attributes: '*',
            });
          }
        }
      }
    }

    return initialGrants;
  }

  // function convertToInitialGrants(permissionConfig: AccessState) {
  //   const initialGrants = [];

  //   for (const roleName in permissionConfig.roles) {
  //     const role = permissionConfig.roles[roleName];
  //     const permissions = role.permissions;

  //     for (const actionType in permissions) {
  //       // Add a type assertion to narrow down the type of actionType
  //       const actionKey = actionType as 'read' | 'write';
  //       const action = actionKey === 'read' ? 'read:any' : 'write:own';

  //       for (const resource in permissions[actionKey]) {
  //         if (permissions[actionKey][resource]) {
  //           initialGrants.push({
  //             role: roleName,
  //             resource,
  //             action,
  //             //TODO: We are assuming all attributes are allowed. Change this if needed.
  //             attributes: '*',
  //           });
  //         }
  //       }
  //     }
  //   }

  //   return initialGrants;
  // }

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

  const initialGrants = [
    {
      role: 'owner',
      resource: '*',
      action: 'read:any',
      attributes: '*',
    },
    {
      role: 'owner',
      resource: '*',
      action: 'write:any',
      attributes: '*',
    },
    {
      role: 'participant',
      resource: 'roomState.*',
      action: 'read:any',
      attributes: '*',
    },
    {
      role: 'participant',
      resource: 'chalkboardState.*',
      action: 'read:any',
      attributes: '*',
    },
    {
      role: 'participant',
      resource: 'settingsState.*',
      action: 'read:any',
      attributes: '*',
    },
    {
      role: 'participant',
      resource: 'roomState.users.$userId',
      action: 'write:own',
      attributes: '*',
    },
    {
      role: 'participant',
      resource: 'roomState.breakoutRooms.$resourceId.users.$anyId.muted',
      action: 'write:own',
      attributes: '*',
    },
    {
      role: 'poll',
      resource: 'roomState.poll.*',
      action: 'read:any',
      attributes: '*',
    },
    {
      role: 'poll',
      resource: 'roomState.poll.$resourceId.answers',
      action: 'write:own',
      attributes: '*',
    },
  ];

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


  const AccessControl = require('accesscontrol');
  const ac = new AccessControl();
  // const ac = new AccessControl(convertToInitialGrants(permissionConfig));

  console.log(ac);
  console.log(ac.getGrants());

  ac.grant('owner')
    .readAny('*')
    .updateAny('*')
    .createAny('*')
    .deleteAny('*');

  ac.grant('participant')
    .readAny('roomState.*')
    .readAny('chalkboardState.*')
    .readAny('settingsState.*')
    .updateOwn('roomState.users.$userId')
  // .updateAny('roomState.breakoutRooms.$resourceId.users.$anyId.muted');

  ac.grant('poll')
    .readAny('roomState.poll.*')
    .updateOwn('roomState.poll.$resourceId.answers');


  /* ==============================
  ===== PERMISSION CHECKING =======
  ================================= */


  function replacePlaceholders(resource: string, userId: string | null, resourceId: string | null): string {
    return resource
      .replace('$userId', userId || '')
      .replace('$resourceId', resourceId || '')
      .replace('__all__', '*');
  }

  // function replacePlaceholders(str: string, replacements: any) {
  //   return str.replace(/\$(\w+)/g, (_, key) => (replacements[key] !== undefined ? replacements[key] : `$${key}`));
  // }


  function canPerformAction(
    userId: string,
    resourceId: string,
    action: 'read' | 'write',
    resource: string,
  ) {
    const userRoles = ['participant', 'poll']; // Get user roles from your data source
    const placeholders = { userId, resourceId, anyId: '*' };

    return userRoles.some((role) => {
      const permission = ac.can(role)[action + 'Own'](replacePlaceholders(resource, userId, resourceId));
      return permission.granted;
    });
  }

  const userId = '3';
  const resourceId = '1';
  const action = 'write';
  const resource = 'roomState.users.$userId';
  const allowed = canPerformAction(userId, resourceId, action, resource);
  console.log(allowed); // true or false depending on the permissions



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

  const msg2 = {
    event: {
      lastEventType: "mute-breakout-room-user",
      payload: {
        breakoutGroups: {
          "0": {
            users: {
              "1": {
                muted: true
              },
              "3": {
                muted: false
              }
            }
          }
        }
      },
      userId: "3",
    }
  }

  console.log(convertToInitialGrants(permissionConfig))

  // const userId = '3';
  // const resourceId = null;
  // const statePath = 'roomState.users.3.handRaised'; // Example of a nested state object path
  // const canPerformAction = hasWritePermission(
  //   msg1.userId,
  //   statePath,
  //   resourceId
  // );

  // console.log(canPerformAction); // true or false depending on the permissions

})()