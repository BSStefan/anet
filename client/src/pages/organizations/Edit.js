import { PAGE_PROPS_NO_NAV } from "actions"
import API from "api"
import { gql } from "apollo-boost"
import {
  mapDispatchToProps,
  propTypes as pagePropTypes,
  useBoilerplate
} from "components/Page"
import RelatedObjectNotes, {
  GRAPHQL_NOTES_FIELDS
} from "components/RelatedObjectNotes"
import { Organization } from "models"
import React from "react"
import { connect } from "react-redux"
import OrganizationForm from "./Form"

const GQL_GET_ORGANIZATION = gql`
  query($uuid: String!) {
    organization(uuid: $uuid) {
      uuid
      shortName
      longName
      status
      identificationCode
      type
      parentOrg {
        uuid
        shortName
        longName
        identificationCode
      }
      approvalSteps {
        uuid
        name
        approvers {
          uuid
          name
          person {
            uuid
            name
            rank
            role
            avatar(size: 32)
          }
        }
      }
      tasks {
        uuid
        shortName
        longName
      }
      ${GRAPHQL_NOTES_FIELDS}
    }
  }
`

const OrganizationEdit = props => {
  const uuid = props.match.params.uuid
  const { loading, error, data } = API.useApiQuery(GQL_GET_ORGANIZATION, {
    uuid
  })
  const { done, result } = useBoilerplate({
    loading,
    error,
    modelName: "Organization",
    uuid,
    pageProps: PAGE_PROPS_NO_NAV,
    ...props
  })
  if (done) {
    return result
  }

  const organization = new Organization(data ? data.organization : {})

  return (
    <div>
      <RelatedObjectNotes
        notes={organization.notes}
        relatedObject={
          organization.uuid && {
            relatedObjectType: "organizations",
            relatedObjectUuid: organization.uuid
          }
        }
      />
      <OrganizationForm
        edit
        initialValues={organization}
        title={`Organization ${organization.shortName}`}
      />
    </div>
  )
}

OrganizationEdit.propTypes = {
  ...pagePropTypes
}

export default connect(
  null,
  mapDispatchToProps
)(OrganizationEdit)
