import React, { Component } from 'react'
import { Link } from 'gatsby'
import netlify from '../../content/thumbnails/netlify.png'
import gatsby from '../../content/thumbnails/gatsby.png'
import github from '../../content/thumbnails/github.png'

export default class Footer extends Component {
  render() {
    return (
      <footer className="footer container">
        <div>
	        <a href="https://arbazsiddiqui.substack.com" target="_blank">Newsletter</a>
          <a href="https://www.arbazsiddiqui.me/rss.xml" target="_blank" rel="noopener noreferrer">
            RSS
          </a>
        </div>
        <div>
          <a href="https://github.com/arbazsiddiqui" title="Open-source on GitHub">
            <img
              src={github}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-img"
              alt="GitHub"
            />
          </a>
          <a href="https://www.netlify.com/" title="Hosted with ❤ on Netlify">
            <img
              src={netlify}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-img"
              alt="GitHub"
            />
          </a>
          <a href="https://www.gatsbyjs.org/" title="Built with Gatsby">
            <img
              src={gatsby}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-img"
              alt="GitHub"
            />
          </a>
        </div>
      </footer>
    )
  }
}
