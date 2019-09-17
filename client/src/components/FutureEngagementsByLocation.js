import { IconNames } from "@blueprintjs/icons"
import API, { Settings } from "api"
import { gql } from "apollo-boost"
import HorizontalBarChart from "components/HorizontalBarChart"
import MosaicLayout from "components/MosaicLayout"
import { useBoilerplate } from "components/Page"
import ReportCollection, {
  FORMAT_MAP,
  FORMAT_SUMMARY,
  FORMAT_TABLE,
  FORMAT_CALENDAR
} from "components/ReportCollection"
import * as d3 from "d3"
import _isEqual from "lodash/isEqual"
import moment from "moment"
import PropTypes from "prop-types"
import React, { useState } from "react"
import { Overlay, Popover } from "react-bootstrap"
import ContainerDimensions from "react-container-dimensions"

const GQL_GET_REPORT_LIST = gql`
  query($reportQuery: ReportSearchQueryInput) {
    reportList(query: $reportQuery) {
      totalCount
      list {
        uuid
        engagementDate
        location {
          uuid
          name
        }
      }
    }
  }
`

const ChartPopover = props => {
  const { graphPopover, hoveredBar, graphData } = props
  if (!graphPopover || !hoveredBar) {
    return null
  }

  return (
    <Overlay
      show
      placement="top"
      container={document.body}
      animation={false}
      target={() => graphPopover}
    >
      <Popover
        id="graph-popover"
        title={hoveredBar && graphData.categoryLabels[hoveredBar.parentKey]}
      >
        <p style={{ textAlign: "center" }}>
          {hoveredBar &&
            `${graphData.leavesLabels[hoveredBar.key]}: ${hoveredBar.value}`}
        </p>
      </Popover>
    </Overlay>
  )
}

ChartPopover.propTypes = {
  graphPopover: PropTypes.object,
  hoveredBar: PropTypes.object,
  graphData: PropTypes.object
}

const Chart = props => {
  const {
    chartId,
    queryParams,
    focusedSelection,
    goToSelection,
    selectedBarClass
  } = props
  const [popover, setPopover] = useState({
    graphPopover: null,
    hoveredBar: null
  })
  const reportQuery = Object.assign({}, queryParams, { pageSize: 0 })
  const { loading, error, data } = API.useApiQuery(GQL_GET_REPORT_LIST, {
    reportQuery
  })
  const { done, result } = useBoilerplate({
    loading,
    error,
    ...props
  })
  if (done) {
    return result
  }

  let graphData = {}
  if (data) {
    const noLocation = {
      uuid: "-1",
      name: "No location allocated"
    }
    let reportsList = data.reportList.list || []
    if (reportsList.length) {
      reportsList = reportsList.map(d => {
        if (!d.location) d.location = noLocation
        return d
      })
      // add days without data as we want to display them in the chart
      let allCategories = getEngagementDateRangeArray().map(function(d) {
        return {
          key: d.valueOf(),
          values: [{}]
        }
      })
      let categoriesWithData = d3
        .nest()
        .key(function(d) {
          return moment(d.engagementDate)
            .startOf("day")
            .valueOf()
        })
        .key(function(d) {
          return d.location.uuid
        })
        .rollup(function(leaves) {
          return leaves.length
        })
        .entries(reportsList)
      let groupedData = allCategories.map(d => {
        let categData = categoriesWithData.find(x => {
          return Number(x.key) === d.key
        })
        return Object.assign({}, d, categData)
      })
      graphData.data = groupedData
      graphData.categoryLabels = allCategories.reduce(function(prev, curr) {
        prev[curr.key] = moment(curr.key).format(
          Settings.dateFormats.forms.displayShort.date
        )
        return prev
      }, {})
      graphData.leavesLabels = reportsList.reduce(function(prev, curr) {
        prev[curr.location.uuid] = curr.location.name
        return prev
      }, {})
    }
  }

  return (
    <div className="scrollable-y">
      <ContainerDimensions>
        {({ width }) => (
          <HorizontalBarChart
            width={width}
            chartId={chartId}
            data={graphData}
            onBarClick={goToSelection}
            showPopover={showPopover}
            hidePopover={hidePopover}
            selectedBarClass={selectedBarClass}
            selectedBar={
              focusedSelection
                ? "bar_" + focusedSelection.key + focusedSelection.parentKey
                : ""
            }
          />
        )}
      </ContainerDimensions>

      <ChartPopover {...popover} graphData={graphData} />
    </div>
  )

  function showPopover(g, h) {
    if (g && popover.graphPopover && _isEqual(g.id, popover.graphPopover.id)) {
      // Same graphPopover already set, but prevent state update
      // (because e.g. target.ownerDocument.lastModified will have changed)
      return
    }
    setPopover({ graphPopover: g, hoveredBar: h })
  }

  function hidePopover() {
    setPopover({ graphPopover: null, hoveredBar: null })
  }

  function getEngagementDateRangeArray() {
    let dateArray = []
    let currentDate = moment(queryParams.engagementDateStart).clone()
    let endDate = moment(queryParams.engagementDateEnd)
    while (currentDate <= endDate) {
      dateArray.push(currentDate.clone())
      currentDate = currentDate.add(1, "days")
    }
    return dateArray
  }
}

