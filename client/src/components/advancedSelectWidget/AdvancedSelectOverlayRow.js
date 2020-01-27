import React from "react"
import LinkTo from "components/LinkTo"
import { Settings } from "api"
import moment from "moment"

export const AuthorizationGroupOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>{item.name}</td>
    <td>{item.description}</td>
  </React.Fragment>
)

export const LocationOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo anetLocation={item} isLink={false} />
    </td>
  </React.Fragment>
)

export const OrganizationOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td className="orgShortName">
      <span>
        {item.shortName} - {item.longName} {item.identificationCode}
      </span>
    </td>
  </React.Fragment>
)

export const TaskSimpleOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td className="taskName">
      <span>
        {item.shortName} - {item.longName}
      </span>
    </td>
  </React.Fragment>
)

export const TaskDetailedOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td className="taskName">
      <span>
        {item.shortName} - {item.longName}
      </span>
    </td>
    <td className="taskOrg">
      {item.taskedOrganizations.map(org => (
        <LinkTo
          organization={org}
          isLink={false}
          key={`${item.uuid}-${org.uuid}`}
          style={{ paddingRight: 5 }}
        />
      ))}
    </td>
  </React.Fragment>
)

export const PositionOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo position={item} isLink={false} />
      {item.code ? `, ${item.code}` : ""}
    </td>
    <td>
      <LinkTo organization={item.organization} isLink={false} />
    </td>
    <td>
      <LinkTo person={item.person} isLink={false} />
    </td>
  </React.Fragment>
)

export const PersonSimpleOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo person={item} isLink={false} />
    </td>
  </React.Fragment>
)

export const PersonDetailedOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo person={item} isLink={false} />
    </td>
    <td>
      <LinkTo position={item.position} isLink={false} />
      {item.position && item.position.code ? `, ${item.position.code}` : ""}
    </td>
    <td>
      <LinkTo
        whenUnspecified=""
        anetLocation={item.position && item.position.location}
        isLink={false}
      />
    </td>
    <td>
      {item.position && item.position.organization && (
        <LinkTo organization={item.position.organization} isLink={false} />
      )}
    </td>
  </React.Fragment>
)

export const TagOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo tag={item} isLink={false} />
    </td>
  </React.Fragment>
)

export const ApproverOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo person={item.person} isLink={false} />
    </td>
    <td>
      <LinkTo position={item} isLink={false} />
    </td>
  </React.Fragment>
)

export const ReportOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo report={item} isLink={false} />
    </td>
  </React.Fragment>
)

export const ReportDetailedOverlayRow = item => (
  <React.Fragment key={item.uuid}>
    <td>
      <LinkTo report={item} isLink={false} />
    </td>
    <td>
      <span>{item.author ? item.author.name : "Unknown"}</span>
    </td>
    <td>
      <span>
        {moment(item.updatedAt).format(
          Settings.dateFormats.forms.displayShort.withTime
        )}
      </span>
    </td>
  </React.Fragment>
)
