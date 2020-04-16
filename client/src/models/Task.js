import { Settings } from "api"
import Model, {
  createAssessmentSchema,
  createCustomFieldsSchema,
  NOTE_TYPE,
  yupDate
} from "components/Model"
import _isEmpty from "lodash/isEmpty"
import { Report } from "models"
import TASKS_ICON from "resources/tasks.png"
import utils from "utils"
import * as yup from "yup"

export const {
  shortLabel,
  longLabel,
  customFieldRef1,
  customField,
  customFieldEnum1,
  customFieldEnum2,
  plannedCompletion,
  projectedCompletion,
  responsiblePositions
} = Settings.fields.task

export default class Task extends Model {
  static resourceName = "Task"
  static listName = "taskList"
  static getInstanceName = "task"
  static relatedObjectType = "tasks"

  static displayName() {
    return shortLabel
  }

  static STATUS = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE"
  }

  static APPROVAL_STEP_TYPE = {
    PLANNING_APPROVAL: "PLANNING_APPROVAL",
    REPORT_APPROVAL: "REPORT_APPROVAL"
  }

  // create yup schema for the customFields, based on the customFields config
  static customFieldsSchema = createCustomFieldsSchema(
    Settings.fields.task.customFields
  )

  static yupSchema = yup
    .object()
    .shape({
      shortName: yup
        .string()
        .required()
        .default("")
        .label(Settings.fields.task.shortName.label),
      longName: yup
        .string()
        .nullable()
        .default("")
        .label(Settings.fields.task.longName.label),
      category: yup.string().nullable().default(""),
      taskedOrganizations: yup
        .array()
        .nullable()
        .default([])
        .label(Settings.fields.task.taskedOrganizations.label),
      customFieldRef1: yup
        .object()
        .nullable()
        .default({})
        .label(customFieldRef1 && customFieldRef1.label),
      customFieldEnum1: yup
        .string()
        .nullable()
        .default("")
        .label(customFieldEnum1 && customFieldEnum1.label),
      customFieldEnum2: yup
        .string()
        .nullable()
        .default("")
        .label(customFieldEnum2 && customFieldEnum2.label),
      customField: yup
        .string()
        .nullable()
        .default("")
        .label(customField && customField.label),
      projectedCompletion: yupDate
        .nullable()
        .default(null)
        .label(projectedCompletion && projectedCompletion.label),
      plannedCompletion: yupDate
        .nullable()
        .default(null)
        .label(plannedCompletion && plannedCompletion.label),
      status: yup
        .string()
        .required()
        .default(() => Task.STATUS.ACTIVE),
      responsiblePositions: yup
        .array()
        .nullable()
        .default([])
        .label(responsiblePositions && responsiblePositions.label),
      // FIXME: resolve code duplication in yup schema for approval steps
      planningApprovalSteps: yup
        .array()
        .of(
          yup.object().shape({
            name: yup
              .string()
              .required("You must provide the step name")
              .default(""),
            type: yup
              .string()
              .required()
              .default(() => Task.APPROVAL_STEP_TYPE.PLANNING_APPROVAL),
            approvers: yup
              .array()
              .required("You must select at least one approver")
              .default([])
          })
        )
        .nullable()
        .default([]),
      approvalSteps: yup
        .array()
        .of(
          yup.object().shape({
            name: yup
              .string()
              .required("You must provide the step name")
              .default(""),
            type: yup
              .string()
              .required()
              .default(() => Task.APPROVAL_STEP_TYPE.REPORT_APPROVAL),
            approvers: yup
              .array()
              .required("You must select at least one approver")
              .default([])
          })
        )
        .nullable()
        .default([])
    })
    // not actually in the database, the database contains the JSON customFields
    .concat(Task.customFieldsSchema)
    .concat(Model.yupSchema)

  static autocompleteQuery =
    "uuid, shortName, longName, customFieldRef1 { uuid, shortName } taskedOrganizations { uuid, shortName }, customFields"

  static humanNameOfStatus(status) {
    return utils.sentenceCase(status)
  }

  constructor(props) {
    super(Model.fillObject(props, Task.yupSchema))
  }

  static isTopLevelTask(task) {
    return _isEmpty(task.customFieldRef1)
  }

  isTopLevelTask() {
    return Task.isTopLevelTask(this)
  }

  static fieldSettings(task) {
    return Task.isTopLevelTask(task)
      ? Settings.fields.task.topLevel
      : Settings.fields.task.subLevel
  }

  fieldSettings() {
    return Task.fieldSettings(this)
  }

  iconUrl() {
    return TASKS_ICON
  }

  toString() {
    return `${this.shortName}`
  }

  static parseAssessmentsConfig(assessmentsConfig) {
    return Object.fromEntries(
      assessmentsConfig.map(a => {
        const assessmentKey = a.periodicity
          ? `${a.assessmentType}_${a.periodicity}`
          : a.assessmentType
        const questions = a.questions || {}
        return [
          assessmentKey,
          typeof questions === "object"
            ? questions
            : typeof questions === "string"
              ? JSON.parse(questions)
              : {}
        ]
      })
    )
  }

  static getGeneralAssessmentsConfig(task) {
    return Task.parseAssessmentsConfig(
      Task.fieldSettings(task).assessments || []
    )
  }

  static getInstanceAssessmentsConfig(task) {
    // The given task instance might have a specific assessments config
    return Task.parseAssessmentsConfig(
      JSON.parse(task.customFields || "{}").assessments || []
    )
  }

  static getAssessmentsConfig(task) {
    return Object.assign(
      Task.getGeneralAssessmentsConfig(task),
      Task.getInstanceAssessmentsConfig(task)
    )
  }

  static getInstantAssessmentConfig(task) {
    return Task.getAssessmentsConfig(task).instant
  }

  getInstantAssessmentConfig() {
    return Task.getInstantAssessmentConfig(this)
  }

  getInstantAssessmentResults(dateRange) {
    const publishedReportsUuids = this.publishedReports.map(r => r.uuid)
    const assessmentsNotes = this.notes
      .filter(
        n =>
          n.type === NOTE_TYPE.ASSESSMENT &&
          n.noteRelatedObjects.length === 2 &&
          n.noteRelatedObjects.filter(
            ro =>
              ro.relatedObjectType === Report.relatedObjectType &&
              publishedReportsUuids.includes(ro.relatedObjectUuid)
          ).length &&
          (!dateRange ||
            (n.createdAt <= dateRange.end && n.createdAt >= dateRange.start))
      )
      .map(n => JSON.parse(n.text))
    const assessmentsResults = {}
    assessmentsNotes.forEach(n =>
      Object.keys(n).forEach(k => {
        if (!Object.prototype.hasOwnProperty.call(assessmentsResults, k)) {
          assessmentsResults[k] = []
        }
        assessmentsResults[k].push(n[k])
      })
    )
    return assessmentsResults
  }

  getPeriodicAssessmentDetails(periodicity = "monthly") {
    const assessmentConfig = Task.getAssessmentsConfig(this)[
      `periodic_${periodicity}`
    ]
    return {
      assessmentConfig: assessmentConfig,
      assessmentYupSchema: createAssessmentSchema(assessmentConfig)
    }
  }
}
