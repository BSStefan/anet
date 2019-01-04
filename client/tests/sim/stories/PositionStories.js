import { Position, Person, Organization } from 'models'
import utils from 'utils'
import { runGQL, fuzzy, populate, identity } from '../simutils'
import faker from 'faker'

/**
 * The general idea would be to:
 * - select a random principal organisation and create a position
 * - select a random principal and assign him to the principal position
 * - select a advisor organization at the same 'bottom-up-level' and create a position
 *   (i.e level 0 is deepest into the organization, rather than the top)
 * - select a random advisor and assign him to the advisor position
 * - select the principal position and assign it to the advisor position
 * 
 * 
 * To make it more 'random' we could do:
 * N times:
 * - select a random principal organisation and create a position
 * - select a random principal and assign it to the principal position
 * - select a random advisor organization and create a position
 * - select a random advisor and assign him to the advisor position
 * then:
 * - select a random principal position
 * - find a advisor position at roughly the seem 'bottom-up-level'
 * - assign the principal position to the advisor position.
 */

const dryRun = false

/**
 * Gets all informative attributes for of a position given its uuid
 * 
 * @param {*} user The user to retrieve the information
 * @param {*} uuid The uuid of the position to retrieve
 */
async function getPosition(user, uuid) {
    return await runGQL(user,
        {
            query: `query {
                position(uuid: "${uuid}") {
                  uuid
                  name
                  type
                  status
                  code
                  organization {
                    uuid
                    shortName
                    longName
                    identificationCode
                  }
                  person {
                    uuid
                    name
                    rank
                  }
                  associatedPositions {
                    uuid
                    name
                    person {
                      uuid
                      name
                      rank
                    }
                    organization {
                      uuid
                      shortName
                    }
                  }
                  previousPeople {
                    startTime
                    endTime
                    person {
                      uuid
                      name
                      rank
                    }
                  }
                  location {
                    uuid
                    name
                  }
                }
              }
              `,
            variables: {}
        }).data.position
}

async function listOrganizations(user) {
    const result = await runGQL(
        user,
        {
            query: `query ($organizationsQuery: OrganizationSearchQueryInput) {
                organizations: organizationList(query: $organizationsQuery) {
                  list {
                    uuid,
                    type,
                    shortName
                  }
                }
              }
              `,
            variables: {
                organizationsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    status: Organization.STATUS.ACTIVE
                }
            }
        }
    )
    if (result.errors) {
        result.errors.forEach((error) => console.error(error.message))
    }
    return result.data.organizations.list
}


/**
 * Creates a template to fill a position with random data 
 * 
 * @param {{uuid,*}} organizations The list of organizations to choose from
 */
function randomPositionTemplate(organizations) {
    // ensure organization type and position type are in line
    const orgType = faker.random.objectElement(Organization.TYPE)
    const type = (orgType === Organization.TYPE.ADVISOR_ORG ? Position.TYPE.ADVISOR : Position.TYPE.PRINCIPAL)
    return {
        type: type, 
        status: () => fuzzy.withProbability(.9) ? Position.STATUS.ACTIVE : Position.STATUS.INACTIVE, //faker.random.objectElement(Position.STATUS),
        person: identity,
        organization: () => {
            return faker.random.arrayElement(organizations.filter((o) => o.type === orgType))
        },
        name: () => faker.name.jobTitle(),
        location: identity,
        code: identity,
        associatedPositions: identity,
    }
}

/**
 * Create a new position for some random (sub)organization
 * 
 * @param {*} user The user that creates the position
 */
const createPosition = async function (user) {
    const organizations = await listOrganizations(user)
    const position = new Position()

    populate(position, randomPositionTemplate(organizations))
        .name.always()
        .status.always()
        .type.always()
        .organization.always()
        .code.sometimes()

    console.debug(`Creating position ${position.name.green}`)
    if (dryRun) {
        console.debug(position)
        return {
            data: {
                createPosition: {
                    uuid: faker.random.uuid()
                }
            }
        }
    }
    else {
        return await runGQL(
            user,
            {
                query: `mutation ($position: PositionInput!) {
                    createPosition(position: $position) {
                      uuid
                    }
                  }
                  `,
                variables: {
                    position: position
                }
            })
    }
}

/**
 * Remove some random organization.
 * 
 * @param {*} user 
 */
const deletePosition = async function (user) {
    const positions = (await runGQL(user,
        {
            query: `query ($positionsQuery: PositionSearchQueryInput) {
                positionList(query: $positionsQuery) {
                  list {
                    uuid, name
                  }
                }
              }
              `,
            variables: {
                positionsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    isFilled: false,
                    status: Position.STATUS.INACTIVE,
                    type: faker.random.arrayElement([Position.TYPE.ADVISOR, Position.TYPE.PRINCIPAL])
                }
            }
        })).data.positionList.list
    const position = faker.random.arrayElement(positions)

    if (position) {
        console.debug(`Removing position of ${position.name.green}`)
        if (dryRun) {
            return {
                data: {
                    deletePosition: {
                        uuid: position.uuid
                    }
                }
            }
        }
        else {
            return await runGQL(user,
                {
                    query: `mutation($uuid: String!) {
                        deletePosition(uuid: $uuid)
                    }`,
                    variables: {
                        uuid: position.uuid
                    }
                })
        }

    }
    else {
        console.debug('No INACTIVE position to delete')
        return '(NOP)'
    }
}

