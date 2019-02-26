import PropTypes from 'prop-types'
import React from 'react'
import Page, {mapDispatchToProps, propTypes as pagePropTypes} from 'components/Page'
import ReportCollection from 'components/ReportCollection'
import GQL from 'graphqlapi'
import Fieldset from 'components/Fieldset'
import autobind from 'autobind-decorator'
import {Person, Report} from 'models'
import { Nav } from 'react-bootstrap'
import SubNav from 'components/SubNav'
import { AnchorNavItem } from 'components/Nav'

import AppContext from 'components/AppContext'
import { connect } from 'react-redux'

class BaseMyReports extends Page {

	static propTypes = {
		...pagePropTypes,
		currentUser: PropTypes.instanceOf(Person),
	}

	constructor(props) {
		super(props)

		this.state = {
			draft: null,
			future: null,
			pending: null,
			approved: null,
			published: null,
			cancelled: null
		}
		this.pageNums = {
			draft: 0,
			future: 0,
			pending: 0,
			approved: 0,
			published: 0,
			cancelled: 0
		}
		this.partFuncs = {
			draft: this.getPart.bind(this, 'draft', [Report.STATE.DRAFT, Report.STATE.REJECTED]),
			future: this.getPart.bind(this, 'future', [Report.STATE.FUTURE]),
			pending: this.getPart.bind(this, 'pending', [Report.STATE.PENDING_APPROVAL]),
			approved: this.getPart.bind(this, 'approved', [Report.STATE.APPROVED]),
			published: this.getPart.bind(this, 'published', [Report.STATE.PUBLISHED]),
			cancelled: this.getPart.bind(this, 'cancelled', [Report.STATE.CANCELLED])
		}
	}

	@autobind
	getPart(partName, state, authorUuid) {
		const queryConstPart = {
			pageSize: 10,
			pageNum: this.pageNums[partName],
			authorUuid: authorUuid,
			state: state
		}
		const query = Object.assign({}, this.getSearchQuery(), queryConstPart)
		return new GQL.Part(/* GraphQL */ `
			${partName}: reportList(query: $${partName}Query) {
				pageNum, pageSize, totalCount, list {
					${ReportCollection.GQL_REPORT_FIELDS}
				}
			}`).addVariable(partName + "Query", "ReportSearchQueryInput", query)
	}

	fetchData(props) {
		const { currentUser } = props
		if (!currentUser || !currentUser.uuid) {
			return
		}
		const authorUuid = currentUser.uuid
		let pending = this.partFuncs.pending(authorUuid)
		let approved = this.partFuncs.approved(authorUuid)
		let draft = this.partFuncs.draft(authorUuid)
		let future = this.partFuncs.future(authorUuid)
		let published = this.partFuncs.published(authorUuid)
		let cancelled = this.partFuncs.cancelled(authorUuid)

		return GQL.run([pending, approved, draft, future, published, cancelled]).then(data =>
			this.setState({
				pending: data.pending,
				approved: data.approved,
				draft: data.draft,
				future: data.future,
				published: data.published,
				cancelled: data.cancelled
			})
		)
	}

	render() {
		return <div>
			<SubNav subnavElemId="reports-nav">
				<Nav>
					<AnchorNavItem to="draft-reports">Draft reports</AnchorNavItem>
					<AnchorNavItem to="upcoming-engagements">Upcoming Engagements</AnchorNavItem>
					<AnchorNavItem to="pending-approval">Pending approval</AnchorNavItem>
					<AnchorNavItem to="approved">Approved reports</AnchorNavItem>
					<AnchorNavItem to="published-reports">Published reports</AnchorNavItem>
					<AnchorNavItem to="cancelled-reports">Cancelled reports</AnchorNavItem>
				</Nav>
			</SubNav>

			{this.renderSection('Draft Reports', this.state.draft, this.goToPage.bind(this, 'draft'), 'draft-reports')}
			{this.renderSection('Upcoming Engagements', this.state.future, this.goToPage.bind(this, 'future'), 'upcoming-engagements')}
			{this.renderSection("Pending Approval", this.state.pending, this.goToPage.bind(this, 'pending'), 'pending-approval')}
			{this.renderSection("Approved", this.state.approved, this.goToPage.bind(this, 'approved'), 'approved')}
			{this.renderSection("Published Reports", this.state.published, this.goToPage.bind(this, 'published'), 'published-reports')}
			{this.renderSection("Cancelled Reports", this.state.cancelled, this.goToPage.bind(this, 'cancelled'), 'cancelled-reports')}
		</div>
	}

	renderSection(title, reports, goToPage, id) {
		let content = <p>Loading...</p>
		if (reports && reports.list) {
			content = <ReportCollection paginatedReports={reports} goToPage={goToPage} mapId={id} />
		}

		return <Fieldset title={title} id={id}>
			{content}
		</Fieldset>
	}

	@autobind
	goToPage(section, pageNum) {
		this.pageNums[section] = pageNum
		const part = (this.partFuncs[section])(this.props.currentUser.uuid)
		GQL.run([part]).then( data => {
			let stateChange = {}
			stateChange[section] = data[section]
			console.log(stateChange)
			this.setState(stateChange)
		})
	}
}

const mapStateToProps = (state, ownProps) => ({
	searchQuery: state.searchQuery
})
const MyReports = (props) => (
	<AppContext.Consumer>
		{context =>
			<BaseMyReports currentUser={context.currentUser} {...props} />
		}
	</AppContext.Consumer>
)

export default connect(mapStateToProps, mapDispatchToProps)(MyReports)
