import React, {Component, PropTypes} from 'react'
import {Form as BSForm, Button} from 'react-bootstrap'
import autobind from 'autobind-decorator'
import History from 'components/History'

import FormField from 'components/FormField'

export default class Form extends Component {
	static propTypes = Object.assign({}, BSForm.propTypes, {
		formFor: PropTypes.object,
		static: PropTypes.bool,
		submitText: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
		submitOnEnter: PropTypes.bool,
		submitDisabled: PropTypes.bool,
		deleteText: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
		onChange: PropTypes.func,
		onSubmit: PropTypes.func,
		onDelete: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
		bottomAccessory: PropTypes.node,
	})

	static defaultProps = {
		static: false,
		submitOnEnter: false,
		submitText: "Save",
		deleteText: "Delete",
	}

	static childContextTypes = {
		formFor: PropTypes.object,
		form: PropTypes.object,
	}

	getChildContext() {
		return {
			formFor: this.props.formFor,
			form: this,
		}
	}

	render() {
		let {children, submitText, submitOnEnter, submitDisabled, deleteText, onDelete, bottomAccessory, ...bsProps} = this.props
		bsProps = Object.without(bsProps, 'formFor', 'static', '')

		if (this.props.static) {
			bsProps.componentClass = 'div'
		}

		if (!submitOnEnter) {
			bsProps.onKeyDown = this.preventEnterKey
		}

		let showSubmit = bsProps.onSubmit && submitText !== false
		bsProps.onSubmit = this.onSubmit

		let showDelete = onDelete && deleteText !== false

		return (
			<BSForm {...bsProps} ref="container">
				{children}
				{!this.props.static && (showSubmit || showDelete) &&
					<div className="submit-buttons">
						{showSubmit &&
							<div>
								<Button onClick={this.onCancel}>Cancel</Button>
							</div>
						}

						{bottomAccessory}

						{showDelete &&
							<div>
								<Button bsStyle="warning" onClick={onDelete}>
									{deleteText}
								</Button>
							</div>
						}

						{showSubmit &&
							<div>
								<Button bsStyle="primary" type="submit" disabled={submitDisabled} id="formBottomSubmit">
									{submitText}
								</Button>
							</div>
						}
					</div>
				}
			</BSForm>
		)
	}

	preventEnterKey(event) {
		if (event.key === 'Enter' && event.target.nodeName !== 'TEXTAREA') {
			event.preventDefault()
			event.stopPropagation()
		}
	}

	@autobind
	onSubmit(event) {
		event.stopPropagation()
		event.preventDefault()

		this.props.onSubmit && this.props.onSubmit(event)
	}

	@autobind
	onCancel() {
		History.goBack({skipPageLeaveWarning: true})
	}
}

// just a little sugar to make importing and building forms easier
Form.Field = FormField