const updatePosition = async function (user) {
    const positions = (await runGQL(user,
        {
            query: `query ($positionsQuery: PositionSearchQueryInput) {
                positionList(query: $positionsQuery) {
                  list {
                    uuid, name
                  }
                }
              }
              `,
            variables: {
                positionsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    isFilled: false,
                    type: faker.random.arrayElement([Position.TYPE.ADVISOR, Position.TYPE.PRINCIPAL])
                }
            }
        })).data.positionList.list
    const position0 = faker.random.arrayElement(positions)

    if (position0) {
        console.debug(`Updating position of ${position0.name.green}`)

        const organizations = await listOrganizations(user)
        const position = (await runGQL(user,
            {
                query: `query { 
                        position (uuid:"${position0.uuid}") {
                            uuid, name, code, status, type, 
                            location { uuid },
                            associatedPositions { uuid, name, person { uuid, name, rank } },
                            organization { uuid },
                            person { uuid }
                        }
                    }`,
                variables: {}
            })).data.position
    
        populate(position, randomPositionTemplate(organizations))
            .name.sometimes()
            .status.often()
            .type.never()
            .organization.rarely()
            .code.sometimes()

        if (dryRun) {
            return {
                data: {
                    updatePosition: {
                        uuid: position.uuid
                    }
                }
            }
        }
        else {
            return await runGQL(user,
                {
                    query: `mutation ($position: PositionInput!) {
                        updatePosition(position: $position)
                      }
                      `,
                    variables: {
                        position: position
                    }
                })
        }

    }
    else {
        console.debug('No position')
        return '(NOP)'
    }

}

/**
 * Assign a random (free) person to a random (free) position
 * 
 * @param {*} user  The user to do the assignment
 */
const putPersonInPosition = async function (user) {
    const role = faker.random.objectElement(Person.ROLE)
    const type = role === Person.ROLE.ADVISOR ? Position.TYPE.ADVISOR : Position.TYPE.PRINCIPAL
    var persons = (await runGQL(user,
        {
            query: `query ($peopleQuery: PersonSearchQueryInput) {
                personList(query: $peopleQuery) {
                    list {
                        uuid
                        name
                        position {
                            uuid
                        }
                    }
                }
            }`,
            variables: {
                peopleQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    role: role
                }
            }
        })).data.personList.list.filter((p) => !p.position)
    var positions = (await runGQL(user,
        {
            query: `query ($positionsQuery: PositionSearchQueryInput) {
                positionList(query: $positionsQuery) {
                  list {
                    uuid, name
                  }
                }
              }
              `,
            variables: {
                positionsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    isFilled: false,
                    type: type
                }
            }
        })).data.positionList.list

    var position = faker.random.arrayElement(positions)
    var person = faker.random.arrayElement(persons)

    if (!position) {
        console.debug('No positions available')
        return '(NOP)'
    }
    else if (!person) {
        console.debug('No person available to fullfill the position')
        return '(NOP)'
    }
    else {
        console.debug(`Putting ${person.name.green} in position of ${position.name.green}`)
        if (dryRun) {
            return {
                data: {
                    putPersonInPosition: {
                        uuid: position.uuid
                    }
                }
            }
        }
        else {
            return await runGQL(user,
                {
                    query: `mutation($uuid: String!, $person: PersonInput!) {
                        putPersonInPosition(uuid: $uuid, person: $person)
                    }`,
                    variables: {
                        person: {
                            uuid: person.uuid
                        },
                        uuid: position.uuid
                    }
                })
        }
    }
}

const deletePersonFromPosition = async function (user) {
    const positions = (await runGQL(user,
        {
            query: `query ($positionsQuery: PositionSearchQueryInput) {
                positionList(query: $positionsQuery) {
                  list {
                    uuid, name, person { name }
                  }
                }
              }
              `,
            variables: {
                positionsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    isFilled: true,
                    type: faker.random.arrayElement([Position.TYPE.ADVISOR, Position.TYPE.PRINCIPAL])
                }
            }
        })).data.positionList.list
    const position = faker.random.arrayElement(positions)

    if (position) {
        console.debug(`Removing ${position.person.name.green} from position of ${position.name.green}`)
        if (dryRun) {
            return {
                data: {
                    deletePersonFromPosition: {
                        uuid: position.uuid
                    }
                }
            }
        }
        else {
            return await runGQL(user,
                {
                    query: `mutation($uuid: String!) {
                        deletePersonFromPosition(uuid: $uuid)
                    }`,
                    variables: {
                        uuid: position.uuid
                    }
                })
        }

    }
    else {
        console.debug('No position')
        return '(NOP)'
    }
}


