import API from "api"
import { gql } from "apollo-boost"
import autobind from "autobind-decorator"
import { PersonSimpleOverlayRow } from "components/advancedSelectWidget/AdvancedSelectOverlayRow"
import AdvancedSingleSelect from "components/advancedSelectWidget/AdvancedSingleSelect"
import LinkTo from "components/LinkTo"
import Messages from "components/Messages"
import _isEmpty from "lodash/isEmpty"
import { Person, Position } from "models"
import PropTypes from "prop-types"
import React, { Component } from "react"
import { Button, Col, Grid, Modal, Row, Table } from "react-bootstrap"
import PEOPLE_ICON from "resources/people.png"

const GQL_DELETE_PERSON_FROM_POSITION = gql`
  mutation($uuid: String!) {
    deletePersonFromPosition(uuid: $uuid)
  }
`
const GQL_PUT_PERSON_IN_POSITION = gql`
  mutation($uuid: String!, $person: PersonInput!) {
    putPersonInPosition(uuid: $uuid, person: $person)
  }
`

export default class AssignPersonModal extends Component {
  static propTypes = {
    position: PropTypes.instanceOf(Position).isRequired,
    showModal: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props)
    this.state = {
      error: null,
      person: props.position && props.position.person
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.position.person !== this.props.position.person) {
      this.setState({ person: this.props.position.person }, () =>
        this.updateAlert()
      )
    }
  }

  render() {
    const { position } = this.props
    const newPerson = this.state.person

    const personSearchQuery = {
      status: [Person.STATUS.ACTIVE]
    }
    if (position.type === Position.TYPE.PRINCIPAL) {
      personSearchQuery.role = Person.ROLE.PRINCIPAL
    } else {
      personSearchQuery.role = Person.ROLE.ADVISOR
    }
    const personFilters = {
      allPersons: {
        label: "All",
        queryVars: personSearchQuery
      }
    }
    return (
      <Modal show={this.props.showModal} onHide={this.close}>
        <Modal.Header closeButton>
          <Modal.Title>
            Set Person for <LinkTo position={position} isLink={false} />
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {position.person.uuid && (
            <div style={{ textAlign: "center" }}>
              <Button bsStyle="danger" onClick={this.remove}>
                Remove <LinkTo person={position.person} isLink={false} /> from{" "}
                <LinkTo position={position} isLink={false} />
              </Button>
              <hr className="assignModalSplit" />
            </div>
          )}
          <Grid fluid>
            <Row>
              <Col md={12}>
                <AdvancedSingleSelect
                  fieldName="person"
                  fieldLabel="Select a person"
                  placeholder="Select a person for this position"
                  value={this.state.person}
                  overlayColumns={["Name"]}
                  overlayRenderRow={PersonSimpleOverlayRow}
                  filterDefs={personFilters}
                  onChange={this.handleChangePerson}
                  objectType={Person}
                  valueKey="name"
                  fields="uuid, name, rank, role, avatar(size: 32), position { uuid, name, type }"
                  addon={PEOPLE_ICON}
                  vertical
                />
              </Col>
            </Row>
            {newPerson && newPerson.uuid && (
              <Table striped condensed hover responsive>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Current Position</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{newPerson.rank}</td>
                    <td>{newPerson.name}</td>
                    <td>
                      {newPerson.position ? (
                        newPerson.position.name
                      ) : newPerson.uuid === position.person.uuid ? (
                        position.name
                      ) : (
                        <i>None</i>
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
            )}
            <Messages error={this.state.error} />
          </Grid>
        </Modal.Body>
        <Modal.Footer>
          <Button className="pull-left" onClick={this.close}>
            Cancel
          </Button>
          <Button onClick={this.save} bsStyle="primary" className="save-button">
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }

  @autobind
  remove() {
    this.setState({ person: null }, () => this.save())
  }

  @autobind
  save() {
    let graphql, variables
    if (this.state.person === null) {
      graphql = GQL_DELETE_PERSON_FROM_POSITION
      variables = {
        uuid: this.props.position.uuid
      }
    } else {
      graphql = GQL_PUT_PERSON_IN_POSITION
      variables = {
        uuid: this.props.position.uuid,
        person: { uuid: this.state.person.uuid }
      }
    }
    API.mutation(graphql, variables)
      .then(data => this.props.onSuccess())
      .catch(error => {
        this.setState({ error: error })
      })
  }

  @autobind
  close() {
    // Reset state before closing (cancel)
    this.setState({ person: this.props.position.person }, () =>
      this.updateAlert()
    )
    this.props.onCancel()
  }

  @autobind
  handleChangePerson(person) {
    this.setState({ person }, () => this.updateAlert())
  }

  @autobind
  updateAlert() {
    let error = null
    if (
      !_isEmpty(this.state.person) &&
      !_isEmpty(this.state.person.position) &&
      this.state.person.position.uuid !== this.props.position.uuid
    ) {
      const errorMessage = (
        <>
          This person is currently in another position. By selecting this
          person, <b>{this.state.person.position.name}</b> will be left
          unfilled.
        </>
      )
      error = { message: errorMessage }
    }
    this.setState({ error: error })
  }
}
