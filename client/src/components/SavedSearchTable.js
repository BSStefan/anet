import PropTypes from 'prop-types'
import React, { Component } from 'react'
import autobind from 'autobind-decorator'

import ReportCollection from 'components/ReportCollection'

import API from 'api'
import { SEARCH_OBJECT_TYPES } from 'actions'

export default class SavedSearchTable extends Component {
	static propTypes = {
		search: PropTypes.any.isRequired,
	}

	constructor(props) {
		super(props)

		this.state = {
			reports: []
		}

		if (props.search) {
			this.runSearch(props.search)
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.search && (prevProps.search.id !== this.props.search.id)) {
			this.runSearch(this.props.search)
		}
	}

	@autobind
	runSearch(search) {
		const objType = SEARCH_OBJECT_TYPES[search.objectType]
		if (objType !== SEARCH_OBJECT_TYPES.REPORTS) {
			// This table only shows reports
			this.setState({reports: {list: []}})
		}
		else {
			let query = JSON.parse(search.query)
			// Add default sorting (if not specified/saved in the query); see SEARCH_CONFIG in pages/Search.js
			query.sortBy = query.sortBy || 'ENGAGEMENT_DATE'
			query.sortOrder = query.sortOrder || 'DESC'
			let fields = ReportCollection.GQL_REPORT_FIELDS
			API.query(/*GraphQL */`
				reports: reportList(query: $query) {
					pageNum, pageSize, totalCount, list {
						${fields}
					}
				}
			`, {query}, '($query: ReportSearchQueryInput)').then(data =>
				this.setState({reports: data.reports})
			)
		}
	}

	render() {
		return <ReportCollection reports={this.state.reports.list} />
	}

}
