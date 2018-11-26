import PropTypes from 'prop-types'
import React from 'react'
import Page, {mapDispatchToProps, propTypes as pagePropTypes} from 'components/Page'

import { Formik, Form, Field } from 'formik'
import * as FieldHelper from 'components/FieldHelper'

import Fieldset from 'components/Fieldset'
import Breadcrumbs from 'components/Breadcrumbs'
import Messages, {setMessages} from 'components/Messages'
import Leaflet from 'components/Leaflet'
import LinkTo from 'components/LinkTo'
import ReportCollection from 'components/ReportCollection'

import GQL from 'graphqlapi'
import {Location, Person} from 'models'

import AppContext from 'components/AppContext'
import { connect } from 'react-redux'

class BaseLocationShow extends Page {

	static propTypes = {
		...pagePropTypes,
		currentUser: PropTypes.instanceOf(Person),
	}

	state = {
		location: new Location(),
		reportsPageNum: 0,
		success: null,
		error: null,
	}

	constructor(props) {
		super(props)
		setMessages(props,this.state)
	}

	fetchData(props) {
		let reportsQuery = new GQL.Part(/* GraphQL */`
			reports: reportList(query: $reportsQuery) {
				pageNum, pageSize, totalCount, list {
					${ReportCollection.GQL_REPORT_FIELDS}
				}
			}
		`).addVariable("reportsQuery", "ReportSearchQueryInput", {
			pageSize: 10,
			pageNum: this.state.reportsPageNum,
			locationUuid: props.match.params.uuid,
		})

		let locationQuery = new GQL.Part(/* GraphQL */`
			location(uuid:"${props.match.params.uuid}") {
				uuid, name, lat, lng, status
			}
		`)

		return GQL.run([reportsQuery, locationQuery]).then(data => {
            this.setState({
                location: new Location(data.location),
				reports: data.reports,
            })
        })
	}

	render() {
		const { location, reports } = this.state
		const { currentUser, ...myFormProps } = this.props

		const canEdit = currentUser.isSuperUser()

		function Coordinate(props) {
			const coord = typeof props.coord === 'number' ? Math.round(props.coord * 1000) / 1000 : '?'
			return <span>{coord}</span>
		}

		return (
			<Formik
				enableReinitialize={true}
				initialValues={location}
				{...myFormProps}
			>
			{({
				values,
			}) => {
				const marker = {
					id: values.uuid || 0,
					name: values.name || '',
				}
				if (Location.hasCoordinates(values)) {
					Object.assign(marker, {
						lat: values.lat,
						lng: values.lng,
					})
				}
				const action = canEdit && <LinkTo anetLocation={location} edit button="primary">Edit</LinkTo>
				return <div>
					<Breadcrumbs items={[[`Location ${location.name}`, Location.pathFor(location)]]} />
					<Messages success={this.state.success} error={this.state.error} />
					<Form className="form-horizontal" method="post">
						<Fieldset title={`Location ${location.name}`} action={action} />
						<Fieldset>
							<Field
								name="name"
								component={FieldHelper.renderReadonlyField}
							/>

							<Field
								name="status"
								component={FieldHelper.renderReadonlyField}
							/>

							<Field
								name="location"
								component={FieldHelper.renderReadonlyField}
								humanValue={
									<React.Fragment>
										<Coordinate coord={values.lat} />, <Coordinate coord={values.lng} />
									</React.Fragment>
								}
							/>
						</Fieldset>

						<Leaflet markers={[marker]} />
					</Form>

					<Fieldset title={`Reports at this Location`}>
						<ReportCollection paginatedReports={reports} goToPage={this.goToReportsPage} mapId="reports" />
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

const LocationShow = (props) => (
	<AppContext.Consumer>
		{context =>
			<BaseLocationShow currentUser={context.currentUser} {...props} />
		}
	</AppContext.Consumer>
)

export default connect(null, mapDispatchToProps)(LocationShow)
