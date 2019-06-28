import PropTypes from "prop-types"
import LinkTo from "components/LinkTo"
import { Person } from "models"
import React, { Component } from "react"
import { Button, Label, Radio, Table } from "react-bootstrap"
import REMOVE_ICON from "resources/delete.png"
import "./AttendeesTable.css"

const RemoveIcon = () => (
  <img src={REMOVE_ICON} height={14} alt="Remove attendee" />
)

const RemoveButton = props => {
  const { title, handleOnClick } = props
  return (
    <Button bsStyle="link" title={title} onClick={handleOnClick}>
      <RemoveIcon />
    </Button>
  )
}
RemoveButton.propTypes = {
  title: PropTypes.string,
  handleOnClick: PropTypes.func
}

const AttendeeDividerRow = () => (
  <tr className="attendee-divider-row">
    <td colSpan={6}>
      <hr />
    </td>
  </tr>
)

const TableHeader = props => {
  const { showDelete, hide } = props
  return (
    <thead>
      <tr>
        <th className="col-xs-1" style={{ textAlign: "center" }}>
          {!hide && "Primary"}
        </th>
        <th className="col-xs-3">{!hide && "Name"}</th>
        <th className="col-xs-3">{!hide && "Position"}</th>
        <th className="col-xs-2">{!hide && "Location"}</th>
        <th className="col-xs-2">{!hide && "Organization"}</th>
        {showDelete && <th className="col-xs-1" />}
      </tr>
    </thead>
  )
}
TableHeader.propTypes = {
  showDelete: PropTypes.bool,
  hide: PropTypes.bool
}

const TableBody = props => {
  const { attendees, handleAttendeeRow, role, enableDivider } = props
  return (
    <tbody>
      {enableDivider && <AttendeeDividerRow />}
      {Person.map(attendees.filter(p => p.role === role), person =>
        handleAttendeeRow(person)
      )}
    </tbody>
  )
}
TableBody.propTypes = {
  attendees: PropTypes.array,
  handleAttendeeRow: PropTypes.func,
  role: PropTypes.string,
  enableDivider: PropTypes.bool
}

const TableContainer = props => {
  const { className, children } = props
  return (
    <Table striped condensed hover responsive className={className}>
      {children}
    </Table>
  )
}
TableContainer.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
}

const RadioButton = props => {
  const { person, disabled, handleOnChange } = props
  return (
    <Radio
      name={`primaryAttendee${person.role}`}
      className="primary"
      checked={person.primary}
      disabled={disabled}
      onChange={() => !disabled && handleOnChange(person)}
    >
      {person.primary && <Label bsStyle="primary">Primary</Label>}
    </Radio>
  )
}
RadioButton.propTypes = {
  person: PropTypes.object,
  disabled: PropTypes.bool,
  handleOnChange: PropTypes.func
}

export default class AttendeesTable extends Component {
  static propTypes = {
    attendees: PropTypes.array,
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
    showDelete: PropTypes.bool,
    onDelete: PropTypes.func
  }

  render() {
    const { attendees } = this.props
    return (
      <div id="attendeesContainer">
        <TableContainer className="advisorAttendeesTable">
          <TableHeader showDelete={this.props.showDelete} />
          <TableBody
            attendees={attendees}
            role={Person.ROLE.ADVISOR}
            handleAttendeeRow={this.renderAttendeeRow}
          />
        </TableContainer>
        <TableContainer className="principalAttendeesTable">
          <TableHeader hide />
          <TableBody
            attendees={attendees}
            role={Person.ROLE.PRINCIPAL}
            handleAttendeeRow={this.renderAttendeeRow}
            enableDivider
          />
        </TableContainer>
      </div>
    )
  }

  renderAttendeeRow = person => {
    const { disabled, showDelete, onDelete } = this.props
    return (
      <tr key={person.uuid}>
        <td className="primary-attendee">
          <RadioButton
            person={person}
            handleOnChange={this.setPrimaryAttendee}
            disabled={disabled}
          />
        </td>
        <td>
          <LinkTo person={person} />
        </td>
        <td>
          <LinkTo position={person.position} />
          {person.position && person.position.code
            ? `, ${person.position.code}`
            : ""}
        </td>
        <td>
          <LinkTo
            whenUnspecified=""
            anetLocation={person.position && person.position.location}
          />
        </td>
        <td>
          <LinkTo
            whenUnspecified=""
            organization={person.position && person.position.organization}
          />{" "}
        </td>
        {showDelete && (
          <td>
            <RemoveButton
              title="Remove attendee"
              handleOnClick={() => onDelete(person)}
            />
          </td>
        )}
      </tr>
    )
  }

  setPrimaryAttendee = person => {
    this.props.attendees.forEach(attendee => {
      if (Person.isEqual(attendee, person)) {
        attendee.primary = true
      } else if (attendee.role === person.role) {
        attendee.primary = false
      }
    })
    this.props.onChange(this.props.attendees)
  }
}
