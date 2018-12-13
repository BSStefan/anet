import Settings from 'Settings'
import Model, { yupDate } from 'components/Model'
import moment from 'moment'
import _isEmpty from 'lodash/isEmpty'
import {Person, Position} from 'models'

import * as yup from 'yup'

export const fieldLabels = {
	intent: 'Meeting goal (purpose)',
	atmosphere: 'Atmospherics',
	atmosphereDetails: 'Atmospherics details',
	cancelled: '',
	reportTags: 'Tags',
}

export default class Report extends Model {
	static resourceName = 'Report'
	static listName = 'reportList'
	static getInstanceName = 'report'
	static getModelNameLinkTo = 'report'

	static STATE = {
		DRAFT: 'DRAFT',
		PENDING_APPROVAL: 'PENDING_APPROVAL',
		RELEASED: 'RELEASED',
		REJECTED: 'REJECTED',
		CANCELLED: 'CANCELLED',
		FUTURE: 'FUTURE'
	}

	static CANCELLATION_REASON = {
		CANCELLED_BY_ADVISOR: 'CANCELLED_BY_ADVISOR',
		CANCELLED_BY_PRINCIPAL: 'CANCELLED_BY_PRINCIPAL',
		CANCELLED_DUE_TO_TRANSPORTATION: 'CANCELLED_DUE_TO_TRANSPORTATION',
		CANCELLED_DUE_TO_FORCE_PROTECTION: 'CANCELLED_DUE_TO_FORCE_PROTECTION',
		CANCELLED_DUE_TO_ROUTES: 'CANCELLED_DUE_TO_ROUTES',
		CANCELLED_DUE_TO_THREAT: 'CANCELLED_DUE_TO_THREAT',
	}

	static ATMOSPHERE = {
		POSITIVE: 'POSITIVE',
		NEGATIVE: 'NEGATIVE',
		NEUTRAL: 'NEUTRAL',
	}

	static yupSchema = yup.object().shape({
		intent: yup.string().nullable().required(`You must provide the ${fieldLabels.intent}`).default('')
			.label(fieldLabels.intent),
		engagementDate: yupDate.nullable().required('You must provide the Date of Engagement')
			.when('cancelled', (cancelled, schema) => (
				cancelled ? schema : schema.test('future-engagement', 'You cannot submit reports for future dates, except for cancelled engagements',
					engagementDate => !moment(engagementDate).isAfter(moment().endOf('day'))
			)))
			.default(null),
		// not actually in the database, but used for validation:
		cancelled: yup.boolean().default(false)
			.label(fieldLabels.cancelled),
		cancelledReason: yup.string().nullable()
			.when('cancelled', (cancelled, schema) => (
				cancelled ? schema.required('You must provide a reason for cancellation') : schema.nullable()
			))
			.default(null),
		atmosphere: yup.string().nullable()
			.when('cancelled', (cancelled, schema) => (
				cancelled ? schema.nullable() : schema.required('You must provide the overall atmospherics of the engagement')
			))
			.default(null)
			.label(fieldLabels.atmosphere),
		atmosphereDetails: yup.string().nullable()
			.when(['cancelled', 'atmosphere'], (cancelled, atmosphere, schema) => (
				cancelled ? schema.nullable() : (atmosphere === Report.ATMOSPHERE.POSITIVE) ? schema.nullable() : schema.required('You must provide atmospherics details if the engagement was not Positive')
			))
			.default('')
			.label(fieldLabels.atmosphereDetails),
		location: yup.object().nullable().default({}),
		attendees: yup.array().nullable()
			.test('primary-principal', 'primary principal error',
				// can't use arrow function here because of binding to 'this'
				function(attendees) {
					const err = Report.checkPrimaryAttendee(attendees, Person.ROLE.PRINCIPAL)
					return err ? this.createError({message: err}) : true
				}
			)
			.test('primary-advisor', 'primary advisor error',
				// can't use arrow function here because of binding to 'this'
				function(attendees) {
					const err = Report.checkPrimaryAttendee(attendees, Person.ROLE.ADVISOR)
					return err ? this.createError({message: err}) : true
				}
			)
			.default([]),
		principalOrg: yup.object().nullable().default({}),
		advisorOrg: yup.object().nullable().default({}),
		tasks: yup.array().nullable().default([]),
		comments: yup.array().nullable().default([]),
		reportText: yup.string().nullable().default(''),
		nextSteps: yup.string().nullable().required('You must provide a brief summary of the Next Steps')
			.default('')
			.label('Next steps description'),
		keyOutcomes: yup.string().nullable()
			.when('cancelled', (cancelled, schema) => (
				cancelled ? schema.nullable() : schema.required('You must provide a brief summary of the Key Outcomes')
			))
			.default('')
			.label('Key outcome description'),
		tags: yup.array().nullable().default([]),
		reportTags: yup.array().nullable().default([])
			.label(fieldLabels.reportTags),
		reportSensitiveInformation: yup.object().nullable().default({}), // null?
		authorizationGroups: yup.array().nullable().default([]),
	}).concat(Model.yupSchema)

