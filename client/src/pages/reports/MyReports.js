import AppContext from "components/AppContext"
import Fieldset from "components/Fieldset"
import { AnchorNavItem } from "components/Nav"
import {
  getSearchQuery,
  mapDispatchToProps,
  propTypes as pagePropTypes
} from "components/Page"
import ReportCollection from "components/ReportCollection"
import SubNav from "components/SubNav"
import { Person, Report } from "models"
import PropTypes from "prop-types"
import React from "react"
import { Nav } from "react-bootstrap"
import { connect } from "react-redux"

const BaseMyReports = props => {
  const { searchQuery } = props
  const sectionQueryParams = {
    draft: {
      state: [Report.STATE.DRAFT, Report.STATE.REJECTED]
    },
    future: {
      state: [Report.STATE.FUTURE]
    },
    pending: {
      state: [Report.STATE.PENDING_APPROVAL]
    },
    approved: {
      state: [Report.STATE.APPROVED]
    },
    published: {
      state: [Report.STATE.PUBLISHED]
    },
    cancelled: {
      state: [Report.STATE.CANCELLED]
    }
  }
  Object.keys(sectionQueryParams).forEach(
    key => (sectionQueryParams[key].authorUuid = props.currentUser.uuid)
  )

  return (
    <div>
      <SubNav subnavElemId="reports-nav">
        <Nav>
          <AnchorNavItem to="draft-reports">Draft reports</AnchorNavItem>
          <AnchorNavItem to="upcoming-engagements">
            Upcoming Engagements
          </AnchorNavItem>
          <AnchorNavItem to="pending-approval">Pending approval</AnchorNavItem>
          <AnchorNavItem to="approved">Approved reports</AnchorNavItem>
          <AnchorNavItem to="published-reports">
            Published reports
          </AnchorNavItem>
          <AnchorNavItem to="cancelled-reports">
            Cancelled reports
          </AnchorNavItem>
        </Nav>
      </SubNav>

      {renderSection("Draft Reports", "draft-reports", "draft")}
      {renderSection("Upcoming Engagements", "upcoming-engagements", "future")}
      {renderSection("Pending Approval", "pending-approval", "pending")}
      {renderSection("Approved", "approved", "approved")}
      {renderSection("Published Reports", "published-reports", "published")}
      {renderSection("Cancelled Reports", "cancelled-reports", "cancelled")}
    </div>
  )

  function renderSection(title, id, section) {
    const queryParams = Object.assign(
      {},
      sectionQueryParams[section],
      getSearchQuery(searchQuery)
    )
    return (
      <Fieldset title={title} id={id}>
        <ReportCollection
          paginationKey={`r_${id}_${props.currentUser.uuid}`}
          queryParams={queryParams}
          mapId={id}
        />
      </Fieldset>
    )
  }
}

BaseMyReports.propTypes = {
  ...pagePropTypes,
  currentUser: PropTypes.instanceOf(Person)
}

const mapStateToProps = (state, ownProps) => ({
  searchQuery: state.searchQuery
})

const MyReports = props => (
  <AppContext.Consumer>
    {context => <BaseMyReports currentUser={context.currentUser} {...props} />}
  </AppContext.Consumer>
)

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MyReports)
