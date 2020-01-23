import { Settings } from "api"
import LinkTo from "components/LinkTo"
import _get from "lodash/get"
import { Task } from "models"
import PropTypes from "prop-types"
import React from "react"
import { Table } from "react-bootstrap"
import REMOVE_ICON from "resources/delete.png"

const TaskTable = ({ id, tasks, showOrganization, showDelete, onDelete }) => {
  const tasksExist = _get(tasks, "length", 0) > 0

  return (
    <div id={id}>
      {tasksExist ? (
        <div>
          <Table striped condensed hover responsive className="tasks_table">
            <thead>
              <tr>
                <th>Name</th>
                {showOrganization && <th>Tasked organizations</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {Task.map(tasks, task => (
                <tr key={task.uuid}>
                  <td className="taskName">
                    <LinkTo task={task}>
                      {task.shortName} - {task.longName}
                    </LinkTo>
                  </td>
                  {showOrganization && (
                    <td className="taskOrg">
                      {task.taskedOrganizations.map(org => (
                        <LinkTo
                          organization={org}
                          key={`${task.uuid}-${org.uuid}`}
                        />
                      ))}
                    </td>
                  )}
                  {showDelete && (
                    <td
                      onClick={() => onDelete(task)}
                      id={"taskDelete_" + task.uuid}
                    >
                      <span style={{ cursor: "pointer" }}>
                        <img
                          src={REMOVE_ICON}
                          height={14}
                          alt={`Remove ${Settings.fields.task.shortLabel}`}
                        />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>

          {tasks.length === 0 && (
            <p style={{ textAlign: "center" }}>
              <em>No {Settings.fields.task.shortLabel} selected.</em>
            </p>
          )}
        </div>
      ) : (
        <em>No tasks found</em>
      )}
    </div>
  )
}

TaskTable.propTypes = {
  id: PropTypes.string,
  tasks: PropTypes.array,
  showDelete: PropTypes.bool,
  onDelete: PropTypes.func,
  showOrganization: PropTypes.bool
}

TaskTable.defaultProps = {
  showDelete: false,
  showOrganization: false
}

export default TaskTable
