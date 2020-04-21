import API from "api"
import { gql } from "apollo-boost"
import Leaflet from "components/Leaflet"
import {
  mapPageDispatchersToProps,
  PageDispatchersPropType,
  useBoilerplate
} from "components/Page"
import _escape from "lodash/escape"
import { Location } from "models"
import PropTypes from "prop-types"
import React, { useEffect, useMemo } from "react"
import { connect } from "react-redux"
import ReactDOMServer from "react-dom/server"
import { Callout, Intent } from "@blueprintjs/core"
import Report from "../models/Report"

const GQL_GET_REPORT_LIST = gql`
  query($reportQuery: ReportSearchQueryInput) {
    reportList(query: $reportQuery) {
      pageNum
      pageSize
      totalCount
      list {
        uuid
        attendees {
          uuid
          name
          conflictedReports {
            uuid
            engagementDate
            duration
          }
        }
        intent
        location {
          uuid
          name
          lat
          lng
        }
        engagementDate
        duration
      }
    }
  }
`

const ReportMap = ({
  pageDispatchers,
  queryParams,
  setTotalCount,
  mapId,
  width,
  height,
  marginBottom
}) => {
  const reportQuery = Object.assign({}, queryParams, { pageSize: 0 })
  const { loading, error, data } = API.useApiQuery(GQL_GET_REPORT_LIST, {
    reportQuery
  })
  const { done, result } = useBoilerplate({
    loading,
    error,
    pageDispatchers
  })
  const markers = useMemo(() => {
    const reports = data ? data.reportList.list : []
    if (!reports.length) {
      return []
    }
    const markerArray = []
    reports.forEach(report => {
      if (Location.hasCoordinates(report.location)) {
        let label = _escape(report.intent || "<undefined>") // escape HTML in intent!
        label += `<br/>@ <b>${_escape(report.location.name)}</b>` // escape HTML in locationName!

        if (Report.hasPlanningConflicts(report)) {
          label += ReactDOMServer.renderToString(
            <Callout
              intent={Intent.WARNING}
              style={{ marginTop: "8px", fontSize: "1em" }}
            >
              This report has planning conflicts. Display report for further
              details.
            </Callout>
          )
        }

        markerArray.push({
          id: report.uuid,
          lat: report.location.lat,
          lng: report.location.lng,
          name: label
        })
      }
    })
    return markerArray
  }, [data])
  // Update the total count
  const totalCount = done ? null : data?.reportList?.totalCount
  useEffect(() => setTotalCount && setTotalCount(totalCount), [
    setTotalCount,
    totalCount
  ])
  if (done) {
    return result
  }

  return (
    <Leaflet
      markers={markers}
      mapId={mapId}
      width={width}
      height={height}
      marginBottom={marginBottom}
    />
  )
}

ReportMap.propTypes = {
  pageDispatchers: PageDispatchersPropType,
  queryParams: PropTypes.object,
  setTotalCount: PropTypes.func,
  mapId: PropTypes.string, // pass this when you have more than one map on a page
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  marginBottom: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
}

export default connect(null, mapPageDispatchersToProps)(ReportMap)
