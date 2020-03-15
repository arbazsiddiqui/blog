import React, { Component } from 'react'
import { Helmet } from 'react-helmet'
import { Link, graphql } from 'gatsby'
import kebabCase from 'lodash.kebabcase'
import Layout from '../layout'
import SEO from '../components/SEO'
import config from '../../data/SiteConfig'
import ProjectListing from "../components/ProjectListing";
import projects from "../../data/projects";

export default class ProjectsPage extends Component {
	render() {
		return (
			<Layout>
				<SEO />
				<Helmet title={`Projects – ${config.siteTitle}`} />
					<div className="container front-page">
						<section className="section">
							<h2>Open Source Projects</h2>
							<ProjectListing projects={projects} />
						</section>
					</div>
			</Layout>
		)
	}
}
