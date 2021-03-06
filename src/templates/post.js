import React, { Component } from 'react'
import Helmet from 'react-helmet'
import { graphql } from 'gatsby'
import Img from 'gatsby-image'
import Layout from '../layout'
import PostTags from '../components/PostTags'
import SEO from '../components/SEO'
import UserInfo from '../components/UserInfo'
import config from '../../data/SiteConfig'
import { formatDate } from '../utils/global'
import {Link} from "@reach/router";

export default class PostTemplate extends Component {
  constructor(props) {
    super(props)

    this.state = {
      error: false,
    }
  }

  render() {
    const { slug } = this.props.pageContext;
  	let {prev, next} = this.props.pageContext;
  	let nextObj, prevObj;
  	if(next){
		  nextObj = {
			  nextSlug : next.fields.slug,
			  nextTitle : next.frontmatter.title
		  };
	  }
  	if(nextObj.nextSlug === '/me/'){
		  next = false
	  }
  	if(prev) {
		  prevObj = {
			  nextSlug : prev.fields.slug,
			  nextTitle : prev.frontmatter.title
		  };
	  }
    const postNode = this.props.data.markdownRemark;
	  const {timeToRead} = postNode;
    const post = postNode.frontmatter;
    let thumbnail

    if (!post.id) {
      post.id = slug
    }

    if (!post.category_id) {
      post.category_id = config.postDefaultCategoryID
    }

    if (post.thumbnail) {
      thumbnail = post.thumbnail.childImageSharp.fixed
    }

    const date = formatDate(post.date)
    const twitterShare = `http://twitter.com/share?text=${encodeURIComponent(post.title)}&url=${
      config.siteUrl
    }/${post.slug}/&via=${config.userTwitter}`;

    return (
      <Layout>
        <Helmet>
          <title>{`${post.title} – ${config.siteTitle}`}</title>
        </Helmet>
        <SEO postPath={slug} postNode={postNode} postSEO />
        <article className="single container">
          <header className={`single-header ${!thumbnail ? 'no-thumbnail' : ''}`}>
            {thumbnail && <Img fixed={post.thumbnail.childImageSharp.fixed} />}
            <div className="flex">
              <h1>{post.title}</h1>
              <div className="post-meta">
                <time className="date">{date}</time>• <span className="date">{timeToRead} min read</span>•<a
                  className="twitter-link"
                  href={twitterShare}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share
                </a>
              </div>
              <PostTags tags={post.tags} />
            </div>
          </header>

          <div className="post" dangerouslySetInnerHTML={{ __html: postNode.html }} />
          <div>
          </div>
        </article>
	      <UserInfo config={config} />
	      <ul className="more container">
		      <li>{prev && <Link to={prevObj.nextSlug}> ←{prevObj.nextTitle} </Link>}</li>
		      <li>{next && <Link to={nextObj.nextSlug}> {nextObj.nextTitle}→ </Link>}</li>
	      </ul>

      </Layout>
    )
  }
}

/* eslint no-undef: "off" */
export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      timeToRead
      excerpt
      frontmatter {
        title
        thumbnail {
          childImageSharp {
            fixed(width: 150, height: 150) {
              ...GatsbyImageSharpFixed
            }
          }
        }
        slug
        date
        categories
        tags
        template
      }
      fields {
        slug
        date
      }
    }
  }
`
