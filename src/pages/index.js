import React, { Component } from 'react'
import Helmet from 'react-helmet'
import GitHubButton from 'react-github-btn'
import { graphql, Link } from 'gatsby'
import Layout from '../layout'
import PostListing from '../components/PostListing'
import SEO from '../components/SEO'
import config from '../../data/SiteConfig'
import arbaz from '../../content/images/profile.jpeg'

export default class Index extends Component {
  render() {
    const { data } = this.props

    const latestPostEdges = data.latest.edges
	  const popularPostEdges = data.popular.edges

    return (
      <Layout>
        <Helmet title={`${config.siteTitle} – Full Stack Software Developer`} />
        <SEO />
        <div className="container">
          <div className="lead">
            <div className="elevator">
              <h1>Hey, I'm Arbaz</h1>
              <p>
	              I am a full stack software developer with keen interest in system design and distributed computing. I create <Link to="/projects">open source</Link> projects and also <Link to="/blog">write</Link> about software development.
              </p>
              <div className="social-buttons">
                <GitHubButton
                  href="https://github.com/arbazsiddiqui"
                  data-size="large"
                  data-show-count="true"
                >
                  arbazsiddiqui
                </GitHubButton>
              </div>
            </div>
	          <div className="newsletter-section">
		          <img src={arbaz} className="newsletter-avatar" alt="Arbaz" />
		          <div>
			          <h3>Email Newsletter</h3>
			          <p>
				          Get an update when something new comes out by signing up below!
			          </p>
			          <a className="button" href="https://arbazsiddiqui.substack.com" target="_blank" rel="noopener noreferrer">
				          Subscribe
			          </a>
		          </div>
	          </div>
          </div>
        </div>

        <div className="container front-page">
          <section className="section">
            <h2>
              Latest Articles
              <Link to="/blog" className="view-all">
                View all
              </Link>
            </h2>
            <PostListing simple postEdges={latestPostEdges} />
          </section>

	        <section className="section">
		        <h2>
			        Most Popular
			        <Link to="/categories/popular" className="view-all">
				        View all
			        </Link>
		        </h2>
		        <PostListing simple postEdges={popularPostEdges} />
	        </section>
        </div>
      </Layout>
    )
  }
}

export const pageQuery = graphql`
  query IndexQuery {
    latest: allMarkdownRemark(
      limit: 3
      sort: { fields: [fields___date], order: DESC }
      filter: { frontmatter: { template: { eq: "post" } } }
    ) {
      edges {
        node {
          fields {
            slug
            date
          }
          excerpt
          timeToRead
          frontmatter {
            title
            tags
            categories
            thumbnail {
              childImageSharp {
                fixed(width: 150, height: 150) {
                  ...GatsbyImageSharpFixed
                }
              }
            }
            date
            template
          }
        }
      }
    }
    popular: allMarkdownRemark(
      limit: 9
      sort: { fields: [fields___date], order: DESC }
      filter: { frontmatter: { categories: { eq: "Popular" } } }
    ) {
      edges {
        node {
          fields {
            slug
            date
          }
          excerpt
          timeToRead
          frontmatter {
            title
            tags
            categories
            thumbnail {
              childImageSharp {
                fixed(width: 150, height: 150) {
                  ...GatsbyImageSharpFixed
                }
              }
            }
            date
            template
          }
        }
      }
    }
  }
`