	static yupWarningSchema = yup.object().shape({
		state: yup.string().nullable().default(''),
		tasks: yup.array().nullable()
			.when('state', (state, schema) => (
				(Report.isReleased(state) || Report.isCancelled(state))
					? schema.nullable()
					: schema.required(`You should provide the ${Settings.fields.task.longLabel} that have been addressed in this engagement.
						Either edit the report to do so, or you are acknowledging that this engagement did not address any ${Settings.fields.task.longLabel}`)
			)),
		reportSensitiveInformation: yup.object().nullable().default({}),
		authorizationGroups: yup.array().nullable()
			.when(['reportSensitiveInformation', 'reportSensitiveInformation.text'], (reportSensitiveInformation, reportSensitiveInformationText, schema) => (
				(_isEmpty(reportSensitiveInformation) || _isEmpty(reportSensitiveInformationText))
					? schema.nullable()
					: schema.required(`You should provide authorization groups who can access the sensitive information.
						If you do not do so, you will remain the only one authorized to see the sensitive information you have entered`)
			)),
	})

	constructor(props) {
		super(Model.fillObject(props, Report.yupSchema))
	}

	static isDraft(state) {
		return state === Report.STATE.DRAFT
	}

	isDraft() {
		return Report.isDraft(this.state)
	}

	static isPending(state) {
		return state === Report.STATE.PENDING_APPROVAL
	}

	isPending() {
		return Report.isPending(this.state)
	}

	static isReleased() {
		return this.state === Report.STATE.RELEASED
	}

	isReleased() {
		return Report.isReleased(this.state)
	}

	static isRejected(state) {
		return state === Report.STATE.REJECTED
	}

	isRejected() {
		return Report.isRejected(this.state)
	}

	static isCancelled() {
		return this.state === Report.STATE.CANCELLED
	}

	isCancelled() {
		return Report.isCancelled(this.state)
	}

	static isFuture(state) {
		return state === Report.STATE.FUTURE
	}

	isFuture() {
		return Report.isFuture(this.state)
	}

	showApprovals() {
		return this.state && !this.isDraft() && !this.isFuture()
	}

	toString() {
		return this.intent || 'None'
	}

	static checkPrimaryAttendee(attendees, role) {
		const primaryAttendee = Report.getPrimaryAttendee(attendees, role)
		const roleName = Person.humanNameOfRole(role)
		if (!primaryAttendee) {
			return `You must provide the primary ${roleName} for the Engagement`
		} else if (primaryAttendee.status !== Person.STATUS.ACTIVE) {
			return `The primary ${roleName} - ${primaryAttendee.name} - needs to have an active profile`
		} else if (primaryAttendee.endOfTourDate && moment(primaryAttendee.endOfTourDate).isBefore(moment().startOf('day'))) {
			return `The primary ${roleName}'s - ${primaryAttendee.name} - end of tour date has passed`
		} else if (!primaryAttendee.position) {
			return `The primary ${roleName} - ${primaryAttendee.name} - needs to be assigned to a position`
		} else if (primaryAttendee.position.status !== Position.STATUS.ACTIVE) {
			return `The primary ${roleName} - ${primaryAttendee.name} - needs to be in an active position`
		}
	}

	static getPrimaryAttendee(attendees, role) {
		return attendees.find( el =>
			el.role === role && el.primary
		)
	}

	getReportReleasedAt() {
		if (this.approvalStatus) {
			const approvalSteps = Object.assign([], this.approvalStatus)
			const lastApprovalStep = approvalSteps.pop()
			return !lastApprovalStep ? '' : lastApprovalStep.createdAt
		} else {
			return
		}
	}

	addAttendee(newAttendee) {
		if (!newAttendee || !newAttendee.uuid) {
			return
		}

		let attendees = this.attendees

		if (attendees.find(attendee => attendee.uuid === newAttendee.uuid)) {
			return
		}

		let person = new Person(newAttendee)
		person.primary = false

		if (!attendees.find(attendee => attendee.role === person.role && attendee.primary)) {
			person.primary = true
		}

		this.attendees.push(person)
		return true
	}

}
