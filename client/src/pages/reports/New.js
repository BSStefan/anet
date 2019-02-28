import PropTypes from 'prop-types'
import React from 'react'
import Page, {mapDispatchToProps, propTypes as pagePropTypes} from 'components/Page'

import ReportForm from './Form'

import GuidedTour from 'components/GuidedTour'
import {reportTour} from 'pages/HopscotchTour'

import {Person, Report} from 'models'

import AppContext from 'components/AppContext'
import { PAGE_PROPS_NO_NAV } from 'actions'
import { connect } from 'react-redux'

class BaseReportNew extends Page {

	static propTypes = {
		...pagePropTypes,
		currentUser: PropTypes.instanceOf(Person),
	}

	constructor(props) {
		super(props, PAGE_PROPS_NO_NAV)
		this.report = new Report()
		if (props.currentUser && props.currentUser.uuid) {
			let person = new Person(props.currentUser)
			person.primary = true
			this.report.attendees.push(person)
		}
	}

	render() {
		return (
			<div className="report-new">
				<div className="pull-right">
					<GuidedTour
						title="Take a guided tour of the report page."
						tour={reportTour}
						autostart={localStorage.newUser === 'true' && localStorage.hasSeenReportTour !== 'true'}
						onEnd={() => localStorage.hasSeenReportTour = 'true'}
					/>
				</div>

				<ReportForm initialValues={this.report} title='Create a new Report' />
		</div>
		)
	}
}

const ReportNew = (props) => (
	<AppContext.Consumer>
		{context =>
			<BaseReportNew currentUser={context.currentUser} {...props} />
		}
	</AppContext.Consumer>
)

export default connect(null, mapDispatchToProps)(ReportNew)
