import { Person, Organization, Report } from "models"
import { createHierarchy } from "../../stories/OrganizationStories"
import { createPerson } from "../../stories/PersonStories"
import { createReport } from "../../stories/ReportStories"

const buildupLotsOfData = [
  {
    name: "Create active advisor",
    number: 2000,
    runnable: createPerson,
    userTypes: ["existingAdmin"],
    arguments: { role: Person.ROLE.ADVISOR, status: Person.STATUS.ACTIVE }
  },
  {
    name: "Create inactive advisor",
    number: 10000,
    runnable: createPerson,
    userTypes: ["existingAdmin"],
    arguments: { role: Person.ROLE.ADVISOR, status: Person.STATUS.INACTIVE }
  },
  {
    name: "Create active principal",
    number: 10000,
    runnable: createPerson,
    userTypes: ["existingAdmin"],
    arguments: { role: Person.ROLE.PRINCIPAL, status: Person.STATUS.ACTIVE }
  },
  {
    name: "Create inactive principal",
    number: 10000,
    runnable: createPerson,
    userTypes: ["existingAdmin"],
    arguments: { role: Person.ROLE.PRINCIPAL, status: Person.STATUS.INACTIVE }
  },
  {
    name: "Create advisor organization",
    number: 200,
    runnable: createHierarchy,
    userTypes: ["existingAdmin"],
    arguments: {
      type: Organization.TYPE.ADVISOR_ORG,
      status: Organization.STATUS.ACTIVE,
      subOrgs: false
    }
  },
  {
    name: "Create principal organization",
    number: 1000,
    runnable: createHierarchy,
    userTypes: ["existingAdmin"],
    arguments: {
      type: Organization.TYPE.PRINCIPAL_ORG,
      status: Organization.STATUS.ACTIVE,
      subOrgs: false
    }
  },
  {
    name: "Create published report #1",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  },
  {
    name: "Create published report #2",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  },
  {
    name: "Create published report #3",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  },
  {
    name: "Create published report #4",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  },
  {
    name: "Create published report #5",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  },
  {
    name: "Create published report #6",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  },
  {
    name: "Create published report #7",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  },
  {
    name: "Create published report #8",
    number: 25000,
    runnable: createReport,
    userTypes: ["existingAdmin"],
    arguments: { state: Report.STATE.PUBLISHED }
  }
]

export default buildupLotsOfData
