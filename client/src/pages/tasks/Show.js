import PropTypes from 'prop-types'
import React from 'react'
import Page, {mapDispatchToProps, propTypes as pagePropTypes} from 'components/Page'

import { Formik, Form, Field } from 'formik'
import * as FieldHelper from 'components/FieldHelper'

import Fieldset from 'components/Fieldset'
import Breadcrumbs from 'components/Breadcrumbs'
import LinkTo from 'components/LinkTo'
import Messages, {setMessages} from 'components/Messages'
import ReportCollection from 'components/ReportCollection'
import RelatedObjectNotes, {GRAPHQL_NOTES_FIELDS} from 'components/RelatedObjectNotes'
import DictionaryField from '../../HOC/DictionaryField'

import GQL from 'graphqlapi'
import {Person, Task} from 'models'
import * as TaskDefs from 'models/Task'

import moment from 'moment'

import AppContext from 'components/AppContext'
import { connect } from 'react-redux'

class BaseTaskShow extends Page {
	static propTypes = {
		...pagePropTypes,
		currentUser: PropTypes.instanceOf(Person),
	}

	static modelName = 'Task'

	TaskCustomFieldRef1 = DictionaryField(Field)
	TaskCustomField = DictionaryField(Field)
	PlannedCompletionField = DictionaryField(Field)
	ProjectedCompletionField = DictionaryField(Field)
	TaskCustomFieldEnum1 = DictionaryField(Field)
	TaskCustomFieldEnum2 = DictionaryField(Field)
	state = {
		task: new Task(),
		reportsPageNum: 0,
		success: null,
		error: null,
	}

	constructor(props) {
		super(props)
		setMessages(props, this.state)
	}

	fetchData(props) {
		const reportsQuery = new GQL.Part(/* GraphQL */`
			reports: reportList(query: $reportsQuery) {
				pageNum, pageSize, totalCount, list {
					${ReportCollection.GQL_REPORT_FIELDS}
				}
			}
		`).addVariable("reportsQuery", "ReportSearchQueryInput", {
			pageSize: 10,
			pageNum: this.state.reportsPageNum,
			taskUuid: props.match.params.uuid,
		})

		const taskQuery = new GQL.Part(/* GraphQL */`
			task(uuid:"${props.match.params.uuid}") {
				uuid, shortName, longName, status,
				customField, customFieldEnum1, customFieldEnum2,
				plannedCompletion, projectedCompletion,
				responsibleOrg { uuid, shortName, longName, identificationCode },
				customFieldRef1 { uuid, shortName, longName }
				${GRAPHQL_NOTES_FIELDS}
			}
		`)

		return GQL.run([reportsQuery, taskQuery]).then(data => {
			this.setState({
				task: new Task(data.task),
				reports: data.reports,
            })
        })
	}

	render() {
		const { task, reports } = this.state
		const { currentUser, ...myFormProps } = this.props

		// Admins can edit tasks, or super users if this task is assigned to their org.
		const canEdit = currentUser.isAdmin()

		return (
			<Formik
				enableReinitialize={true}
				initialValues={task}
				{...myFormProps}
			>
			{({
				values,
			}) => {
				const action = canEdit && <LinkTo task={task} edit button="primary">Edit</LinkTo>
				return <div>
					<RelatedObjectNotes notes={task.notes} relatedObject={task.uuid && {relatedObjectType: 'tasks', relatedObjectUuid: task.uuid}} />
					<Breadcrumbs items={[[`${TaskDefs.shortLabel} ${task.shortName}`, Task.pathFor(task)]]} />
					<Messages success={this.state.success} error={this.state.error} />
					<Form className="form-horizontal" method="post">
						<Fieldset title={`${TaskDefs.shortLabel} ${task.shortName}`} action={action} />
						<Fieldset>
							<Field
								name="shortName"
								label={TaskDefs.fieldLabels.shortName}
								component={FieldHelper.renderReadonlyField}
							/>

							<Field
								name="longName"
								label={TaskDefs.fieldLabels.longName}
								component={FieldHelper.renderReadonlyField}
							/>

							<Field
								name="status"
								component={FieldHelper.renderReadonlyField}
								humanValue={Task.humanNameOfStatus}
							/>

							<Field
								name="responsibleOrg"
								label={TaskDefs.fieldLabels.responsibleOrg}
								component={FieldHelper.renderReadonlyField}
								humanValue={task.responsibleOrg &&
									<LinkTo organization={task.responsibleOrg}>
										{task.responsibleOrg.shortName} {task.responsibleOrg.longName} {task.responsibleOrg.identificationCode}
									</LinkTo>
								}
							/>

							{TaskDefs.customFieldRef1 &&
								<this.TaskCustomFieldRef1
									dictProps={TaskDefs.customFieldRef1}
									name="customFieldRef1"
									component={FieldHelper.renderReadonlyField}
									humanValue={task.customFieldRef1 &&
										<LinkTo task={task.customFieldRef1}>
											{task.customFieldRef1.shortName} {task.customFieldRef1.longName}
										</LinkTo>
									}
								/>
							}

							<this.TaskCustomField
								dictProps={TaskDefs.customField}
								name="customField"
								component={FieldHelper.renderReadonlyField}
							/>

							{TaskDefs.plannedCompletion &&
								<this.PlannedCompletionField
									dictProps={TaskDefs.plannedCompletion}
									name="plannedCompletion"
									component={FieldHelper.renderReadonlyField}
									humanValue={task.plannedCompletion && moment(task.plannedCompletion).format('D MMM YYYY')}
								/>
							}

							{TaskDefs.projectedCompletion &&
								<this.ProjectedCompletionField
									dictProps={TaskDefs.projectedCompletion}
									name="projectedCompletion"
									component={FieldHelper.renderReadonlyField}
									humanValue={task.projectedCompletion && moment(task.projectedCompletion).format('D MMM YYYY')}
								/>
							}

							{TaskDefs.customFieldEnum1 &&
								<this.TaskCustomFieldEnum1
									dictProps={Object.without(TaskDefs.customFieldEnum1, 'enum')}
									name="customFieldEnum1"
									component={FieldHelper.renderReadonlyField}
								/>
							}

							{TaskDefs.customFieldEnum2 &&
								<this.TaskCustomFieldEnum2
									dictProps={Object.without(TaskDefs.customFieldEnum2, 'enum')}
									name="customFieldEnum2"
									component={FieldHelper.renderReadonlyField}
								/>
							}
						</Fieldset>
					</Form>

					<Fieldset title={`Reports for this ${TaskDefs.shortLabel}`}>
						<ReportCollection paginatedReports={reports} goToPage={this.goToReportsPage} />
					</Fieldset>
				</div>
			}}
			</Formik>
		)
	}

	goToReportsPage = (pageNum) => {
		this.setState({reportsPageNum: pageNum}, this.loadData)
	}
}

const TaskShow = (props) => (
	<AppContext.Consumer>
		{context =>
			<BaseTaskShow currentUser={context.currentUser} {...props} />
		}
	</AppContext.Consumer>
)

export default connect(null, mapDispatchToProps)(TaskShow)
