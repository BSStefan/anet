import PropTypes from 'prop-types'
import React from 'react'
import autobind from 'autobind-decorator'

import {Button} from 'react-bootstrap'
import DatePicker from 'react-bootstrap-date-picker'

import ValidatableFormWrapper from 'components/ValidatableFormWrapper'
import Fieldset from 'components/Fieldset'
import Autocomplete from 'components/Autocomplete'
import Form from 'components/Form'
import History from 'components/History'
import Messages from'components/Messages'
import ButtonToggleGroup from 'components/ButtonToggleGroup'
import DictionaryField from '../../HOC/DictionaryField'

import Settings from 'Settings'
import API from 'api'
import {Task, Position, Organization} from 'models'

import CALENDAR_ICON from 'resources/calendar.png'

const customEnumButtons = (list) => {
	let buttons = []
	for (const key in list) {
		if (list.hasOwnProperty(key)) {
			let value = list[key]
			buttons.push(<Button id="statusActiveButton" key={key} value={key}>{value}</Button>)
		}
	  }
    return buttons
}

export default class TaskForm extends ValidatableFormWrapper {
	static propTypes = {
		task: PropTypes.object.isRequired,
		edit: PropTypes.bool,
	}

	static contextTypes = {
		app: PropTypes.object.isRequired,
	}

	constructor(props) {
		super(props)
		this.TaskCustomField = DictionaryField(Form.Field)
		this.PlannedCompletionField = DictionaryField(Form.Field)
		this.ProjectedCompletionField = DictionaryField(Form.Field)
		this.TaskCustomFieldEnum1 = DictionaryField(Form.Field)
		this.TaskCustomFieldEnum2 = DictionaryField(Form.Field)
	}

	render() {
		const {task, edit} = this.props
		const {currentUser} = this.context.app.state
		const taskShortLabel = Settings.fields.task.shortLabel
		const customFieldEnum1 = Settings.fields.task.customFieldEnum1
		const customFieldEnum2 = Settings.fields.task.customFieldEnum2
		const plannedCompletion = Settings.fields.task.plannedCompletion
		const projectedCompletion = Settings.fields.task.projectedCompletion
		const orgSearchQuery = {status: Organization.STATUS.ACTIVE}

		orgSearchQuery.type = Organization.TYPE.ADVISOR_ORG
		if (currentUser && currentUser.position && currentUser.position.type === Position.TYPE.SUPER_USER) {
			orgSearchQuery.parentOrgId = currentUser.position.organization.id
			orgSearchQuery.parentOrgRecursively = true
		}
		const {ValidatableForm, RequiredField} = this
		return (
			<div>
				<Messages error={this.state.error} success={this.state.success} />

				<ValidatableForm
					formFor={task}
					onChange={this.onChange}
					onSubmit={this.onSubmit}
					submitText={`Save ${taskShortLabel}`}
					horizontal>

					<Fieldset title={edit ?
						`Edit ${taskShortLabel} ${task.shortName}`
						:
						`Create a new ${taskShortLabel}`
					}>
						<RequiredField id="shortName" label={`${taskShortLabel} number`} />
						<RequiredField id="longName" label={`${taskShortLabel} description`} />

						<RequiredField id="status" >
							<ButtonToggleGroup>
								<Button id="statusActiveButton" value={ Task.STATUS.ACTIVE }>Active</Button>
								<Button id="statusInactiveButton" value={ Task.STATUS.INACTIVE }>Inactive</Button>
							</ButtonToggleGroup>
						</RequiredField>

						<Form.Field id="responsibleOrg" label="Responsible organization">
							<Autocomplete valueKey="shortName"
								placeholder={`Select a responsible organization for this ${taskShortLabel}`}
								url="/api/organizations/search"
								queryParams={orgSearchQuery}
							/>
						</Form.Field>

						<Form.Field id="parentTask" label="Parent task">
							<Autocomplete valueKey="shortName"
								placeholder="Start typing to search for a higher level task..."
								url="/api/tasks/search"
								queryParams={{}}
							/>
						</Form.Field>

						<this.TaskCustomField dictProps={Settings.fields.task.customField} id="customField"/>

						{plannedCompletion &&
							<this.PlannedCompletionField dictProps={plannedCompletion} id="plannedCompletion" addon={CALENDAR_ICON}>
								<DatePicker showTodayButton placeholder={plannedCompletion.placeholder} dateFormat="DD/MM/YYYY" showClearButton={false} />
							</this.PlannedCompletionField>
						}

						{projectedCompletion &&
							<this.ProjectedCompletionField dictProps={projectedCompletion} id="projectedCompletion" addon={CALENDAR_ICON}>
								<DatePicker showTodayButton placeholder={projectedCompletion.placeholder} dateFormat="DD/MM/YYYY" showClearButton={false} />
							</this.ProjectedCompletionField>
						}

						{customFieldEnum1 &&
							<this.TaskCustomFieldEnum1  dictProps={Object.without(customFieldEnum1, 'enum')} id="customFieldEnum1">
								<ButtonToggleGroup>
									{customEnumButtons(customFieldEnum1.enum)}
								</ButtonToggleGroup>
							</this.TaskCustomFieldEnum1>
						}

						{customFieldEnum2 &&
							<this.TaskCustomFieldEnum2  dictProps={Object.without(customFieldEnum2, 'enum')} id="customFieldEnum2">
								<ButtonToggleGroup>
									{customEnumButtons(customFieldEnum2.enum)}
								</ButtonToggleGroup>
							</this.TaskCustomFieldEnum2>
						}

						</Fieldset>
				</ValidatableForm>
			</div>
		)
	}

	@autobind
	onChange() {
		this.forceUpdate()
	}

	@autobind
	onSubmit(event) {
		let {task, edit} = this.props
		if (task.responsibleOrg && task.responsibleOrg.id) {
			task.responsibleOrg = {id: task.responsibleOrg.id}
		}
		if (task.parentTask && task.parentTask.id) {
			task.parentTask = {id: task.parentTask.id}
		}

		let url = `/api/tasks/${edit ? 'update' : 'new'}`
		API.send(url, task, {disableSubmits: true})
			.then(response => {
				if (response.code) {
					throw response.code
				}

				if (response.id) {
					task.id = response.id
				}

				History.replace(Task.pathForEdit(task), false)
				History.push(Task.pathFor(task), {success: 'Saved successfully', skipPageLeaveWarning: true})
			}).catch(error => {
				this.setState({error: error})
				window.scrollTo(0, 0)
			})
	}
}
