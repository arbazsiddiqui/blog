import React, {Component} from 'react'

export default class UserInfo extends Component {
	render() {
		return (
			<aside className="note">
				<div className="container note-container">
					<p>
						Hey I am Arbaz, I write about software development and life.
						Subscribe to get an update when something new comes out!
						No promotion, No spam.
					</p>
					<iframe width="400" height="120" src="https://arbazsiddiqui.substack.com/embed" frameBorder="0" scrolling="no"></iframe>

				</div>
			</aside>
		)
	}
}