/**
 * Associated a random advisor/principal position with a principal/advisor counter-part at roughly the 
 * same bottom-up-level.
 * 
 * @param {*} user The user to do the association
 */
const updateAssociatedPosition = async function (user) {
    const query = `query ($positionsQuery: PositionSearchQueryInput) {
        positionList(query: $positionsQuery) {
          list {
            associatedPositions {
                uuid
            },
            code,
            name,
            organization { uuid, shortName, longName, identificationCode },
            status,
            type,
            uuid
          }
        }
      }`
    const advisorPositions = (await runGQL(user,
        {
            query: query,
            variables: {
                positionsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    isFilled: faker.random.boolean(),
                    type: Position.TYPE.ADVISOR
                }
            }
        })).data.positionList.list
    const principalPositions = (await runGQL(user,
        {
            query: query,
            variables: {
                positionsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    isFilled: faker.random.boolean(),
                    type: Position.TYPE.PRINCIPAL
                }
            }
        })).data.positionList.list
    
    // for now just take a random position and do not take the organization level into account
    const principalPosition = faker.random.arrayElement(principalPositions)
    const advisorPosition = faker.random.arrayElement(advisorPositions)

    if (principalPosition && advisorPosition) {
        console.debug(`Associating advisor position ${advisorPosition.name.green} with ${principalPosition.name.green}`)

        // update the position associations
        advisorPosition.associatedPositions.push({
            uuid: principalPosition.uuid
        })

        if (dryRun) {
            return {
                data: "(dry run)"
            }
        }
        else {
            return await runGQL(user,
                {
                    query: `mutation($position: PositionInput!) {
                        updateAssociatedPosition(position: $position)
                    }`,
                    variables: {
                        position: advisorPosition,
                    }
                })
        }
    }
    else {
        console.debug(`Did not find an appropriate principal and/or advisor position`)
        return null
    }
}

/**
 * Associated a random advisor/principal position with a principal/advisor counter-part at roughly the 
 * same bottom-up-level.
 * 
 * @param {*} user The user to do the association
 */
const removeAssociatedPosition = async function (user) {
    const query = `query ($positionsQuery: PositionSearchQueryInput) {
        positionList(query: $positionsQuery) {
          list {
            associatedPositions { uuid, name },
            code,
            name,
            organization { uuid, shortName, longName, identificationCode },
            status,
            type,
            uuid
          }
        }
      }`
    const positions = (await runGQL(user,
        {
            query: query,
            variables: {
                positionsQuery: {
                    pageNum: 0,
                    pageSize: 0,
                    isFilled: faker.random.boolean(),
                    type: faker.random.arrayElement([Position.TYPE.ADVISOR, Position.TYPE.PRINCIPAL])
                }
            }
        })).data.positionList.list
    
    // for now just take a random position and do not take the organization level into account
    const position = faker.random.arrayElement(positions.filter((p) => p.associatedPositions && p.associatedPositions.length))

    if (position) {
        const associatedPosition = faker.random.arrayElement(position.associatedPositions)
        const index = position.associatedPositions.indexOf(associatedPosition)

        console.debug(`Disassociating position ${associatedPosition.name.green} from ${position.type.toLowerCase()} position ${position.name.green}`)

        // update the position associations
        position.associatedPositions.splice(index, 1)

        if (dryRun) {
            return {
                data: "(dry run)"
            }
        }
        else {
            return await runGQL(user,
                {
                    query: `mutation($position: PositionInput!) {
                        updateAssociatedPosition(position: $position)
                    }`,
                    variables: {
                        position: position,
                    }
                })
        }
    }
    else {
        console.debug(`Did not find an appropriate principal and/or advisor position`)
        return null
    }
}

const positionsBuildup = async function (user, number) {
    async function count() { 
        return (await runGQL(user,
            {
                query: `query {
                    positions(pageNum: 0, pageSize: 1) {
                        totalCount
                    }
                }`,
                variables: {}
            })).data.positions.totalCount
    }
    while ((await count()) < number) {
        await createPosition(user)
    }
}

const assignedPositionsBuildup = async function (user, number) {
    async function count() { 
        return (await runGQL(user,
            {
                query: `query {
                    positionList(query: {pageNum: 0, pageSize: 1, isFilled: true}) {
                        totalCount
                    }
                }`,
                variables: {}
            })).data.positionList.totalCount
    }
    while ((await count()) < number) {
        await putPersonInPosition(user)
    }
}

export { positionsBuildup, assignedPositionsBuildup, createPosition, updatePosition, deletePosition, putPersonInPosition, deletePersonFromPosition, updateAssociatedPosition, removeAssociatedPosition }
