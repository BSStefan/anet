import { Settings } from "api"
import AdvisorReportsModal from "components/AdvisorReports/AdvisorReportsModal"
import AdvisorReportsRow from "components/AdvisorReports/AdvisorReportsRow"
import AdvisorReportsTableHead from "components/AdvisorReports/AdvisorReportsTableHead"
import pluralize from "pluralize"
import PropTypes from "prop-types"
import React, { useState } from "react"
import { Table } from "react-bootstrap"
import "./OrganizationAdvisorsTable.css"

const OrganizationAdvisorsTable = props => {
  const [data, setData] = useState(props.data || [])
  const [selectedAll, setSelectedAll] = useState(false)
  const rows = createAdvisorReportsRows(data)
  const showRows = props.filterText ? search(rows, props.filterText) : rows

  return (
    <div className="organization-advisors-table">
      <Table striped bordered condensed hover responsive>
        <caption>
          Shows reports submitted and engagements attended per week by an
          organization's {pluralize(Settings.fields.advisor.person.name)}
        </caption>
        <AdvisorReportsTableHead
          columnGroups={props.columnGroups}
          title="Organization name"
          onSelectAllRows={handleSelectAllRows}
        />
        <tbody>{showRows}</tbody>
      </Table>
    </div>
  )

  function handleSelectRow(index) {
    const newData = data.slice()
    newData[index].selected = toggleRowSelection(index)
    setData(newData)
    handleSelectRowData(newData)
  }

  function handleSelectAllRows() {
    const toggleSelect = !selectedAll
    const rows = toggleSelectAllRows(toggleSelect)
    setData(rows)
    setSelectedAll(toggleSelect)
    handleSelectRowData(data)
  }

  function handleSelectRowData() {
    const selectedData = data.filter(row => {
      return row.selected
    })
    props.onRowSelection(selectedData)
  }

  function toggleRowSelection(index) {
    return !data[index].selected
  }

  function toggleSelectAllRows(selected) {
    const rows = data.slice()
    rows.forEach(item => {
      item.selected = selected
    })
    return rows
  }

  function search(rows, filterText) {
    const nothingFound = (
      <tr className="nothing-found">
        <td colSpan="8">No organizations found...</td>
      </tr>
    )
    const search = rows.filter(element => {
      const elemProps = element.props.row
      const orgName = elemProps.name.toLowerCase()
      return orgName.indexOf(filterText.toLowerCase()) !== -1
    })
    return search.length > 0 ? search : nothingFound
  }

  function createAdvisorReportsRows(data) {
    return data.map((organization, index) => {
      const checked =
        organization.selected === undefined ? false : organization.selected
      const modalLink = (
        <AdvisorReportsModal
          name={organization.name}
          uuid={organization.uuid}
          columnGroups={props.columnGroups}
        />
      )
      return (
        <AdvisorReportsRow
          link={modalLink}
          row={organization}
          columnGroups={props.columnGroups}
          checked={checked}
          withOrganizationLink
          onSelectRow={() => handleSelectRow(index)}
          key={index}
        />
      )
    })
  }
}

OrganizationAdvisorsTable.propTypes = {
  data: PropTypes.array,
  columnGroups: PropTypes.array.isRequired,
  filterText: PropTypes.string,
  onRowSelection: PropTypes.func
}
OrganizationAdvisorsTable.defaultProps = {
  data: []
}
export default OrganizationAdvisorsTable