Chart.propTypes = {
  chartId: PropTypes.string,
  queryParams: PropTypes.object,
  focusedSelection: PropTypes.object,
  goToSelection: PropTypes.func,
  selectedBarClass: PropTypes.string
}

const Collection = props => {
  const { id, queryParams } = props

  return (
    <div className="scrollable">
      <ReportCollection
        paginationKey={`r_${id}`}
        queryParams={queryParams}
        viewFormats={[FORMAT_CALENDAR, FORMAT_TABLE, FORMAT_SUMMARY]}
      />
    </div>
  )
}

Collection.propTypes = {
  id: PropTypes.string,
  queryParams: PropTypes.object
}

const Map = props => {
  const { queryParams } = props

  return (
    <div className="non-scrollable">
      <ContainerDimensions>
        {({ width, height }) => (
          <ReportCollection
            queryParams={queryParams}
            width={width}
            height={height}
            marginBottom={0}
            viewFormats={[FORMAT_MAP]}
          />
        )}
      </ContainerDimensions>
    </div>
  )
}

Map.propTypes = {
  queryParams: PropTypes.object
}

/*
 * Component displaying a chart with number of future engagements per date and
 * location. Locations are grouped per date.
 */
const FutureEngagementsByLocation = props => {
  const { queryParams, style } = props
  const [focusedSelection, setFocusedSelection] = useState(null)

  const chartId = "future_engagements_by_location"
  const selectedBarClass = "selected-bar"
  const VISUALIZATIONS = [
    {
      id: "febl-chart",
      icons: [IconNames.HORIZONTAL_BAR_CHART],
      title: "Chart by date and location",
      renderer: getChart
    },
    {
      id: "febl-collection",
      icons: [IconNames.PANEL_TABLE],
      title: "Reports by date and location",
      renderer: getReportCollection
    },
    {
      id: "febl-map",
      icons: [IconNames.MAP],
      title: "Map by date and location",
      renderer: getReportMap
    }
  ]
  const INITIAL_LAYOUT = {
    direction: "column",
    first: {
      direction: "row",
      first: VISUALIZATIONS[0].id,
      second: VISUALIZATIONS[1].id
    },
    second: VISUALIZATIONS[2].id
  }
  const DESCRIPTION = `The engagements are grouped first by date and within the date per location.
    In order to see the list of engagements for a date and location,
    click on the bar corresponding to the date and location.`

  return (
    <MosaicLayout
      style={style}
      visualizations={VISUALIZATIONS}
      initialNode={INITIAL_LAYOUT}
      description={DESCRIPTION}
    />
  )

  function getChart(id) {
    return (
      <Chart
        chartId={chartId}
        queryParams={queryParams}
        focusedSelection={focusedSelection}
        goToSelection={goToSelection}
        selectedBarClass={selectedBarClass}
      />
    )
  }

  function getReportCollection(id) {
    return <Collection queryParams={getQueryParams()} />
  }

  function getReportMap(id) {
    return <Map queryParams={getQueryParams()} />
  }

  function getQueryParams() {
    const sqParams = Object.assign({}, queryParams)
    if (focusedSelection) {
      Object.assign(sqParams, getAdditionalReportParams())
    }
    return sqParams
  }

  function goToSelection(item) {
    updateHighlight(null, true)
    if (!item || _isEqual(item, focusedSelection)) {
      setFocusedSelection(null)
    } else {
      setFocusedSelection(item)
      updateHighlight(item, false)
    }
  }

  function updateHighlight(item, clear) {
    const focusedSelectionId = item ? item.key + item.parentKey : ""
    if (clear) {
      // remove highlighting of the bars
      d3.selectAll("#" + chartId + " rect").classed(selectedBarClass, false)
    } else if (focusedSelectionId) {
      // highlight the bar corresponding to the selected day of the week
      d3.select("#" + chartId + " #bar_" + focusedSelectionId).classed(
        selectedBarClass,
        true
      )
    }
  }

  function getAdditionalReportParams() {
    const focusedDate = focusedSelection
      ? parseInt(focusedSelection.parentKey, 10)
      : ""
    const focusedLocation = focusedSelection ? focusedSelection.key : ""
    return {
      // Use here the start and end of a date in order to make sure the
      // fetch is independent of the engagementDate time value
      engagementDateStart: moment(focusedDate)
        .startOf("day")
        .valueOf(),
      engagementDateEnd: moment(focusedDate)
        .endOf("day")
        .valueOf(),
      locationUuid: focusedLocation
    }
  }
}

FutureEngagementsByLocation.propTypes = {
  queryParams: PropTypes.object,
  style: PropTypes.object
}

export default FutureEngagementsByLocation
